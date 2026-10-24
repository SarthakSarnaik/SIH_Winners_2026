import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.db.session import get_db
from app.models.models import (
    ReleaseRequest, ReleaseStageEvent, FDRRecord, Institution, User
)
from app.schemas.schemas import (
    ReleaseRequestCreate, ReleaseRequestUpdate, ReleaseStageActionRequest,
    ReleaseRequestResponse, ReleaseStageEventResponse
)
from app.security.auth import get_current_user, require_roles, verify_institution_access, require_not_read_only
from app.services.audit import log_audit
from app.notifications.service import NotificationService

router = APIRouter(prefix="/releases", tags=["Release and Refund"])


def _build_release_response(req: ReleaseRequest, db: Session) -> ReleaseRequestResponse:
    fdr = db.query(FDRRecord).filter(FDRRecord.id == req.fdr_id).first()
    inst = db.query(Institution).filter(Institution.id == req.institution_id).first()
    req_user = db.query(User).filter(User.id == req.requester_id).first() if req.requester_id else None
    rev_user = db.query(User).filter(User.id == req.reviewer_id).first() if req.reviewer_id else None

    stage_events = [
        ReleaseStageEventResponse(
            id=e.id,
            release_request_id=e.release_request_id,
            stage_name=e.stage_name,
            actor_id=e.actor_id,
            actor_email=e.actor_email,
            decision=e.decision,
            reason=e.reason,
            evidence_reference=e.evidence_reference,
            created_at=e.created_at
        )
        for e in (req.stage_events or [])
    ]

    return ReleaseRequestResponse(
        id=req.id,
        fdr_id=req.fdr_id,
        fdr_number=fdr.fdr_number if fdr else None,
        institution_id=req.institution_id,
        institution_name=inst.name if inst else None,
        amount=fdr.amount if fdr else None,
        requester_id=req.requester_id,
        requester_name=req_user.name if req_user else None,
        reason=req.reason,
        status=req.status,
        reviewer_id=req.reviewer_id,
        reviewer_name=rev_user.name if rev_user else None,
        remarks=req.remarks,
        # Clearance A
        clearance_a_actor_id=req.clearance_a_actor_id,
        clearance_a_timestamp=req.clearance_a_timestamp,
        clearance_a_remarks=req.clearance_a_remarks,
        clearance_a_decision=req.clearance_a_decision,
        # Clearance B
        clearance_b_actor_id=req.clearance_b_actor_id,
        clearance_b_timestamp=req.clearance_b_timestamp,
        clearance_b_remarks=req.clearance_b_remarks,
        clearance_b_decision=req.clearance_b_decision,
        # Final Auth
        final_auth_actor_id=req.final_auth_actor_id,
        final_auth_timestamp=req.final_auth_timestamp,
        final_auth_remarks=req.final_auth_remarks,
        final_auth_decision=req.final_auth_decision,
        # NOC
        noc_issued_by_id=req.noc_issued_by_id,
        noc_issued_timestamp=req.noc_issued_timestamp,
        noc_reference=req.noc_reference,
        # Discharge
        discharge_evidence_submitted_by_id=req.discharge_evidence_submitted_by_id,
        discharge_evidence_timestamp=req.discharge_evidence_timestamp,
        discharge_evidence_reference=req.discharge_evidence_reference,
        discharge_reviewed_by_id=req.discharge_reviewed_by_id,
        discharge_reviewed_timestamp=req.discharge_reviewed_timestamp,
        discharge_review_outcome=req.discharge_review_outcome,
        completed_at=req.completed_at,
        created_at=req.created_at,
        updated_at=req.updated_at,
        stage_events=stage_events
    )


def _record_stage_event(
    db: Session,
    release_request: ReleaseRequest,
    stage_name: str,
    actor: User,
    decision: str,
    reason: Optional[str] = None,
    evidence_reference: Optional[str] = None
) -> ReleaseStageEvent:
    """Append-only stage event record — never updated, only inserted."""
    evt = ReleaseStageEvent(
        release_request_id=release_request.id,
        stage_name=stage_name,
        actor_id=actor.id,
        actor_email=actor.email,
        decision=decision,
        reason=reason,
        evidence_reference=evidence_reference,
        created_at=datetime.datetime.utcnow()
    )
    db.add(evt)
    return evt


@router.get("", response_model=List[ReleaseRequestResponse])
def get_release_requests(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(ReleaseRequest).join(Institution, ReleaseRequest.institution_id == Institution.id)

    if current_user.role == "COLLEGE_USER":
        if not current_user.institution_id:
            return []
        query = query.filter(ReleaseRequest.institution_id == current_user.institution_id)

    requests = query.order_by(desc(ReleaseRequest.created_at)).all()
    return [_build_release_response(r, db) for r in requests]


@router.get("/{id}", response_model=ReleaseRequestResponse)
def get_release_request(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    req = db.query(ReleaseRequest).filter(ReleaseRequest.id == id).first()
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Release request not found")

    # Institution isolation
    if current_user.role == "COLLEGE_USER":
        verify_institution_access(current_user, req.institution_id)

    return _build_release_response(req, db)


@router.post("", response_model=ReleaseRequestResponse)
def create_release_request(
    data: ReleaseRequestCreate,
    current_user: User = Depends(require_not_read_only()),
    db: Session = Depends(get_db)
):
    fdr = db.query(FDRRecord).filter(FDRRecord.id == data.fdr_id).first()
    if not fdr:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="FDR record not found")

    verify_institution_access(current_user, fdr.institution_id)

    # Check if there is already an active release request for this FDR
    existing = db.query(ReleaseRequest).filter(
        ReleaseRequest.fdr_id == fdr.id,
        ReleaseRequest.status.in_(["SUBMITTED", "UNDER_REVIEW", "CLEARANCE_A_GRANTED",
                                   "CLEARANCE_B_GRANTED", "FINAL_AUTHORIZED", "NOC_ISSUED",
                                   "DISCHARGE_EVIDENCE_SUBMITTED", "DISCHARGE_REVIEWED",
                                   "CLARIFICATION_REQUIRED"])
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An active release request is already pending review for this FDR record."
        )

    now = datetime.datetime.utcnow()
    req = ReleaseRequest(
        fdr_id=fdr.id,
        institution_id=fdr.institution_id,
        requester_id=current_user.id,
        reason=data.reason,
        status="SUBMITTED",
        created_at=now,
        updated_at=now
    )
    db.add(req)
    db.flush()

    _record_stage_event(db, req, "SUBMITTED", current_user, "SUBMITTED", reason=data.reason)

    db.commit()
    db.refresh(req)

    log_audit(
        db,
        action="REQUEST_FDR_RELEASE",
        entity_type="ReleaseRequest",
        entity_id=str(req.id),
        actor=current_user,
        metadata_json={"fdr_id": fdr.id, "fdr_number": fdr.fdr_number, "reason": data.reason}
    )

    inst_name = fdr.institution.name if fdr.institution else f"Institution #{fdr.institution_id}"
    NotificationService.notify_officers(
        db=db,
        subject=f"Security Deposit Release Request: FDR {fdr.fdr_number}",
        message=f"{inst_name} has requested administrative release of FDR {fdr.fdr_number} (₹{fdr.amount:,.2f}). Reason: {data.reason}",
        notification_type="RELEASE_UPDATE",
        fdr_id=fdr.id
    )

    return _build_release_response(req, db)


@router.post("/{id}/clearance-a", response_model=ReleaseRequestResponse)
@router.post("/{id}/stages/clearance-a", response_model=ReleaseRequestResponse)
def record_clearance_a(
    id: int,
    data: ReleaseStageActionRequest,
    current_user: User = Depends(require_roles(["AICTE_OFFICER", "WORKFLOW_APPROVER", "ADMIN"])),
    db: Session = Depends(get_db)
):
    """
    Clearance A: First independent officer review.
    Must be recorded before Clearance B (actor separation enforced at Clearance B).
    Requires explicit reason/observations.
    """
    req = db.query(ReleaseRequest).filter(ReleaseRequest.id == id).first()
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Release request not found")

    if req.status not in ["SUBMITTED", "UNDER_REVIEW", "CLARIFICATION_REQUIRED"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Clearance A cannot be applied to a request in status '{req.status}'. Expected SUBMITTED, UNDER_REVIEW, or CLARIFICATION_REQUIRED."
        )

    allowed_decisions = ["GRANTED", "REJECTED", "CLARIFICATION_REQUIRED"]
    if data.decision not in allowed_decisions:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"Invalid decision '{data.decision}'. Allowed: {allowed_decisions}")

    if not data.reason or len(data.reason.strip()) < 5:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail="Reason/observations are required for Clearance A (minimum 5 characters).")

    now = datetime.datetime.utcnow()
    req.clearance_a_actor_id = current_user.id
    req.clearance_a_timestamp = now
    req.clearance_a_remarks = data.reason
    req.clearance_a_decision = data.decision
    req.reviewer_id = current_user.id
    req.remarks = data.reason
    req.updated_at = now

    if data.decision == "GRANTED":
        req.status = "CLEARANCE_A_GRANTED"
    elif data.decision == "REJECTED":
        req.status = "REJECTED"
    else:
        req.status = "CLARIFICATION_REQUIRED"

    _record_stage_event(db, req, "CLEARANCE_A", current_user, data.decision,
                        reason=data.reason, evidence_reference=data.evidence_reference)
    db.commit()
    db.refresh(req)

    log_audit(db, action=f"RELEASE_CLEARANCE_A_{data.decision}", entity_type="ReleaseRequest",
              entity_id=str(req.id), actor=current_user,
              metadata_json={"decision": data.decision, "reason": data.reason})

    # Notify requester
    if req.requester_id:
        NotificationService.send_notification(
            db=db, recipient_id=req.requester_id,
            subject=f"Release Request Clearance A: {data.decision}",
            message=f"Clearance A for your release request (ID {req.id}) was recorded as {data.decision}. Remarks: {data.reason}",
            notification_type="RELEASE_UPDATE", fdr_id=req.fdr_id
        )

    return _build_release_response(req, db)


@router.post("/{id}/clearance-b", response_model=ReleaseRequestResponse)
@router.post("/{id}/stages/clearance-b", response_model=ReleaseRequestResponse)
def record_clearance_b(
    id: int,
    data: ReleaseStageActionRequest,
    current_user: User = Depends(require_roles(["AICTE_OFFICER", "WORKFLOW_APPROVER", "ADMIN"])),
    db: Session = Depends(get_db)
):
    """
    Clearance B: Second independent officer review.
    ENFORCED ACTOR SEPARATION: The actor must be a different user than Clearance A.
    """
    req = db.query(ReleaseRequest).filter(ReleaseRequest.id == id).first()
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Release request not found")

    if req.status != "CLEARANCE_A_GRANTED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Clearance B requires status CLEARANCE_A_GRANTED. Current status: '{req.status}'."
        )

    # CRITICAL: Actor separation enforcement
    if req.clearance_a_actor_id and req.clearance_a_actor_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Actor Separation Violation: The same officer cannot record both Clearance A and Clearance B. A different authorized officer must perform Clearance B."
        )

    allowed_decisions = ["GRANTED", "REJECTED"]
    if data.decision not in allowed_decisions:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"Invalid decision '{data.decision}'. Allowed: {allowed_decisions}")

    if not data.reason or len(data.reason.strip()) < 5:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail="Reason is required for Clearance B (minimum 5 characters).")

    now = datetime.datetime.utcnow()
    req.clearance_b_actor_id = current_user.id
    req.clearance_b_timestamp = now
    req.clearance_b_remarks = data.reason
    req.clearance_b_decision = data.decision
    req.reviewer_id = current_user.id
    req.remarks = data.reason
    req.updated_at = now

    if data.decision == "GRANTED":
        req.status = "CLEARANCE_B_GRANTED"
    else:
        req.status = "REJECTED"

    _record_stage_event(db, req, "CLEARANCE_B", current_user, data.decision,
                        reason=data.reason, evidence_reference=data.evidence_reference)
    db.commit()
    db.refresh(req)

    log_audit(db, action=f"RELEASE_CLEARANCE_B_{data.decision}", entity_type="ReleaseRequest",
              entity_id=str(req.id), actor=current_user,
              metadata_json={"decision": data.decision, "reason": data.reason})

    if req.requester_id:
        NotificationService.send_notification(
            db=db, recipient_id=req.requester_id,
            subject=f"Release Request Clearance B: {data.decision}",
            message=f"Clearance B for your release request (ID {req.id}) was recorded as {data.decision}. Remarks: {data.reason}",
            notification_type="RELEASE_UPDATE", fdr_id=req.fdr_id
        )

    return _build_release_response(req, db)


@router.post("/{id}/final-authorization", response_model=ReleaseRequestResponse)
@router.post("/{id}/stages/final-authorization", response_model=ReleaseRequestResponse)
def record_final_authorization(
    id: int,
    data: ReleaseStageActionRequest,
    current_user: User = Depends(require_roles(["WORKFLOW_APPROVER", "ADMIN"])),
    db: Session = Depends(get_db)
):
    """
    Final Authorization: Senior approval after both clearances.
    Only WORKFLOW_APPROVER or ADMIN can grant final authorization.
    """
    req = db.query(ReleaseRequest).filter(ReleaseRequest.id == id).first()
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Release request not found")

    if req.status != "CLEARANCE_B_GRANTED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Final Authorization requires status CLEARANCE_B_GRANTED. Current status: '{req.status}'."
        )

    allowed_decisions = ["AUTHORIZED", "REJECTED"]
    if data.decision not in allowed_decisions:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"Invalid decision. Allowed: {allowed_decisions}")

    if not data.reason or len(data.reason.strip()) < 5:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail="Reason is required for Final Authorization.")

    now = datetime.datetime.utcnow()
    req.final_auth_actor_id = current_user.id
    req.final_auth_timestamp = now
    req.final_auth_remarks = data.reason
    req.final_auth_decision = data.decision
    req.reviewer_id = current_user.id
    req.remarks = data.reason
    req.updated_at = now

    if data.decision == "AUTHORIZED":
        req.status = "FINAL_AUTHORIZED"
        # Mark FDR as release-authorized
        fdr = db.query(FDRRecord).filter(FDRRecord.id == req.fdr_id).first()
        if fdr:
            fdr.administrative_status = "RELEASE_AUTHORIZED"
            fdr.scrutiny_remarks = f"Final Authorization granted by {current_user.name}: {data.reason}"
    else:
        req.status = "REJECTED"

    _record_stage_event(db, req, "FINAL_AUTH", current_user, data.decision,
                        reason=data.reason, evidence_reference=data.evidence_reference)
    db.commit()
    db.refresh(req)

    log_audit(db, action=f"RELEASE_FINAL_AUTH_{data.decision}", entity_type="ReleaseRequest",
              entity_id=str(req.id), actor=current_user,
              metadata_json={"decision": data.decision, "reason": data.reason})

    if req.requester_id:
        fdr = db.query(FDRRecord).filter(FDRRecord.id == req.fdr_id).first()
        NotificationService.send_notification(
            db=db, recipient_id=req.requester_id,
            subject=f"Release Request Final Authorization: {data.decision}",
            message=f"Final authorization for your release request (FDR: {fdr.fdr_number if fdr else req.fdr_id}) was {data.decision}. Remarks: {data.reason}",
            notification_type="RELEASE_UPDATE", fdr_id=req.fdr_id
        )

    return _build_release_response(req, db)


@router.post("/{id}/issue-noc", response_model=ReleaseRequestResponse)
@router.post("/{id}/stages/issue-noc", response_model=ReleaseRequestResponse)
def issue_noc(
    id: int,
    data: ReleaseStageActionRequest,
    current_user: User = Depends(require_roles(["AICTE_OFFICER", "WORKFLOW_APPROVER", "ADMIN"])),
    db: Session = Depends(get_db)
):
    """
    NOC Issuance: Distinct step after Final Authorization.
    NOC is NOT the same as discharge evidence or portal completion.
    """
    req = db.query(ReleaseRequest).filter(ReleaseRequest.id == id).first()
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Release request not found")

    if req.status != "FINAL_AUTHORIZED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"NOC can only be issued after Final Authorization. Current status: '{req.status}'."
        )

    if not data.evidence_reference or len(data.evidence_reference.strip()) < 3:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail="NOC reference number/document reference is required.")

    now = datetime.datetime.utcnow()
    req.noc_issued_by_id = current_user.id
    req.noc_issued_timestamp = now
    req.noc_reference = data.evidence_reference
    req.status = "NOC_ISSUED"
    req.reviewer_id = current_user.id
    req.updated_at = now

    _record_stage_event(db, req, "NOC_ISSUED", current_user, "ISSUED",
                        reason=data.reason, evidence_reference=data.evidence_reference)
    db.commit()
    db.refresh(req)

    log_audit(db, action="RELEASE_NOC_ISSUED", entity_type="ReleaseRequest",
              entity_id=str(req.id), actor=current_user,
              metadata_json={"noc_reference": data.evidence_reference})

    if req.requester_id:
        NotificationService.send_notification(
            db=db, recipient_id=req.requester_id,
            subject="NOC Issued for Release Request",
            message=f"No Objection Certificate (NOC) has been issued for your release request (ID {req.id}). Reference: {data.evidence_reference}. Please submit discharge evidence.",
            notification_type="RELEASE_UPDATE", fdr_id=req.fdr_id
        )

    return _build_release_response(req, db)


@router.post("/{id}/submit-discharge-evidence", response_model=ReleaseRequestResponse)
@router.post("/{id}/discharge-evidence", response_model=ReleaseRequestResponse)
@router.post("/{id}/stages/discharge-evidence", response_model=ReleaseRequestResponse)
def submit_discharge_evidence(
    id: int,
    data: ReleaseStageActionRequest,
    current_user: User = Depends(require_not_read_only()),
    db: Session = Depends(get_db)
):
    """
    Discharge Evidence Submission: Institution submits evidence after NOC.
    Discharge evidence ≠ NOC ≠ portal completion.
    No actual funds transfer is represented.
    """
    req = db.query(ReleaseRequest).filter(ReleaseRequest.id == id).first()
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Release request not found")

    if req.status != "NOC_ISSUED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Discharge evidence can only be submitted after NOC is issued. Current status: '{req.status}'."
        )

    # Institution users must own the FDR
    if current_user.role == "COLLEGE_USER":
        verify_institution_access(current_user, req.institution_id)

    if not data.evidence_reference or len(data.evidence_reference.strip()) < 3:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail="Discharge evidence reference/document reference is required.")

    now = datetime.datetime.utcnow()
    req.discharge_evidence_submitted_by_id = current_user.id
    req.discharge_evidence_timestamp = now
    req.discharge_evidence_reference = data.evidence_reference
    req.status = "DISCHARGE_EVIDENCE_SUBMITTED"
    req.updated_at = now

    _record_stage_event(db, req, "DISCHARGE_SUBMITTED", current_user, "SUBMITTED",
                        reason=data.reason, evidence_reference=data.evidence_reference)
    db.commit()
    db.refresh(req)

    log_audit(db, action="RELEASE_DISCHARGE_EVIDENCE_SUBMITTED", entity_type="ReleaseRequest",
              entity_id=str(req.id), actor=current_user,
              metadata_json={"evidence_reference": data.evidence_reference})

    NotificationService.notify_officers(
        db=db,
        subject=f"Discharge Evidence Submitted: Release Request #{req.id}",
        message=f"Discharge evidence for release request #{req.id} has been submitted. Reference: {data.evidence_reference}. Please review.",
        notification_type="RELEASE_UPDATE",
        fdr_id=req.fdr_id
    )

    return _build_release_response(req, db)


@router.post("/{id}/review-discharge", response_model=ReleaseRequestResponse)
@router.post("/{id}/stages/review-discharge", response_model=ReleaseRequestResponse)
def review_discharge_evidence(
    id: int,
    data: ReleaseStageActionRequest,
    current_user: User = Depends(require_roles(["AICTE_OFFICER", "WORKFLOW_APPROVER", "ADMIN"])),
    db: Session = Depends(get_db)
):
    """
    Discharge Evidence Review: Officer reviews submitted discharge evidence.
    ACCEPTED → COMPLETED (portal workflow done, no funds transfer implied).
    REJECTED → back to DISCHARGE_EVIDENCE_SUBMITTED state for resubmission.
    """
    req = db.query(ReleaseRequest).filter(ReleaseRequest.id == id).first()
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Release request not found")

    if req.status != "DISCHARGE_EVIDENCE_SUBMITTED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Discharge review requires status DISCHARGE_EVIDENCE_SUBMITTED. Current: '{req.status}'."
        )

    allowed_outcomes = ["ACCEPTED", "REJECTED"]
    if data.decision not in allowed_outcomes:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"Invalid outcome. Allowed: {allowed_outcomes}")

    if not data.reason or len(data.reason.strip()) < 5:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail="Reason is required for discharge review.")

    now = datetime.datetime.utcnow()
    req.discharge_reviewed_by_id = current_user.id
    req.discharge_reviewed_timestamp = now
    req.discharge_review_outcome = data.decision
    req.reviewer_id = current_user.id
    req.remarks = data.reason
    req.updated_at = now

    if data.decision == "ACCEPTED":
        req.status = "COMPLETED"
        req.completed_at = now
        # Mark FDR release as completed
        fdr = db.query(FDRRecord).filter(FDRRecord.id == req.fdr_id).first()
        if fdr:
            fdr.administrative_status = "RELEASE_COMPLETED"
            fdr.scrutiny_remarks = (
                "Release workflow completed. Discharge evidence reviewed and accepted. "
                "NOTE: This is a prototype record. No actual funds transfer or bank confirmation is represented."
            )
    else:
        req.status = "NOC_ISSUED"  # Revert to NOC_ISSUED so institution can resubmit

    _record_stage_event(db, req, "DISCHARGE_REVIEWED", current_user, data.decision,
                        reason=data.reason, evidence_reference=data.evidence_reference)

    if data.decision == "ACCEPTED":
        _record_stage_event(db, req, "COMPLETED", current_user, "COMPLETED",
                            reason="Workflow completed. Portal closure confirmed. No funds transfer implied.",
                            evidence_reference=data.evidence_reference)

    db.commit()
    db.refresh(req)

    log_audit(db, action=f"RELEASE_DISCHARGE_REVIEWED_{data.decision}", entity_type="ReleaseRequest",
              entity_id=str(req.id), actor=current_user,
              metadata_json={"outcome": data.decision, "reason": data.reason})

    if req.requester_id:
        fdr = db.query(FDRRecord).filter(FDRRecord.id == req.fdr_id).first()
        NotificationService.send_notification(
            db=db, recipient_id=req.requester_id,
            subject=f"Discharge Evidence Review: {data.decision}",
            message=(
                f"Discharge evidence for release request (FDR: {fdr.fdr_number if fdr else req.fdr_id}) "
                f"was reviewed as {data.decision}. Remarks: {data.reason}. "
                + ("Portal workflow is now COMPLETED. No funds transfer is represented by this record."
                   if data.decision == "ACCEPTED" else "Please resubmit corrected discharge evidence.")
            ),
            notification_type="RELEASE_UPDATE", fdr_id=req.fdr_id
        )

    return _build_release_response(req, db)

@router.post("/{id}/complete", response_model=ReleaseRequestResponse)
@router.post("/{id}/stages/complete", response_model=ReleaseRequestResponse)
def complete_release_workflow(
    id: int,
    data: ReleaseStageActionRequest,
    current_user: User = Depends(require_roles(["AICTE_OFFICER", "WORKFLOW_APPROVER", "ADMIN"])),
    db: Session = Depends(get_db)
):
    """
    Final Release Completion: Closes the release workflow and updates FDR status.
    Statutory: No actual electronic funds transfer is represented.
    """
    req = db.query(ReleaseRequest).filter(ReleaseRequest.id == id).first()
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Release request not found")

    if req.status not in ["COMPLETED", "DISCHARGE_EVIDENCE_SUBMITTED", "DISCHARGE_VERIFIED"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Workflow completion requires discharge evidence. Current: '{req.status}'."
        )

    now = datetime.datetime.utcnow()
    req.status = "COMPLETED"
    req.completed_at = now
    req.reviewer_id = current_user.id
    req.remarks = data.reason
    req.updated_at = now

    fdr = db.query(FDRRecord).filter(FDRRecord.id == req.fdr_id).first()
    if fdr:
        fdr.administrative_status = "RELEASE_COMPLETED"
        fdr.scrutiny_remarks = f"Release workflow completed: {data.reason}"

    _record_stage_event(db, req, "WORKFLOW_COMPLETE", current_user, "COMPLETED",
                        reason=data.reason, evidence_reference=data.evidence_reference)
    db.commit()
    db.refresh(req)

    log_audit(db, action="RELEASE_WORKFLOW_COMPLETE", entity_type="ReleaseRequest",
              entity_id=str(req.id), actor=current_user,
              metadata_json={"reason": data.reason})

    return _build_release_response(req, db)


@router.get("/{id}/stages", response_model=List[ReleaseStageEventResponse])
def get_release_stages(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns the immutable audit log of recorded stage events for this release request.
    """
    req = db.query(ReleaseRequest).filter(ReleaseRequest.id == id).first()
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Release request not found")

    if current_user.role == "COLLEGE_USER":
        verify_institution_access(current_user, req.institution_id)

    events = db.query(ReleaseStageEvent).filter(ReleaseStageEvent.release_request_id == id).order_by(ReleaseStageEvent.created_at.asc()).all()
    return [
        ReleaseStageEventResponse(
            id=e.id,
            release_request_id=e.release_request_id,
            stage_name=e.stage_name,
            actor_id=e.actor_id,
            actor_email=e.actor_email,
            decision=e.decision,
            reason=e.reason,
            evidence_reference=e.evidence_reference,
            created_at=e.created_at
        )
        for e in events
    ]



# ─── Legacy compatibility endpoint (kept for older frontend paths) ─────────────
@router.put("/{id}/review", response_model=ReleaseRequestResponse)
def review_release_request_legacy(
    id: int,
    data: "ReleaseRequestUpdate",
    current_user: User = Depends(require_roles(["AICTE_OFFICER", "ADMIN"])),
    db: Session = Depends(get_db)
):
    """
    LEGACY: Simple single-step review kept for backward compatibility with existing tests and frontend.
    For new integrations use the staged endpoints (clearance-a, clearance-b, final-authorization, etc.)
    """
    req = db.query(ReleaseRequest).filter(ReleaseRequest.id == id).first()
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Release request not found")

    valid_statuses = ["UNDER_REVIEW", "CLARIFICATION_REQUIRED", "APPROVED", "REJECTED", "COMPLETED"]
    if data.status not in valid_statuses:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"Invalid status. Allowed: {valid_statuses}")

    req.status = data.status
    req.reviewer_id = current_user.id
    req.remarks = data.remarks
    req.updated_at = datetime.datetime.utcnow()

    fdr = db.query(FDRRecord).filter(FDRRecord.id == req.fdr_id).first()
    if fdr and data.status == "APPROVED":
        fdr.administrative_status = "RELEASE_APPROVED"
        fdr.scrutiny_remarks = f"Release Approved by AICTE: {data.remarks}"

    db.commit()
    db.refresh(req)

    log_audit(db, action=f"REVIEW_RELEASE_{data.status}", entity_type="ReleaseRequest",
              entity_id=str(req.id), actor=current_user,
              metadata_json={"new_status": data.status, "remarks": data.remarks})

    if req.requester_id:
        NotificationService.send_notification(
            db=db, recipient_id=req.requester_id,
            subject=f"Release Request Status Update: {data.status}",
            message=f"Your release request for FDR {fdr.fdr_number if fdr else id} was marked {data.status}. Remarks: {data.remarks}",
            notification_type="RELEASE_UPDATE", fdr_id=req.fdr_id
        )

    return _build_release_response(req, db)
