import os
import datetime
from sqlalchemy.orm import Session
from app.core.config import settings
from app.db.session import engine, Base
from app.models.models import (
    User, Institution, FDRRecord, Document, VerificationRecord,
    RenewalRecord, ReleaseRequest, ReleaseStageEvent, Notification, AuditLog, SystemConfig
)
from app.security.auth import get_password_hash

def init_db(db: Session):
    Base.metadata.create_all(bind=engine)

    # Check if already seeded
    if db.query(Institution).count() > 0:
        return

    print("[DB Seed] Seeding realistic fictional data for DepositLedger - AICTE FDR Portal...")

    # 1. Institutions
    inst1 = Institution(
        name="Delhi Institute of Technology & Science",
        aicte_code="1-104928191",
        institution_type="Engineering & Technology",
        address="Sector 14, Dwarka, New Delhi 110078",
        state="Delhi",
        contact_person="Dr. Ramesh Sharma",
        email="contact@dits-delhi.edu.in",
        phone="+91-11-28082910",
        status="ACTIVE"
    )
    inst2 = Institution(
        name="Bangalore College of Engineering & Research",
        aicte_code="1-284918231",
        institution_type="Engineering & Technology",
        address="Whitefield IT Park Road, Bengaluru 560066",
        state="Karnataka",
        contact_person="Prof. Anita Rao",
        email="admin@bcer-bengaluru.edu.in",
        phone="+91-80-49281000",
        status="ACTIVE"
    )
    inst3 = Institution(
        name="Mumbai Polytechnic & Technical Campus",
        aicte_code="1-394819202",
        institution_type="Polytechnic Diploma",
        address="Vashi Sector 9, Navi Mumbai 400703",
        state="Maharashtra",
        contact_person="Dr. Sunil Deshmukh",
        email="principal@mptc-mumbai.edu.in",
        phone="+91-22-27829100",
        status="ACTIVE"
    )
    inst4 = Institution(
        name="Chennai Academy of Advanced Technology",
        aicte_code="1-482910485",
        institution_type="Autonomous Technical Institution",
        address="OMR IT Highway, Sholinganallur, Chennai 600119",
        state="Tamil Nadu",
        contact_person="Dr. K. Venkataraman",
        email="director@caat-chennai.edu.in",
        phone="+91-44-24501900",
        status="ACTIVE"
    )
    db.add_all([inst1, inst2, inst3, inst4])
    db.flush()

    # 2. Users - All 5 roles seeded
    pwd = get_password_hash("Demo@12345")

    user_college = User(
        name="Dr. Ramesh Sharma (Principal)",
        email="college@demo.aicte.gov.in",
        password_hash=pwd,
        role="COLLEGE_USER",
        institution_id=inst1.id,
        is_active=True
    )
    user_college2 = User(
        name="Prof. Anita Rao (Dean)",
        email="college2@demo.aicte.gov.in",
        password_hash=pwd,
        role="COLLEGE_USER",
        institution_id=inst2.id,
        is_active=True
    )
    user_officer = User(
        name="Shri Rajesh Kumar (Scrutiny Officer)",
        email="officer@demo.aicte.gov.in",
        password_hash=pwd,
        role="AICTE_OFFICER",
        institution_id=None,
        is_active=True
    )
    # Second officer for actor separation in Clearance B
    user_officer2 = User(
        name="Dr. Kavitha Menon (Deputy Scrutiny Officer)",
        email="officer2@demo.aicte.gov.in",
        password_hash=pwd,
        role="AICTE_OFFICER",
        institution_id=None,
        is_active=True
    )
    # Workflow Approver: senior approval authority
    user_approver = User(
        name="Shri Arun Kapoor (Workflow Approver)",
        email="approver@demo.aicte.gov.in",
        password_hash=pwd,
        role="WORKFLOW_APPROVER",
        institution_id=None,
        is_active=True
    )
    user_admin = User(
        name="Smt. Priya Nair (System Admin)",
        email="admin@demo.aicte.gov.in",
        password_hash=pwd,
        role="ADMIN",
        institution_id=None,
        is_active=True
    )
    # Auditor: read-only access
    user_auditor = User(
        name="Shri D.K. Joshi (Internal Auditor)",
        email="auditor@demo.aicte.gov.in",
        password_hash=pwd,
        role="AUDITOR",
        institution_id=None,
        is_active=True
    )
    db.add_all([user_college, user_college2, user_officer, user_officer2, user_approver, user_admin, user_auditor])
    db.flush()

    # 3. Sample Documents (create physical sample dummy PDF in uploads)
    os.makedirs(settings.STORAGE_DIR, exist_ok=True)
    sample_pdf_path = os.path.join(settings.STORAGE_DIR, "sample_fdr_receipt.pdf")
    if not os.path.exists(sample_pdf_path):
        with open(sample_pdf_path, "wb") as f:
            # Simple standard PDF header content
            f.write(b"%PDF-1.4\n1 0 obj<<Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<<Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<<Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>>>endobj\nxref\n0 4\n0000000000 65535 f \n0000000010 00000 n \n0000000053 00000 n \n0000000102 00000 n \ntrailer<<Size 4/Root 1 0 R>>\nstartxref\n178\n%%EOF\n")

    today = datetime.datetime.utcnow()

    # 4. Realistic FDR Records covering all demo scenarios

    # FDR A: Active & Verified (normal healthy FDR)
    fdr1 = FDRRecord(
        institution_id=inst1.id,
        fdr_number="SBI-FDR-2024-8921",
        bank_name="State Bank of India",
        branch_name="Parliament Street Branch, New Delhi",
        amount=1500000.0,
        currency="INR",
        issue_date=today - datetime.timedelta(days=365),
        maturity_date=today + datetime.timedelta(days=180),
        deposit_type="Security Deposit (Mandatory)",
        administrative_status="VERIFIED",
        maturity_status="ACTIVE",
        verification_status="VERIFIED",
        scrutiny_remarks="Instrument verified against prescribed AICTE format and branch confirmation stamp.",
        submission_date=today - datetime.timedelta(days=360),
        submitted_by_id=user_college.id
    )

    # FDR B: Approaching Maturity (15 days remaining) — no successor — triggers overdue alert
    fdr2 = FDRRecord(
        institution_id=inst1.id,
        fdr_number="PNB-SEC-7749102",
        bank_name="Punjab National Bank",
        branch_name="Dwarka Sector 10 Branch, New Delhi",
        amount=1000000.0,
        currency="INR",
        issue_date=today - datetime.timedelta(days=350),
        maturity_date=today + datetime.timedelta(days=15),
        deposit_type="AICTE Approval Security Deposit",
        administrative_status="VERIFIED",
        maturity_status="APPROACHING_MATURITY",
        verification_status="VERIFIED",
        scrutiny_remarks="Verified. 15-day advance renewal notification dispatched.",
        submission_date=today - datetime.timedelta(days=340),
        submitted_by_id=user_college.id
    )

    # FDR C: Matured Overdue with an active successor (overdue suppressed by successor-aware logic)
    fdr3 = FDRRecord(
        institution_id=inst1.id,
        fdr_number="CAN-CORPUS-449182",
        bank_name="Canara Bank",
        branch_name="Janakpuri Branch, New Delhi",
        amount=2500000.0,
        currency="INR",
        issue_date=today - datetime.timedelta(days=377),
        maturity_date=today - datetime.timedelta(days=12),
        deposit_type="New Course Introduction Corpus",
        administrative_status="RENEWAL_SUBMITTED",
        maturity_status="MATURED",
        verification_status="VERIFIED",
        scrutiny_remarks="Maturity date expired. Successor renewal FDR submitted and under review.",
        submission_date=today - datetime.timedelta(days=370),
        submitted_by_id=user_college.id
    )

    # FDR C-Successor: Active replacement for FDR C
    fdr3_successor = FDRRecord(
        institution_id=inst1.id,
        fdr_number="CAN-CORPUS-449182-RENEW-2026",
        bank_name="Canara Bank",
        branch_name="Janakpuri Branch, New Delhi",
        amount=2500000.0,
        currency="INR",
        issue_date=today - datetime.timedelta(days=5),
        maturity_date=today + datetime.timedelta(days=360),
        deposit_type="New Course Introduction Corpus",
        administrative_status="SUBMITTED",
        maturity_status="ACTIVE",
        verification_status="PENDING",
        scrutiny_remarks="Renewal/Replacement for FDR CAN-CORPUS-449182",
        original_fdr_id=None,  # will be set after flush
        submission_date=today - datetime.timedelta(days=4),
        submitted_by_id=user_college.id
    )

    # FDR D: Under Scrutiny Review — documentary discrepancy
    fdr4 = FDRRecord(
        institution_id=inst1.id,
        fdr_number="BOB-FDR-992819",
        bank_name="Bank of Baroda",
        branch_name="Connaught Place, New Delhi",
        amount=800000.0,
        currency="INR",
        issue_date=today - datetime.timedelta(days=5),
        maturity_date=today + datetime.timedelta(days=360),
        deposit_type="Security Deposit",
        administrative_status="UNDER_REVIEW",
        maturity_status="ACTIVE",
        verification_status="PENDING",
        scrutiny_remarks="Currently undergoing officer scrutiny for joint lien clause endorsement.",
        submission_date=today - datetime.timedelta(days=5),
        submitted_by_id=user_college.id
    )

    # FDR E: Clarification Required (documentary discrepancy — smudged seal)
    fdr5 = FDRRecord(
        institution_id=inst1.id,
        fdr_number="HDFC-DEP-1029384",
        bank_name="HDFC Bank",
        branch_name="Dwarka Sector 6 Branch, New Delhi",
        amount=500000.0,
        currency="INR",
        issue_date=today - datetime.timedelta(days=10),
        maturity_date=today + datetime.timedelta(days=355),
        deposit_type="AICTE Security Deposit",
        administrative_status="CLARIFICATION_REQUIRED",
        maturity_status="ACTIVE",
        verification_status="CLARIFICATION_REQUIRED",
        scrutiny_remarks="Branch Manager signature seal is smudged on page 1. Institution claim recorded; manual verification required. Please re-upload verified bank copy.",
        submission_date=today - datetime.timedelta(days=10),
        submitted_by_id=user_college.id
    )

    # FDR F: Institution 2 (Bangalore) — Pre-seeded advanced release case
    fdr6 = FDRRecord(
        institution_id=inst2.id,
        fdr_number="IOB-TECH-552810",
        bank_name="Indian Overseas Bank",
        branch_name="Whitefield Main Road, Bengaluru",
        amount=3000000.0,
        currency="INR",
        issue_date=today - datetime.timedelta(days=3650),  # ~10 years ago
        maturity_date=today - datetime.timedelta(days=30),  # recently matured
        deposit_type="Security Deposit (Autonomous Status)",
        administrative_status="RELEASE_AUTHORIZED",
        maturity_status="MATURED",
        verification_status="VERIFIED",
        scrutiny_remarks="Verified. 10-year tenure completed. Release process initiated. Final authorization granted.",
        submission_date=today - datetime.timedelta(days=3640),
        submitted_by_id=user_college2.id
    )

    db.add_all([fdr1, fdr2, fdr3, fdr3_successor, fdr4, fdr5, fdr6])
    db.flush()

    # Fix original_fdr_id for successor
    fdr3_successor.original_fdr_id = fdr3.id

    # Documents
    for f in [fdr1, fdr2, fdr3, fdr3_successor, fdr4, fdr5, fdr6]:
        doc = Document(
            fdr_id=f.id,
            storage_provider="LOCAL",
            storage_key="sample_fdr_receipt.pdf",
            original_filename=f"{f.fdr_number}_Deposit_Receipt.pdf",
            safe_filename="sample_fdr_receipt.pdf",
            file_type="application/pdf",
            file_size=248,
            upload_metadata={"demo_seed": True, "note": "SYNTHETIC DATA - No live bank connection"}
        )
        db.add(doc)

    # Verifications
    v1 = VerificationRecord(
        fdr_id=fdr1.id,
        reviewer_id=user_officer.id,
        verification_method="MANUAL_SCRUTINY",
        outcome="VERIFIED",
        observations="Branch confirmation certificate verified against AICTE security deposit register. SYNTHETIC DATA — documentary check only, no independent bank confirmation.",
        supporting_reference="SCRUTINY/2024/SBI-8921"
    )
    v2 = VerificationRecord(
        fdr_id=fdr5.id,
        reviewer_id=user_officer.id,
        verification_method="MANUAL_SCRUTINY",
        outcome="CLARIFICATION_REQUIRED",
        observations="Branch Manager signature seal is smudged on page 1. Institution claim recorded as submitted. Documentary verification incomplete. Please re-upload verified bank copy.",
        supporting_reference="SCRUTINY/2026/HDFC-1029"
    )
    v3 = VerificationRecord(
        fdr_id=fdr6.id,
        reviewer_id=user_officer.id,
        verification_method="MANUAL_SCRUTINY",
        outcome="VERIFIED",
        observations="Verified in order with 10-year record of compliance. Release eligibility confirmed after documentary review.",
        supporting_reference="SCRUTINY/2026/IOB-552810"
    )
    db.add_all([v1, v2, v3])

    # Renewal Record: fdr3 → fdr3_successor
    renewal_record = RenewalRecord(
        original_fdr_id=fdr3.id,
        replacement_fdr_id=fdr3_successor.id,
        submission_date=today - datetime.timedelta(days=4),
        status="PENDING_REVIEW",
        remarks="Renewal submitted for matured FDR. Successor FDR under scrutiny."
    )
    db.add(renewal_record)
    db.flush()

    # Pre-seeded Release Case for FDR6: Clearance A & B already recorded; awaiting NOC stage
    now = datetime.datetime.utcnow()
    release_req = ReleaseRequest(
        fdr_id=fdr6.id,
        institution_id=inst2.id,
        requester_id=user_college2.id,
        reason="10-year statutory compliance period completed with zero outstanding student liabilities. Institution requests release of security deposit.",
        status="CLEARANCE_B_GRANTED",
        reviewer_id=user_officer2.id,
        remarks="Both independent clearances granted. Awaiting final authorization and NOC issuance.",
        # Clearance A (officer 1)
        clearance_a_actor_id=user_officer.id,
        clearance_a_timestamp=today - datetime.timedelta(days=5),
        clearance_a_remarks="No outstanding liabilities found in regional records. Institutional audit confirms zero dues. Clearance A granted.",
        clearance_a_decision="GRANTED",
        # Clearance B (officer 2 — different actor)
        clearance_b_actor_id=user_officer2.id,
        clearance_b_timestamp=today - datetime.timedelta(days=3),
        clearance_b_remarks="Independent review confirms compliance record is clean for 10-year period. Clearance B granted.",
        clearance_b_decision="GRANTED",
        created_at=today - datetime.timedelta(days=10),
        updated_at=today - datetime.timedelta(days=3)
    )
    db.add(release_req)
    db.flush()

    # Immutable stage events for the release
    stage1 = ReleaseStageEvent(
        release_request_id=release_req.id,
        stage_name="SUBMITTED",
        actor_id=user_college2.id,
        actor_email=user_college2.email,
        decision="SUBMITTED",
        reason="10-year statutory period complete. Zero student liabilities certified.",
        created_at=today - datetime.timedelta(days=10)
    )
    stage2 = ReleaseStageEvent(
        release_request_id=release_req.id,
        stage_name="CLEARANCE_A",
        actor_id=user_officer.id,
        actor_email=user_officer.email,
        decision="GRANTED",
        reason="No outstanding liabilities found in regional records. Institutional audit confirms zero dues.",
        created_at=today - datetime.timedelta(days=5)
    )
    stage3 = ReleaseStageEvent(
        release_request_id=release_req.id,
        stage_name="CLEARANCE_B",
        actor_id=user_officer2.id,
        actor_email=user_officer2.email,
        decision="GRANTED",
        reason="Independent review confirms compliance record is clean for 10-year period.",
        created_at=today - datetime.timedelta(days=3)
    )
    db.add_all([stage1, stage2, stage3])

    # Notifications
    n1 = Notification(
        recipient_id=user_college.id,
        fdr_id=fdr2.id,
        notification_type="MATURITY_ALERT",
        subject="NOTICE: FDR PNB-SEC-7749102 Matures in 15 Days",
        message="FDR PNB-SEC-7749102 (\u20b910,00,000.00 at Punjab National Bank) will mature in 15 days. Kindly submit renewal instrument.",
        due_date=fdr2.maturity_date,
        is_read=False,
        delivery_provider="LOCAL_SIMULATION",
        delivery_status="DELIVERED",
        reminder_interval_key=f"FDR_{fdr2.id}_MATURITY_15_{(today + datetime.timedelta(days=15)).strftime('%Y%m%d')}_USER_{user_college.id}"
    )
    n2 = Notification(
        recipient_id=user_college.id,
        fdr_id=fdr5.id,
        notification_type="SCRUTINY_UPDATE",
        subject="Scrutiny Update on FDR HDFC-DEP-1029384: CLARIFICATION_REQUIRED",
        message="Your FDR HDFC-DEP-1029384 status has been updated to CLARIFICATION_REQUIRED. Remarks: Branch Manager signature seal is smudged on page 1. SYNTHETIC DATA — no live bank connection.",
        due_date=None,
        is_read=True,
        delivery_provider="IN_APP",
        delivery_status="DELIVERED"
    )
    n3 = Notification(
        recipient_id=user_college2.id,
        fdr_id=fdr6.id,
        notification_type="RELEASE_UPDATE",
        subject="Release Request Clearance B: GRANTED",
        message="Clearance B for your release request (FDR IOB-TECH-552810) has been granted. Awaiting Final Authorization and NOC issuance. PROTOTYPE — Synthetic Data.",
        due_date=None,
        is_read=False,
        delivery_provider="IN_APP",
        delivery_status="DELIVERED"
    )
    db.add_all([n1, n2, n3])

    # Initial Audit Logs
    a1 = AuditLog(
        actor_id=user_admin.id,
        actor_email=user_admin.email,
        action="SYSTEM_INIT_SEED",
        entity_type="System",
        entity_id="GENESIS",
        result="SUCCESS",
        metadata_json={
            "description": "DepositLedger system initialized with synthetic fictional data for SIH 2026 PS 26265 prototype demo",
            "disclaimer": "PROTOTYPE - SYNTHETIC DATA - No live bank connection - No actual funds transfer"
        }
    )
    db.add(a1)

    db.commit()
    print("[DB Seed] Successfully initialized DepositLedger with 4 institutions, 7 users (5 roles incl. AUDITOR + WORKFLOW_APPROVER), 7 FDRs, 1 pre-seeded staged release case, and renewal lineage!")
    print("[DB Seed] PROTOTYPE - Synthetic Data - No live bank connection")
