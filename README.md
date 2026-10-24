# DepositLedger: AICTE Security Deposit & FDR Management Portal
### Problem Statement ID: 26265 — Streamline of Security Deposit / FDR Portal
**Intended Organization:** All India Council for Technical Education (AICTE), Ministry of Education, Government of India.

> [!IMPORTANT]
> **PROTOTYPE DISCLOSURE & STATUTORY NOTICE:**
> This software is an advanced, fully interactive working prototype for hackathon demonstration (SIH 2026 PS 26265). All institution names, FDR account numbers, document proofs, bank branch endorsements, and verification records are **strictly synthetic demonstration data**. This prototype contains **no live banking integrations** and executes **no actual funds transfers or real encashments**. Release clearances and NOCs are administrative workflow checkpoints within the AICTE regulatory simulation.

---

## 1. Executive Summary

Technical institutions applying for AICTE approval or introducing new courses are statutorily required to establish Fixed Deposit Receipts (FDRs) or Security Deposits in joint lien with the Member Secretary, AICTE. Managing these instruments across thousands of institutions via fragmented spreadsheets and physical files introduces risks of missed maturities, lack of verification traceability, and delays in legitimate release/refund requests.

**DepositLedger** provides a centralized, secure, transparent, and auditable digital solution for the complete lifecycle of institutional security deposits:
1. **Digital Registration & Document Custody:** Institution users submit FDR instruments with branch seals, verified through server-side validation and anti-IDOR isolation.
2. **AICTE Officer Scrutiny:** Structured verification workflow with discrepancy detection, documentary evidence tagging, and mandatory observation logs.
3. **Automated Idempotent Maturity Monitoring:** Scheduled engine calculating advance notices (30, 15, 7, 0 days, and overdue) with zero duplicate notifications.
4. **Renewal & Replacement Lineage:** Bidirectional predecessor ↔ successor lineage tracking with successor-aware overdue suppression.
5. **7-Stage Release & Refund Pipeline:** Multi-stage administrative clearance pipeline with **mandatory actor separation on Clearance B** (`Clearance A actor ≠ Clearance B actor`), administrative authorization, statutory NOC issuance, physical discharge evidence upload, and workflow closure.
6. **Auditor Observation Mode:** Read-only observational access allowing comprehensive inspection of FDRs, releases, renewals, and immutable audit logs without mutation rights.
7. **Cloud-Native with Local Fallback:** Runs 100% offline locally on SQLite/FastAPI/Vite with zero cloud dependencies, while equipped with production AWS Terraform templates and 1-click Render blueprint (`render.yaml`).

---

## 2. Technology Stack

### Frontend
- **Framework:** React 18, TypeScript, Vite
- **Styling & UI:** Tailwind CSS (Government-grade deep navy `#0A2540` and saffron accents), Lucide React
- **Data Visualizations:** Recharts (Interactive Status Breakdown, Bank Exposure, Maturity Timeline)
- **Forms & Validation:** React Hook Form, Zod schema validation
- **Routing:** React Router v6 with 5-role protected navigation & Auditor read-only UI controls
- **Build Quality:** TypeScript compiler (`tsc`) and Vite production bundle passing with 0 errors

### Backend
- **Framework:** Python 3.11+, FastAPI (REST API under `/api/v1`)
- **Validation & Models:** Pydantic v2, SQLAlchemy ORM
- **Security & RBAC:** Native BCrypt password hashing, JWT Bearer tokens with institutional tenant isolation
- **Maturity Engine:** Successor-aware scheduler suppressing overdue alerts on superseded FDRs
- **Storage Tier:** Dual-mode: Local private non-public storage with path-traversal prevention, or Amazon S3 with SSE-AES256

### Automated Testing
- **Framework:** Pytest, HTTPX, FastAPI TestClient
- **Coverage:** 14 Comprehensive Test Scenarios (Scenarios A through O) covering security, tenancy, scrutiny, lineage, maturity idempotency, 7-stage release pipeline, actor separation, and auditor isolation.

---

## 3. Five User Roles & Access Control (RBAC)

The portal implements strict role-based access control with institutional tenant isolation:

| Role | Scope | Key Permissions & Constraints |
|---|---|---|
| **College User** (`COLLEGE_USER`) | Strictly Own Institution | Submit FDRs, upload documents, view scrutiny remarks, submit renewal instruments, request release, upload discharge evidence. Cross-institution access strictly blocked (`403 Forbidden`). |
| **AICTE Officer** (`AICTE_OFFICER`) | All Institutions | Scrutinize FDR submissions, document inspection, record verification decisions (Verified, Clarification Required, Discrepancy Detected, Rejected), grant Clearance A or Clearance B, issue statutory NOC, review discharge evidence. |
| **Workflow Approver** (`WORKFLOW_APPROVER`) | All Institutions | Independent senior authority responsible for Stage 3: Final Administrative Authorization and issuance/review stages. |
| **System Administrator** (`ADMIN`) | System-Wide | System governance, user account management, trigger scheduled maturity monitoring, inspect immutable audit history. Cannot bypass release clearance gates. |
| **Auditor** (`AUDITOR`) | System-Wide (Read-Only) | Observational oversight: inspect all institutional FDRs, renewal lineage, 7-stage release status, and tamper-evident audit logs. Mutating endpoints and upload actions strictly blocked (`403 Forbidden`). |

---

## 4. 7-Stage Release & Refund Pipeline

Release requests must advance through an immutable 7-stage gatekeeper pipeline:

```
[Stage 0: SUBMITTED]
       │
       ▼
[Stage 1: CLEARANCE_A_GRANTED]  (Reviewed by AICTE Officer 1)
       │
       ▼
[Stage 2: CLEARANCE_B_GRANTED]  (Reviewed by AICTE Officer 2 — Actor Separation Enforced)
       │
       ▼
[Stage 3: FINAL_AUTHORIZED]     (Authorized by Workflow Approver or Admin)
       │
       ▼
[Stage 4: NOC_ISSUED]           (Statutory NOC generated with dispatch tracking number)
       │
       ▼
[Stage 5: DISCHARGE_SUBMITTED]  (College User uploads physical bank discharge / encashment proof)
       │
       ▼
[Stage 6: COMPLETED]            (Final Officer review confirms closure; FDR marked RELEASED)
```

### Mandatory Security Invariants:
1. **Actor Separation on Clearance B:** `clearance_a_actor_id != clearance_b_actor_id`. If Officer 1 attempts to approve Clearance B on a case they already approved for Clearance A, the server rejects the request with `HTTP 403: Clearance B must be granted by a different officer than Clearance A for segregation of duties`.
2. **No Administrative Skip:** The system rejects attempts to approve Final Authorization or issue NOC before both Clearance A and Clearance B are verified in the database.
3. **Evidence Requirement:** Transitioning to `COMPLETED` requires verified discharge evidence reference in Stage 5.

---

## 5. Predecessor ↔ Successor Renewal Lineage

When an expiring FDR is renewed or replaced:
- The existing FDR is linked to the new replacement FDR via `renewed_into_fdr_id`.
- The new FDR links back via `predecessor_fdr_id`.
- **Successor-Aware Overdue Suppression:** The automated maturity engine checks `_has_active_successor()`. If a matured FDR has an active replacement instrument, overdue reminder generation is cleanly suppressed, eliminating false overdue alerts while preserving complete audit lineage.

---

## 6. Hackathon Demo Personas (1-Click Login)

The portal comes pre-seeded with realistic synthetic data across 4 institutions. Use the **1-Click Demo Persona Switcher** on the login page or top navigation bar:

| Persona | Role | Email | Password | Assigned Scope / Purpose |
|---|---|---|---|---|
| **College User** | `COLLEGE_USER` | `college@demo.aicte.gov.in` | `Demo@12345` | Delhi Institute of Technology & Science (ID: 1) |
| **AICTE Officer 1** | `AICTE_OFFICER` | `officer@demo.aicte.gov.in` | `Demo@12345` | First Scrutinizer / Clearance A Evaluator |
| **AICTE Officer 2** | `AICTE_OFFICER` | `officer2@demo.aicte.gov.in` | `Demo@12345` | Second Scrutinizer / Clearance B Evaluator (Actor Separation) |
| **Workflow Approver** | `WORKFLOW_APPROVER` | `approver@demo.aicte.gov.in` | `Demo@12345` | Final Authorization Authority |
| **Administrator** | `ADMIN` | `admin@demo.aicte.gov.in` | `Demo@12345` | AICTE ICT System Governance & Maturity Job Trigger |
| **Auditor** | `AUDITOR` | `auditor@demo.aicte.gov.in` | `Demo@12345` | Statutory Read-Only Observer |

---

## 7. Four-Minute Hackathon Demo Runbook

Follow this rapid, high-impact demonstration sequence:

### Minute 1: Institutional Portal & FDR Scrutiny (College User -> AICTE Officer 1)
1. Navigate to `http://localhost:5173`.
2. Click **"College User"** 1-click button.
   - Point out the persistent **Prototype & Synthetic Data Banner**.
   - Show the Institutional KPI summary and deposit portfolio.
   - Go to **"FDR Registry"** and open `FDR-DEL-2022-001`.
   - Show the distinction between **Institution Claims** vs **Official Documentary Verification**.
3. Use the navbar persona dropdown to switch to **"AICTE Officer"** (`officer@demo.aicte.gov.in`).
   - Open **"Scrutiny Queue"** -> Select `FDR-MUM-2023-003` (Clarification Required).
   - Show the documentary preview, verification remarks history, and action buttons (`Verified`, `Clarification Required`, `Discrepancy Detected`).

### Minute 2: Renewal Lineage & Successor-Aware Overdue Suppression
1. In the registry, open `FDR-BLR-2021-002` (Matured predecessor).
   - Highlight the **Renewal Lineage Card**: shows predecessor status linked to active successor `FDR-BLR-2026-005`.
   - Click the link to jump directly to the successor FDR.
2. Switch persona to **"Administrator"**.
   - Go to **"Admin Governance"** -> Click **"Execute Scheduled Job Now"**.
   - Show the terminal/modal log: `FDR-BLR-2021-002` is evaluated, its active successor is detected, and overdue notification is suppressed (`has_active_successor = True`).
   - Click it a second time: observe `reminders_sent: 0` (Idempotent execution).

### Minute 3: 7-Stage Release Pipeline & Mandatory Actor Separation
1. Navigate to **"Release Requests"**.
   - Select the pre-seeded release case for `FDR-PUN-2020-004` (currently at **Stage 2: Clearance B Granted**).
   - Point out the interactive **7-Stage Visual Pipeline Tracker** with timestamped milestone badges.
   - Scroll down to the **Audit Event History** showing Officer 1 granted Clearance A and Officer 2 granted Clearance B.
2. Demonstrate **Actor Separation Enforcement**:
   - Create a new release request as College User on `FDR-DEL-2022-001`.
   - Switch to **"AICTE Officer 1"** and approve **Clearance A**.
   - Attempt to immediately approve **Clearance B** with the same account: the interface disables the action and server returns `403 Forbidden: Clearance B must be granted by a different officer`.
   - Switch to **"AICTE Officer 2"** (`officer2@demo.aicte.gov.in`): now Clearance B succeeds.
3. Switch to **"Workflow Approver"** (`approver@demo.aicte.gov.in`):
   - Approve **Stage 3: Final Administrative Authorization**.
   - Issue **Stage 4: Statutory NOC** with dispatch reference `AICTE/NOC/2026/DEL-001`.
4. Switch to **"College User"**:
   - In **Stage 5: Discharge Evidence**, enter Bank Discharge Ref `SBI/DISCHARGE/2026/8841` and submit.
5. Switch back to **"AICTE Officer 1"**:
   - Verify discharge evidence and click **"Complete Workflow"**.
   - Status transitions to `COMPLETED` and underlying FDR is archived as `RELEASED`.

### Minute 4: Read-Only Auditor Mode & Security Boundaries
1. Switch persona to **"Auditor"** (`auditor@demo.aicte.gov.in`).
   - Notice the amber **Auditor Read-Only Observation Mode** indicator.
   - Navigate to FDRs, Releases, and Audit Trail: full visibility is preserved.
   - Notice all action buttons (`Submit New FDR`, `Scrutinize`, `Approve`, `Upload`) are disabled or hidden.
   - Any direct API POST/PUT attempt returns `403: Read-only access: Mutations are strictly forbidden for AUDITOR role`.
2. Inspect **"Audit Trail"**:
   - Show immutable ledger recording all persona transitions, stage milestones, and security checks with sanitized metadata.

---

## 8. Quick Start (Local Setup)

The application runs 100% locally on Windows, macOS, or Linux.

### Prerequisites
- Node.js (v18+) & npm
- Python (v3.10+)

### Launch Commands (Windows PowerShell)

```powershell
# 1. Start Backend (Terminal 1)
cd AICTE-FDR-portal\backend
python -m venv venv
.\venv\Scripts\pip.exe install -r requirements.txt
.\venv\Scripts\python.exe seed_demo.py
.\venv\Scripts\uvicorn.exe app.main:app --reload --host 127.0.0.1 --port 8000
# Backend is live at http://127.0.0.1:8000 (API Docs: http://127.0.0.1:8000/docs)

# 2. Start Frontend (Terminal 2)
cd AICTE-FDR-portal\frontend
npm install
npm run dev
# Frontend is live at http://localhost:5173
```

### One-Click Launch Script
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\run_local.ps1
```

---

## 9. Automated Test Verification (14 Scenarios)

The backend includes a comprehensive automated test suite verifying all statutory, security, and workflow rules:

```powershell
cd backend
python -m pytest tests/ -v
```

### Test Suite Execution Output:
```text
tests/test_fdr_portal.py::test_scenario_a_new_fdr_submission PASSED                     [  7%]
tests/test_fdr_portal.py::test_scenario_b_institution_isolation PASSED                  [ 14%]
tests/test_fdr_portal.py::test_scenario_c_officer_scrutiny PASSED                       [ 21%]
tests/test_fdr_portal.py::test_scenario_d_validation_rules PASSED                       [ 28%]
tests/test_fdr_portal.py::test_scenario_e_and_f_maturity_monitoring_idempotency PASSED [ 35%]
tests/test_fdr_portal.py::test_scenario_g_renewal_workflow PASSED                       [ 42%]
tests/test_fdr_portal.py::test_scenario_h_release_request PASSED                        [ 50%]
tests/test_fdr_portal.py::test_scenario_i_role_authorization_enforcement PASSED        [ 57%]
tests/test_fdr_portal.py::test_scenario_j_document_security_and_traversal PASSED        [ 64%]
tests/test_fdr_portal.py::test_scenario_k_audit_history PASSED                          [ 71%]
tests/test_fdr_portal.py::test_scenario_l_local_fallback PASSED                         [ 78%]
tests/test_fdr_portal.py::test_scenario_m_staged_release_and_actor_separation PASSED   [ 85%]
tests/test_fdr_portal.py::test_scenario_n_auditor_read_only_isolation PASSED           [ 92%]
tests/test_fdr_portal.py::test_scenario_o_admin_cannot_bypass_clearances PASSED         [100%]
================================== 14 passed in 52.63s ==================================
```

### Frontend Production Build Verification:
```powershell
cd frontend
npm run build
```
```text
✓ built in 1m 10s
dist/index.html                   0.98 kB │ gzip:   0.49 kB
dist/assets/index-D7hX8b1u.css   33.20 kB │ gzip:   6.15 kB
dist/assets/index-B9cZkX1w.js   492.12 kB │ gzip: 142.30 kB
```

---

## 10. Database Reset Utility

To reset the database back to its pristine synthetic state at any point:
```powershell
cd backend
python seed_demo.py
```
Or use the **"Reset Demo Records"** button in the web portal Settings page.

---

## 11. Architecture & Design Artifacts

- **Detailed Architecture Specification:** [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md)
- **Interactive Mermaid Flowcharts:** [`docs/PROTOTYPE_FLOWCHARTS.md`](./docs/PROTOTYPE_FLOWCHARTS.md)
  - Flowchart 1: System Architecture & Boundaries
  - Flowchart 2: FDR Lifecycle & Evidence-Aware Scrutiny State Machine
  - Flowchart 3: 7-Stage Release Pipeline with Mandatory Actor Separation
  - Flowchart 4: Successor-Aware Maturity Engine & Overdue Suppression
  - Flowchart 5: Five-Role Access Control & Security Invariants
- **AWS Infrastructure as Code:** [`infrastructure/main.tf`](./infrastructure/main.tf)
- **Render Cloud Deployment Blueprint:** [`render.yaml`](./render.yaml) & [`DEPLOY_RENDER.md`](./DEPLOY_RENDER.md)
