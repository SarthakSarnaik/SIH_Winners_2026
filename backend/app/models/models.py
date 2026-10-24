import datetime
from sqlalchemy import (
    Column, Integer, String, Float, DateTime, ForeignKey, Boolean, Text, JSON
)
from sqlalchemy.orm import relationship
from app.db.session import Base

# Valid role constants
ROLE_COLLEGE_USER = "COLLEGE_USER"
ROLE_AICTE_OFFICER = "AICTE_OFFICER"
ROLE_WORKFLOW_APPROVER = "WORKFLOW_APPROVER"
ROLE_ADMIN = "ADMIN"
ROLE_AUDITOR = "AUDITOR"  # Read-only access

# All roles that can write/act
WRITE_ROLES = [ROLE_COLLEGE_USER, ROLE_AICTE_OFFICER, ROLE_WORKFLOW_APPROVER, ROLE_ADMIN]
# Read-only roles
READ_ONLY_ROLES = [ROLE_AUDITOR]

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False)  # COLLEGE_USER, AICTE_OFFICER, WORKFLOW_APPROVER, ADMIN, AUDITOR
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="SET NULL"), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationships
    institution = relationship("Institution", back_populates="users")
    notifications = relationship("Notification", back_populates="recipient")


class Institution(Base):
    __tablename__ = "institutions"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    aicte_code = Column(String(100), unique=True, index=True, nullable=False)
    institution_type = Column(String(100), default="Technical Institute")  # Engineering, Management, Pharmacy, Polytechnic
    address = Column(String(500), nullable=False)
    state = Column(String(100), nullable=False)
    contact_person = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False)
    phone = Column(String(50), nullable=False)
    status = Column(String(50), default="ACTIVE")  # ACTIVE, PENDING_VERIFICATION, SUSPENDED
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationships
    users = relationship("User", back_populates="institution")
    fdrs = relationship("FDRRecord", back_populates="institution")
    release_requests = relationship("ReleaseRequest", back_populates="institution")


class FDRRecord(Base):
    __tablename__ = "fdr_records"

    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    fdr_number = Column(String(100), index=True, nullable=False)
    bank_name = Column(String(255), nullable=False)
    branch_name = Column(String(255), nullable=False)
    amount = Column(Float, nullable=False)
    currency = Column(String(10), default="INR")
    issue_date = Column(DateTime, nullable=False)
    maturity_date = Column(DateTime, nullable=False, index=True)
    deposit_type = Column(String(100), default="Security Deposit")  # Security Deposit, AICTE Approval, New Course, Corpus Fund
    
    # Administrative Workflow Status
    # DRAFT, SUBMITTED, UNDER_REVIEW, VERIFIED, CLARIFICATION_REQUIRED, DISCREPANCY_DETECTED, REJECTED
    administrative_status = Column(String(50), default="SUBMITTED", index=True)
    
    # Date-derived Maturity Status
    # ACTIVE, APPROACHING_MATURITY, MATURED
    maturity_status = Column(String(50), default="ACTIVE", index=True)
    
    # Verification Status: PENDING, VERIFIED, REJECTED, CLARIFICATION_NEEDED
    verification_status = Column(String(50), default="PENDING")
    scrutiny_remarks = Column(Text, nullable=True)
    
    # Renewal hierarchy: if this is a renewal/replacement of an older FDR
    original_fdr_id = Column(Integer, ForeignKey("fdr_records.id", ondelete="SET NULL"), nullable=True)
    
    submission_date = Column(DateTime, default=datetime.datetime.utcnow)
    submitted_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationships
    institution = relationship("Institution", back_populates="fdrs")
    documents = relationship("Document", back_populates="fdr", cascade="all, delete-orphan")
    verifications = relationship("VerificationRecord", back_populates="fdr", cascade="all, delete-orphan")
    release_requests = relationship("ReleaseRequest", back_populates="fdr")
    renewals_as_original = relationship("RenewalRecord", foreign_keys="RenewalRecord.original_fdr_id", back_populates="original_fdr")
    renewals_as_replacement = relationship("RenewalRecord", foreign_keys="RenewalRecord.replacement_fdr_id", back_populates="replacement_fdr")


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    fdr_id = Column(Integer, ForeignKey("fdr_records.id", ondelete="CASCADE"), nullable=False, index=True)
    storage_provider = Column(String(50), default="LOCAL")  # LOCAL or S3
    storage_key = Column(String(500), nullable=False)
    original_filename = Column(String(255), nullable=False)
    safe_filename = Column(String(255), nullable=False)
    file_type = Column(String(100), nullable=False)  # application/pdf, image/png, etc.
    file_size = Column(Integer, nullable=False)  # bytes
    upload_metadata = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    fdr = relationship("FDRRecord", back_populates="documents")


class VerificationRecord(Base):
    __tablename__ = "verification_records"

    id = Column(Integer, primary_key=True, index=True)
    fdr_id = Column(Integer, ForeignKey("fdr_records.id", ondelete="CASCADE"), nullable=False, index=True)
    reviewer_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    verification_method = Column(String(100), default="MANUAL_SCRUTINY")  # MANUAL_SCRUTINY, DEMO_BANK_SIMULATION
    outcome = Column(String(50), nullable=False)  # VERIFIED, CLARIFICATION_REQUIRED, DISCREPANCY_DETECTED, REJECTED
    observations = Column(Text, nullable=False)
    supporting_reference = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    fdr = relationship("FDRRecord", back_populates="verifications")
    reviewer = relationship("User")


class RenewalRecord(Base):
    __tablename__ = "renewal_records"

    id = Column(Integer, primary_key=True, index=True)
    original_fdr_id = Column(Integer, ForeignKey("fdr_records.id", ondelete="CASCADE"), nullable=False)
    replacement_fdr_id = Column(Integer, ForeignKey("fdr_records.id", ondelete="CASCADE"), nullable=False)
    submission_date = Column(DateTime, default=datetime.datetime.utcnow)
    status = Column(String(50), default="PENDING_REVIEW")  # PENDING_REVIEW, APPROVED, REJECTED
    remarks = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    original_fdr = relationship("FDRRecord", foreign_keys=[original_fdr_id], back_populates="renewals_as_original")
    replacement_fdr = relationship("FDRRecord", foreign_keys=[replacement_fdr_id], back_populates="renewals_as_replacement")


class ReleaseRequest(Base):
    __tablename__ = "release_requests"

    id = Column(Integer, primary_key=True, index=True)
    fdr_id = Column(Integer, ForeignKey("fdr_records.id", ondelete="CASCADE"), nullable=False, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    requester_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    reason = Column(Text, nullable=False)
    # Staged workflow status:
    # SUBMITTED → UNDER_REVIEW → CLEARANCE_A_GRANTED / CLARIFICATION_REQUIRED / REJECTED
    # CLEARANCE_A_GRANTED → CLEARANCE_B_GRANTED / REJECTED
    # CLEARANCE_B_GRANTED → FINAL_AUTHORIZED / REJECTED
    # FINAL_AUTHORIZED → NOC_ISSUED
    # NOC_ISSUED → DISCHARGE_EVIDENCE_SUBMITTED
    # DISCHARGE_EVIDENCE_SUBMITTED → DISCHARGE_REVIEWED
    # DISCHARGE_REVIEWED → COMPLETED / REJECTED
    status = Column(String(80), default="SUBMITTED", index=True)
    reviewer_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)  # last reviewer
    remarks = Column(Text, nullable=True)  # last reviewer remarks

    # --- Clearance A Stage ---
    clearance_a_actor_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    clearance_a_timestamp = Column(DateTime, nullable=True)
    clearance_a_remarks = Column(Text, nullable=True)
    clearance_a_decision = Column(String(50), nullable=True)  # GRANTED, REJECTED, CLARIFICATION_REQUIRED

    # --- Clearance B Stage (must be different actor from Clearance A) ---
    clearance_b_actor_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    clearance_b_timestamp = Column(DateTime, nullable=True)
    clearance_b_remarks = Column(Text, nullable=True)
    clearance_b_decision = Column(String(50), nullable=True)  # GRANTED, REJECTED

    # --- Final Authorization Stage ---
    final_auth_actor_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    final_auth_timestamp = Column(DateTime, nullable=True)
    final_auth_remarks = Column(Text, nullable=True)
    final_auth_decision = Column(String(50), nullable=True)  # AUTHORIZED, REJECTED

    # --- NOC Issuance ---
    noc_issued_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    noc_issued_timestamp = Column(DateTime, nullable=True)
    noc_reference = Column(String(255), nullable=True)

    # --- Discharge Evidence ---
    discharge_evidence_submitted_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    discharge_evidence_timestamp = Column(DateTime, nullable=True)
    discharge_evidence_reference = Column(String(255), nullable=True)
    discharge_reviewed_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    discharge_reviewed_timestamp = Column(DateTime, nullable=True)
    discharge_review_outcome = Column(String(50), nullable=True)  # ACCEPTED, REJECTED

    # --- Portal Completion ---
    completed_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationships
    fdr = relationship("FDRRecord", back_populates="release_requests")
    institution = relationship("Institution", back_populates="release_requests")
    requester = relationship("User", foreign_keys=[requester_id])
    reviewer = relationship("User", foreign_keys=[reviewer_id])
    clearance_a_actor = relationship("User", foreign_keys=[clearance_a_actor_id])
    clearance_b_actor = relationship("User", foreign_keys=[clearance_b_actor_id])
    final_auth_actor = relationship("User", foreign_keys=[final_auth_actor_id])
    noc_issued_by = relationship("User", foreign_keys=[noc_issued_by_id])
    discharge_evidence_submitted_by = relationship("User", foreign_keys=[discharge_evidence_submitted_by_id])
    discharge_reviewed_by = relationship("User", foreign_keys=[discharge_reviewed_by_id])
    # Immutable event log
    stage_events = relationship("ReleaseStageEvent", back_populates="release_request", cascade="all, delete-orphan")


class ReleaseStageEvent(Base):
    """
    Immutable log of each stage transition in a ReleaseRequest lifecycle.
    Each row is an append-only event record: actor, stage name, decision, reason, timestamp, evidence ref.
    """
    __tablename__ = "release_stage_events"

    id = Column(Integer, primary_key=True, index=True)
    release_request_id = Column(Integer, ForeignKey("release_requests.id", ondelete="CASCADE"), nullable=False, index=True)
    stage_name = Column(String(80), nullable=False)  # SUBMITTED, CLEARANCE_A, CLEARANCE_B, FINAL_AUTH, NOC_ISSUED, DISCHARGE_SUBMITTED, DISCHARGE_REVIEWED, COMPLETED, REJECTED
    actor_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    actor_email = Column(String(255), nullable=True)
    decision = Column(String(50), nullable=False)  # GRANTED, REJECTED, CLARIFICATION_REQUIRED, SUBMITTED, AUTHORIZED, ISSUED, COMPLETED
    reason = Column(Text, nullable=True)
    evidence_reference = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, index=True)

    # Relationships
    release_request = relationship("ReleaseRequest", back_populates="stage_events")




class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    recipient_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    fdr_id = Column(Integer, ForeignKey("fdr_records.id", ondelete="SET NULL"), nullable=True)
    notification_type = Column(String(50), nullable=False)  # MATURITY_ALERT, SCRUTINY_UPDATE, RENEWAL_ALERT, RELEASE_UPDATE, SYSTEM
    subject = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    due_date = Column(DateTime, nullable=True)
    is_read = Column(Boolean, default=False, index=True)
    delivery_provider = Column(String(50), default="IN_APP")  # IN_APP, SNS_EMAIL, SNS_SMS, LOCAL_SIMULATION
    delivery_status = Column(String(50), default="DELIVERED")  # DELIVERED, PENDING, FAILED
    reminder_interval_key = Column(String(100), nullable=True)  # e.g., "FDR_10_INTERVAL_15" for deduplication!
    created_at = Column(DateTime, default=datetime.datetime.utcnow, index=True)

    # Relationships
    recipient = relationship("User", back_populates="notifications")
    fdr = relationship("FDRRecord")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    actor_id = Column(Integer, nullable=True)
    actor_email = Column(String(255), nullable=True)
    action = Column(String(100), nullable=False, index=True)  # LOGIN, CREATE_FDR, VERIFY_FDR, SUBMIT_RENEWAL, REQUEST_RELEASE, etc.
    entity_type = Column(String(100), nullable=False)  # FDRRecord, Document, ReleaseRequest, User
    entity_id = Column(String(100), nullable=True)
    result = Column(String(50), default="SUCCESS")  # SUCCESS, FAILURE, DENIED
    metadata_json = Column(JSON, nullable=True)
    ip_address = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, index=True)


class SystemConfig(Base):
    __tablename__ = "system_configs"

    key = Column(String(100), primary_key=True)
    value_json = Column(JSON, nullable=False)
    description = Column(String(255), nullable=True)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
