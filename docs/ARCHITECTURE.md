# VajraKosh — System Architecture & Technical Specifications

> **SIH 2026 Problem Statement ID: 26265**  
> *Streamline of Security Deposit / Fixed Deposit Receipt (FDR) Portal for Technical Institutions*  
> **DISCLAIMER: PROTOTYPE · SYNTHETIC DATA · NO LIVE BANK CONNECTION · NO ACTUAL FUNDS TRANSFER**

---

## 1. System Overview

VajraKosh is a centralized, institutional fixed deposit receipt (FDR) custody and regulatory compliance management platform built for AICTE. It digitizes the entire lifecycle of security deposits—from initial submission and manual documentary scrutiny to automated maturity tracking, successor-aware renewals, and multi-stage administrative lien release.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        React 18 + TypeScript UI                        │
│   (Vite, Tailwind CSS, Lucide Icons, Recharts, Responsive Dashboard)   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ REST / JSON (JWT Bearer Auth)
┌───────────────────────────────────▼────────────────────────────────────┐
│                       FastAPI Backend Service                          │
│  ├── /api/v1/auth          (RBAC, Token Issuance, Demo Personas)       │
│  ├── /api/v1/fdrs          (FDR Ingestion, Scrutiny, Details, Tenant)  │
│  ├── /api/v1/documents     (Custodial Docs, Safe Storage Keys, Upload) │
│  ├── /api/v1/renewals      (Predecessor-Successor Renewal Lineage)     │
│  ├── /api/v1/releases      (7-Stage Gatekeeper Lien Release Pipeline)  │
│  ├── /api/v1/dashboard     (Institution, Officer, Admin Metrics)       │
│  ├── /api/v1/notifications (Idempotent 30/15/7/0 Day Alerts)           │
│  └── /api/v1/audit         (Audit Logs, SHA-256 Metadata Traceability) │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ SQLAlchemy 2.0 ORM
┌───────────────────────────────────▼────────────────────────────────────┐
│                    Persistence & Storage Layer                         │
│  ├── SQLite / PostgreSQL (Relational Data, Strict Foreign Keys)         │
│  ├── Local Encrypted FS / AWS S3 Fallback (PDF/Image Receipts)         │
│  └── In-Memory / Local Simulated Notification Service                  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Role-Based Access Control (RBAC) Matrix

VajraKosh enforces server-side authorization on every endpoint. Hiding UI elements is treated purely as user experience, never as security.

| Role | Read Scope | FDR Submit | Scrutiny | Clearance A | Clearance B | Final Auth | Issue NOC | Discharge Evidence | Manage Users |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **COLLEGE_USER** (Institution) | Own Institution Only | Yes | No | No | No | No | No | Upload Only | No |
| **AICTE_OFFICER** (Scrutiny) | All Institutions | No | Yes | Yes | Yes (Separate Actor) | No | Yes | Review Only | No |
| **WORKFLOW_APPROVER** (Approver) | All Institutions | No | Yes | Yes | Yes (Separate Actor) | Yes | Yes | Review Only | No |
| **ADMIN** (System Admin) | All Institutions | Yes | Yes | Yes | Yes | Yes | Yes | Review Only | Yes |
| **AUDITOR** (Read-Only) | All Institutions (Read) | **No** | **No** | **No** | **No** | **No** | **No** | **No** | **No** |

### Key Authorization Principles
1. **Auditor Read-Only Guard (`require_not_read_only`)**: Intercepts any mutating HTTP method (`POST`, `PUT`, `DELETE`) executed by an `AUDITOR` token and rejects with HTTP 403 Forbidden.
2. **Institution Tenant Isolation (`verify_institution_access`)**: College users are strictly pinned to their `institution_id`. Any attempt to access or modify another institution's FDR, document, renewal, or release by ID manipulation yields HTTP 403.
3. **Actor Separation Enforcement**: In the release workflow, the officer user ID that granted `Clearance A` is strictly prohibited from granting `Clearance B` on the same case. Fewer role types never collapse gates.
4. **Admin Non-Bypass Rule**: Administrators cannot bypass required lifecycle gates (e.g. attempting Final Authorization before Clearance A and B are recorded is blocked with HTTP 400).

---

## 3. Data Entities & Relational Schema

- **Institution**: AICTE permanent approval code, legal title, institutional category, location, contact details.
- **User**: Name, email, hashed credentials (bcrypt), role, foreign key to institution (null for AICTE officials).
- **FDRRecord**: FDR reference number, issuing bank, branch location, deposit amount, currency, issue date, maturity date, deposit category, administrative status, maturity status, verification status, scrutiny remarks, predecessor link (`original_fdr_id`).
- **Document**: Storage provider (`LOCAL` or `S3`), secure storage key, original filename, MIME type, byte size, parent `fdr_id`.
- **VerificationRecord**: Reviewer ID, verification method (`MANUAL_SCRUTINY`, `DISCREPANCY_DETECTED`), outcome, formal observations, supporting reference.
- **RenewalRecord**: Predecessor FDR link, successor FDR link, submission date, status, renewal remarks.
- **ReleaseRequest**: FDR link, requesting institution, statutory reason, status, stage actor IDs and timestamps for Clearance A, Clearance B, Final Authorization, NOC, Discharge, and Completion.
- **ReleaseStageEvent**: Immutable audit entry recorded per release stage transition (stage name, actor ID, email, decision, reason, evidence reference, timestamp).
- **Notification**: Recipient user ID, FDR reference, alert category (`MATURITY_ALERT`, `SCRUTINY_UPDATE`, `RELEASE_UPDATE`), message body, due date, idempotency interval key.
- **AuditLog**: Actor ID, actor email, action code, entity type, entity ID, result (`SUCCESS` / `FAILURE`), metadata JSON, client IP.

---

## 4. Key Business Logic Implementations

### A. Predecessor ↔ Successor Renewal Lineage
- Renewals create a new successor FDR instrument linked to its predecessor via `original_fdr_id`.
- History, historical documents, and prior scrutiny records of the predecessor are permanently preserved.
- Cycle prevention: Self-linkage (`fdr_id == original_fdr_id`) and cross-institution linkage are strictly prohibited.

### B. Successor-Aware Maturity & Idempotent Reminders
- Scheduled maturity checks evaluate deposit instruments at 30, 15, 7, and 0 days prior to maturity, as well as overdue instruments.
- **Successor-Aware Suppression**: An overdue predecessor that has an active successor renewal instrument submitted or approved is suppressed from being flagged as unrenewed-overdue.
- **Idempotency Key**: Reminders construct deterministic keys in format `FDR_{fdr_id}_MATURITY_{interval}_{date}_USER_{user_id}` preventing duplicate dispatch on repeated daily runs.

### C. Staged Lien Release Pipeline
The 7 discrete gates are:
1. `SUBMITTED`: Institution submits grounds (e.g., 10-year statutory completion).
2. `CLEARANCE_A`: Officer 1 verifies regional records and zero student liabilities.
3. `CLEARANCE_B`: Independent Officer 2 conducts second scrutiny (Actor Separation enforced).
4. `FINAL_AUTH`: Workflow Approver or Admin sanctions formal administrative authorization.
5. `NOC_ISSUED`: Formal No Objection Certificate reference generated and issued.
6. `DISCHARGE_EVIDENCE`: Bank lien discharge cancellation voucher uploaded and verified.
7. `COMPLETED`: Portal lifecycle closed and logged.

---

## 5. Prototype vs. Live Integration Disclosure

| Feature | Current Prototype Implementation | Live Production Integration (Future Scope) |
| :--- | :--- | :--- |
| **Bank Verification** | Manual officer scrutiny of uploaded scanned receipts; documentary discrepancy detection. | SFTP / Open Banking API integration with SBI/nationalized banks for automated lien query. |
| **Fund Transfer** | **None.** Purely records administrative lien release decisions. | Core Banking System (CBS) / PFMS electronic payment gateway. |
| **Cloud Storage** | Local directory storage with path traversal protection and secure filename hashing; S3 fallback stub. | Encrypted AWS S3 bucket with KMS SSE and automated ClamAV antivirus scanning. |
| **Authentication** | Local JWT with bcrypt hashing; AWS Cognito verification fallback stub. | Government Single Sign-On (Jan Parichay / MeriPehchaan) or enterprise AICTE SSO. |
| **Audit Logs** | Relational database append-only table with actor ID, timestamp, and JSON metadata. | Write-Once-Read-Many (WORM) storage or cryptographic ledger for tamper-evident retention. |

---

## 6. Startup Commands

### Backend Startup (FastAPI)
```bash
cd backend
python -m venv venv
venv\Scripts\activate       # On Windows
pip install -r requirements.txt
python seed_demo.py          # Seeds 4 institutions, 7 users, 7 FDRs, and pre-seeded release case
python run.py                # Starts API on http://localhost:10000
```

### Frontend Startup (React + Vite)
```bash
cd frontend
npm install
npm run dev                  # Starts UI on http://localhost:5173
# For production build verification:
npm run build
```
