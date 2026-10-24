import os
import io
import datetime
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.core.config import settings
from app.db.session import Base, get_db
from app.db.init_db import init_db
from app.services.maturity import run_maturity_check

# Use isolated test SQLite database
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_aicte_fdr.db"
test_engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    Base.metadata.drop_all(bind=test_engine)
    Base.metadata.create_all(bind=test_engine)
    db = TestingSessionLocal()
    init_db(db)
    db.close()
    yield
    Base.metadata.drop_all(bind=test_engine)
    test_engine.dispose()
    try:
        if os.path.exists("./test_aicte_fdr.db"):
            os.remove("./test_aicte_fdr.db")
    except Exception:
        pass

@pytest.fixture
def client():
    return TestClient(app)

def get_auth_token(client: TestClient, email: str = "college@demo.aicte.gov.in") -> str:
    res = client.post("/api/v1/auth/login", json={"email": email, "password": "Demo@12345"})
    assert res.status_code == 200, res.text
    return res.json()["access_token"]

# -----------------------------------------------------------------------------
# Scenario A: New FDR Submission & Dashboard Integration
# -----------------------------------------------------------------------------
def test_scenario_a_new_fdr_submission(client):
    token = get_auth_token(client, "college@demo.aicte.gov.in")
    headers = {"Authorization": f"Bearer {token}"}

    today = datetime.date.today()
    fdr_payload = {
        "fdr_number": "TEST-FDR-AUTO-001",
        "bank_name": "State Bank of India",
        "branch_name": "New Delhi Main",
        "amount": 1200000.0,
        "currency": "INR",
        "issue_date": str(today),
        "maturity_date": str(today + datetime.timedelta(days=365)),
        "deposit_type": "Security Deposit (Mandatory)",
    }

    # 1. Create FDR
    res = client.post("/api/v1/fdrs", json=fdr_payload, headers=headers)
    assert res.status_code == 200, res.text
    fdr_data = res.json()
    assert fdr_data["fdr_number"] == "TEST-FDR-AUTO-001"
    assert fdr_data["amount"] == 1200000.0
    fdr_id = fdr_data["id"]

    # 2. Upload Scanned Document
    fake_pdf = b"%PDF-1.4 sample content"
    files = {"file": ("test_deposit_receipt.pdf", fake_pdf, "application/pdf")}
    upload_res = client.post(f"/api/v1/documents/upload/{fdr_id}", files=files, headers=headers)
    assert upload_res.status_code == 200, upload_res.text
    assert upload_res.json()["original_filename"] == "test_deposit_receipt.pdf"

    # 3. Check Dashboard reflects submission
    dash_res = client.get("/api/v1/dashboard/college", headers=headers)
    assert dash_res.status_code == 200
    assert dash_res.json()["total_fdrs"] >= 1

# -----------------------------------------------------------------------------
# Scenario B: Institution Access Isolation (Anti-IDOR)
# -----------------------------------------------------------------------------
def test_scenario_b_institution_isolation(client):
    # College 1 is institution 1 (Delhi)
    token_inst1 = get_auth_token(client, "college@demo.aicte.gov.in")
    
    # College 2 is institution 2 (Bangalore)
    token_inst2 = get_auth_token(client, "college2@demo.aicte.gov.in")

    # Fetch an FDR belonging to institution 2
    res_inst2 = client.get("/api/v1/fdrs", headers={"Authorization": f"Bearer {token_inst2}"})
    assert res_inst2.status_code == 200
    inst2_fdrs = res_inst2.json()
    assert len(inst2_fdrs) > 0
    fdr_inst2_id = inst2_fdrs[0]["id"]

    # Security check: College 1 MUST be rejected with 403 Forbidden when accessing College 2's FDR
    forbidden_res = client.get(f"/api/v1/fdrs/{fdr_inst2_id}", headers={"Authorization": f"Bearer {token_inst1}"})
    assert forbidden_res.status_code == 403, "Security Flaw: College user was able to access another college's FDR!"
    assert "Security Violation" in forbidden_res.json()["detail"]

# -----------------------------------------------------------------------------
# Scenario C: Verification & Scrutiny Observations
# -----------------------------------------------------------------------------
def test_scenario_c_officer_scrutiny(client):
    token_officer = get_auth_token(client, "officer@demo.aicte.gov.in")
    headers_officer = {"Authorization": f"Bearer {token_officer}"}

    # Retrieve an FDR
    res = client.get("/api/v1/fdrs?status=SUBMITTED", headers=headers_officer)
    assert res.status_code == 200
    fdrs = res.json()
    target_fdr = fdrs[0]

    # Officer records verification
    verify_payload = {
        "outcome": "VERIFIED",
        "observations": "Official verification completed against branch confirmation slip.",
        "verification_method": "MANUAL_SCRUTINY",
        "supporting_reference": "REF/2026/SCRUTINY-99"
    }
    verify_res = client.post(f"/api/v1/fdrs/{target_fdr['id']}/verify", json=verify_payload, headers=headers_officer)
    assert verify_res.status_code == 200
    assert verify_res.json()["administrative_status"] == "VERIFIED"

# -----------------------------------------------------------------------------
# Scenario D: Validation & Conflict Rejection
# -----------------------------------------------------------------------------
def test_scenario_d_validation_rules(client):
    token = get_auth_token(client, "college@demo.aicte.gov.in")
    headers = {"Authorization": f"Bearer {token}"}

    today = datetime.date.today()
    # Invalid: Maturity earlier than issue date
    invalid_payload = {
        "fdr_number": "INVALID-DATE-001",
        "bank_name": "Canara Bank",
        "branch_name": "Delhi",
        "amount": 500000.0,
        "issue_date": str(today),
        "maturity_date": str(today - datetime.timedelta(days=10)), # earlier than issue
        "deposit_type": "Security Deposit",
    }
    res = client.post("/api/v1/fdrs", json=invalid_payload, headers=headers)
    assert res.status_code == 400
    assert "Maturity date cannot be earlier than Issue date" in res.json()["detail"]

    # Invalid: Negative amount
    invalid_payload["maturity_date"] = str(today + datetime.timedelta(days=100))
    invalid_payload["amount"] = -100.0
    res2 = client.post("/api/v1/fdrs", json=invalid_payload, headers=headers)
    assert res2.status_code == 400 or res2.status_code == 422

# -----------------------------------------------------------------------------
# Scenario E & F: Maturity Monitoring & Duplicate Alert Prevention (Idempotency)
# -----------------------------------------------------------------------------
def test_scenario_e_and_f_maturity_monitoring_idempotency(client):
    db = TestingSessionLocal()
    
    # First execution: should detect upcoming maturities and overdue instruments
    res_1 = run_maturity_check(db)
    assert res_1["status"] == "COMPLETED"
    first_run_alerts = res_1["reminders_sent"]
    assert first_run_alerts >= 1

    # Second execution: IDEMPOTENCY TEST: must produce 0 duplicate alerts
    res_2 = run_maturity_check(db)
    assert res_2["status"] == "COMPLETED"
    assert res_2["reminders_sent"] == 0, "Idempotency Failed: Duplicate notifications were dispatched!"
    db.close()

# -----------------------------------------------------------------------------
# Scenario G: Renewal & Replacement Lineage
# -----------------------------------------------------------------------------
def test_scenario_g_renewal_workflow(client):
    token = get_auth_token(client, "college@demo.aicte.gov.in")
    headers = {"Authorization": f"Bearer {token}"}

    today = datetime.date.today()
    # Retrieve existing FDR
    fdrs_res = client.get("/api/v1/fdrs", headers=headers)
    orig_fdr = fdrs_res.json()[0]

    renewal_payload = {
        "original_fdr_id": orig_fdr["id"],
        "fdr_number": f"RENEW-{orig_fdr['fdr_number']}",
        "bank_name": orig_fdr["bank_name"],
        "branch_name": orig_fdr["branch_name"],
        "amount": orig_fdr["amount"],
        "issue_date": str(today),
        "maturity_date": str(today + datetime.timedelta(days=730)),
        "remarks": "5-year rollover replacement instrument"
    }

    renew_res = client.post("/api/v1/renewals", json=renewal_payload, headers=headers)
    assert renew_res.status_code == 200, renew_res.text
    data = renew_res.json()
    assert data["original_fdr_id"] == orig_fdr["id"]
    assert data["status"] == "PENDING_REVIEW"

# -----------------------------------------------------------------------------
# Scenario H: Release Request Lifecycle
# -----------------------------------------------------------------------------
def test_scenario_h_release_request(client):
    token_college = get_auth_token(client, "college@demo.aicte.gov.in")
    token_officer = get_auth_token(client, "officer@demo.aicte.gov.in")

    # 1. College submits release request
    fdr_res = client.get("/api/v1/fdrs", headers={"Authorization": f"Bearer {token_college}"})
    target_fdr = fdr_res.json()[0]

    req_payload = {
        "fdr_id": target_fdr["id"],
        "reason": "Statutory completion of 10-year term with zero student liabilities."
    }
    create_res = client.post("/api/v1/releases", json=req_payload, headers={"Authorization": f"Bearer {token_college}"})
    assert create_res.status_code == 200
    req_id = create_res.json()["id"]

    # 2. Officer reviews and approves release
    review_payload = {
        "status": "APPROVED",
        "remarks": "Verified zero liabilities from regional office. Administrative release approved."
    }
    review_res = client.put(f"/api/v1/releases/{req_id}/review", json=review_payload, headers={"Authorization": f"Bearer {token_officer}"})
    assert review_res.status_code == 200
    assert review_res.json()["status"] == "APPROVED"

# -----------------------------------------------------------------------------
# Scenario I: RBAC Permission Enforcement
# -----------------------------------------------------------------------------
def test_scenario_i_role_authorization_enforcement(client):
    token_college = get_auth_token(client, "college@demo.aicte.gov.in")
    
    # College User attempts officer-only action: verifying an FDR
    forbidden_res = client.post(
        "/api/v1/fdrs/1/verify",
        json={"outcome": "VERIFIED", "observations": "I verify myself"},
        headers={"Authorization": f"Bearer {token_college}"}
    )
    assert forbidden_res.status_code == 403, "RBAC bypass: College user executed officer action!"

# -----------------------------------------------------------------------------
# Scenario J: Document Security & Path Traversal Prevention
# -----------------------------------------------------------------------------
def test_scenario_j_document_security_and_traversal(client):
    token = get_auth_token(client, "college@demo.aicte.gov.in")
    headers = {"Authorization": f"Bearer {token}"}

    # Attempt to download non-existent or path traversal file
    traversal_res = client.get("/api/v1/documents/download/..%2F..%2Fetc%2Fpasswd", headers=headers)
    assert traversal_res.status_code in [403, 404]

    # Oversized file or invalid extension check
    invalid_file = {"file": ("malicious.exe", b"MZ...", "application/x-msdownload")}
    upload_res = client.post("/api/v1/documents/upload/1", files=invalid_file, headers=headers)
    assert upload_res.status_code == 400
    assert "Unsupported file format" in upload_res.json()["detail"]

# -----------------------------------------------------------------------------
# Scenario K: Audit History Traceability
# -----------------------------------------------------------------------------
def test_scenario_k_audit_history(client):
    token_admin = get_auth_token(client, "admin@demo.aicte.gov.in")
    res = client.get("/api/v1/audit", headers={"Authorization": f"Bearer {token_admin}"})
    assert res.status_code == 200
    audits = res.json()
    assert len(audits) >= 1
    # Ensure sensitive credentials are never leaked in metadata
    for a in audits:
        meta_str = str(a.get("metadata_json") or "").lower()
        assert "password" not in meta_str or "[redacted]" in meta_str

# -----------------------------------------------------------------------------
# Scenario L: AWS Unavailable / Local Fallback
# -----------------------------------------------------------------------------
def test_scenario_l_local_fallback(client):
    # App health reports local storage and simulation when AWS is offline
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert data["storage_provider"] in ["LOCAL_STORAGE", "AWS_S3"]
    assert data["demo_mode"] is True
    assert data["aws_region"] == "ap-southeast-2"

# -----------------------------------------------------------------------------
# Scenario M: Staged Release Gatekeeping & Actor Separation
# -----------------------------------------------------------------------------
def test_scenario_m_staged_release_gatekeeping_and_actor_separation(client):
    token_college = get_auth_token(client, "college@demo.aicte.gov.in")
    token_officer1 = get_auth_token(client, "officer@demo.aicte.gov.in")
    token_officer2 = get_auth_token(client, "officer2@demo.aicte.gov.in")
    token_approver = get_auth_token(client, "approver@demo.aicte.gov.in")

    # 1. College creates a release request
    fdr_res = client.get("/api/v1/fdrs", headers={"Authorization": f"Bearer {token_college}"})
    fdr_id = fdr_res.json()[0]["id"]
    create_res = client.post(
        "/api/v1/releases",
        json={"fdr_id": fdr_id, "reason": "Tenure completed with zero outstanding liabilities."},
        headers={"Authorization": f"Bearer {token_college}"}
    )
    assert create_res.status_code == 200
    req_id = create_res.json()["id"]

    # 2. Gate check: Attempting Clearance B before Clearance A must FAIL (cannot skip gates)
    skip_res = client.post(
        f"/api/v1/releases/{req_id}/stages/clearance-b",
        json={"decision": "GRANTED", "reason": "Attempting skip to Clearance B"},
        headers={"Authorization": f"Bearer {token_officer2}"}
    )
    assert skip_res.status_code == 400
    assert "CLEARANCE_A_GRANTED" in skip_res.json()["detail"]

    # 3. Officer 1 grants Clearance A
    clr_a_res = client.post(
        f"/api/v1/releases/{req_id}/stages/clearance-a",
        json={"decision": "GRANTED", "reason": "Regional audit clear. Zero student liabilities.", "evidence_reference": "REG-AUD-001"},
        headers={"Authorization": f"Bearer {token_officer1}"}
    )
    assert clr_a_res.status_code == 200
    assert clr_a_res.json()["status"] == "CLEARANCE_A_GRANTED"

    # 4. Mandatory Actor Separation: Officer 1 attempting Clearance B must FAIL
    same_actor_res = client.post(
        f"/api/v1/releases/{req_id}/stages/clearance-b",
        json={"decision": "GRANTED", "reason": "Officer 1 trying self-approval"},
        headers={"Authorization": f"Bearer {token_officer1}"}
    )
    assert same_actor_res.status_code in [400, 403]
    assert "Actor Separation" in same_actor_res.json()["detail"] or "same officer" in same_actor_res.json()["detail"].lower()

    # 5. Independent Officer 2 grants Clearance B
    clr_b_res = client.post(
        f"/api/v1/releases/{req_id}/stages/clearance-b",
        json={"decision": "GRANTED", "reason": "Independent scrutiny confirmed compliant.", "evidence_reference": "IND-REV-002"},
        headers={"Authorization": f"Bearer {token_officer2}"}
    )
    assert clr_b_res.status_code == 200
    assert clr_b_res.json()["status"] == "CLEARANCE_B_GRANTED"

    # 6. Role check: Officer attempting Final Authorization must FAIL (requires WORKFLOW_APPROVER or ADMIN)
    wrong_role_auth = client.post(
        f"/api/v1/releases/{req_id}/stages/final-authorization",
        json={"decision": "AUTHORIZED", "reason": "Officer trying to approve"},
        headers={"Authorization": f"Bearer {token_officer1}"}
    )
    assert wrong_role_auth.status_code == 403

    # 7. Approver grants Final Authorization
    auth_res = client.post(
        f"/api/v1/releases/{req_id}/stages/final-authorization",
        json={"decision": "AUTHORIZED", "reason": "Competent authority approval granted.", "evidence_reference": "SANCTION-MEMO-2026"},
        headers={"Authorization": f"Bearer {token_approver}"}
    )
    assert auth_res.status_code == 200
    assert auth_res.json()["status"] == "FINAL_AUTHORIZED"

    # 8. Issue NOC
    noc_res = client.post(
        f"/api/v1/releases/{req_id}/stages/issue-noc",
        json={"decision": "ISSUED", "reason": "AICTE NOC generated for bank lien clearance.", "evidence_reference": "AICTE/NOC/2026/999"},
        headers={"Authorization": f"Bearer {token_approver}"}
    )
    assert noc_res.status_code == 200
    assert noc_res.json()["status"] == "NOC_ISSUED"

    # 9. Submit & Review Discharge Evidence
    disch_sub = client.post(
        f"/api/v1/releases/{req_id}/stages/discharge-evidence",
        json={"decision": "SUBMITTED", "reason": "Bank discharge receipt uploaded.", "evidence_reference": "BANK/DISCH/888"},
        headers={"Authorization": f"Bearer {token_college}"}
    )
    assert disch_sub.status_code == 200

    disch_rev = client.post(
        f"/api/v1/releases/{req_id}/stages/review-discharge",
        json={"decision": "ACCEPTED", "reason": "Bank discharge receipt verified."},
        headers={"Authorization": f"Bearer {token_officer2}"}
    )
    assert disch_rev.status_code == 200
    assert disch_rev.json()["status"] == "COMPLETED"

    # 10. Verify all stages were recorded
    stages_res = client.get(f"/api/v1/releases/{req_id}/stages", headers={"Authorization": f"Bearer {token_college}"})
    assert stages_res.status_code == 200
    recorded_stages = [s["stage_name"] for s in stages_res.json()]
    for expected in ["SUBMITTED", "CLEARANCE_A", "CLEARANCE_B", "FINAL_AUTH", "NOC_ISSUED", "DISCHARGE_SUBMITTED", "DISCHARGE_REVIEWED", "COMPLETED"]:
        assert expected in recorded_stages

# -----------------------------------------------------------------------------
# Scenario N: Auditor Read-Only Role Isolation
# -----------------------------------------------------------------------------
def test_scenario_n_auditor_read_only_access(client):
    token_auditor = get_auth_token(client, "auditor@demo.aicte.gov.in")
    headers = {"Authorization": f"Bearer {token_auditor}"}

    # Auditor CAN read repositories and audit logs
    assert client.get("/api/v1/fdrs", headers=headers).status_code == 200
    assert client.get("/api/v1/releases", headers=headers).status_code == 200
    assert client.get("/api/v1/renewals", headers=headers).status_code == 200
    assert client.get("/api/v1/audit", headers=headers).status_code == 200

    # Auditor CANNOT mutate or create records (must be rejected with 403 Forbidden)
    post_fdr = client.post(
        "/api/v1/fdrs",
        json={
            "fdr_number": "AUDIT-TRY",
            "bank_name": "SBI",
            "branch_name": "Delhi",
            "amount": 100000,
            "issue_date": str(datetime.date.today()),
            "maturity_date": str(datetime.date.today() + datetime.timedelta(days=365)),
            "deposit_type": "Security Deposit"
        },
        headers=headers
    )
    assert post_fdr.status_code == 403
    assert "read-only" in post_fdr.json()["detail"].lower()

# -----------------------------------------------------------------------------
# Scenario O: Admin Cannot Bypass Release Gates
# -----------------------------------------------------------------------------
def test_scenario_o_admin_cannot_bypass_gates(client):
    token_admin = get_auth_token(client, "admin@demo.aicte.gov.in")
    token_college = get_auth_token(client, "college@demo.aicte.gov.in")

    # College creates dedicated new FDR and release request
    new_fdr = client.post(
        "/api/v1/fdrs",
        json={
            "fdr_number": "TEST-FDR-ADMIN-BYPASS-001",
            "bank_name": "Axis Bank",
            "branch_name": "Delhi",
            "amount": 500000.0,
            "currency": "INR",
            "issue_date": str(datetime.date.today()),
            "maturity_date": str(datetime.date.today() + datetime.timedelta(days=365)),
            "deposit_type": "Security Deposit"
        },
        headers={"Authorization": f"Bearer {token_college}"}
    ).json()

    create_res = client.post(
        "/api/v1/releases",
        json={"fdr_id": new_fdr["id"], "reason": "Tenure completed zero liabilities."},
        headers={"Authorization": f"Bearer {token_college}"}
    )
    assert create_res.status_code == 200
    req_id = create_res.json()["id"]

    # Admin attempting Final Authorization while status is SUBMITTED (skipping Clearance A & B) must FAIL
    bypass_res = client.post(
        f"/api/v1/releases/{req_id}/stages/final-authorization",
        json={"decision": "AUTHORIZED", "reason": "Admin trying override bypass"},
        headers={"Authorization": f"Bearer {token_admin}"}
    )
    assert bypass_res.status_code == 400
    assert "CLEARANCE_B_GRANTED" in bypass_res.json()["detail"]


