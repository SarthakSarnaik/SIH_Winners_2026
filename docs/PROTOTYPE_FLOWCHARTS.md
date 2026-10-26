# VajraKosh — Prototype Flowcharts & State Machines

> **SIH 2026 Problem Statement ID: 26265**  
> *Editable Mermaid Flowcharts Matching Implemented and Tested Code*  
> **DISCLAIMER: PROTOTYPE · SYNTHETIC DATA · NO LIVE BANK CONNECTION · NO ACTUAL FUNDS TRANSFER**

---

## 1. High-Level System Architecture

```mermaid
graph TD
    Client["React 18 + TypeScript Client\n(Vite Dev Server :5173 / Production Dist)"]
    API["FastAPI Backend REST Service\n(Uvicorn :10000)"]
    DB[("SQLite / PostgreSQL\n(SQLAlchemy 2.0 ORM)")]
    Storage[("Custodial Storage\n(Local Encrypted / AWS S3)")]
    AuditLog[("Audit Trail\n(Append-Only Log)")]

    Client -->|"JWT Bearer Auth\nREST Requests"| API
    API -->|"Role Checks & Tenant Isolation"| API
    API -->|"CRUD Queries & State Updates"| DB
    API -->|"Encrypted File Key Storage"| Storage
    API -->|"Actor, Action, Timestamp, Metadata"| AuditLog
```

---

## 2. FDR Lifecycle & Scrutiny State Machine

```mermaid
stateDiagram-v2
    [*] --> SUBMITTED : College Submits FDR & Scanned PDF
    
    SUBMITTED --> UNDER_REVIEW : AICTE Officer Opens Scrutiny Queue
    
    state UNDER_REVIEW {
        [*] --> CheckDocumentaryDetails
        CheckDocumentaryDetails --> CheckLienEndorsement
        CheckLienEndorsement --> CheckBankSealStamp
    }
    
    UNDER_REVIEW --> CLARIFICATION_REQUIRED : Smudged Seal / Discrepancy Found
    CLARIFICATION_REQUIRED --> SUBMITTED : College Uploads Corrected Document
    
    UNDER_REVIEW --> REJECTED : Fraudulent / Invalid Instrument
    REJECTED --> [*]
    
    UNDER_REVIEW --> VERIFIED : Officer Confirms Compliant Format
    
    VERIFIED --> ACTIVE : Registered in Official Custody
    
    ACTIVE --> APPROACHING_MATURITY : <= 30 Days Remaining
    
    APPROACHING_MATURITY --> MATURED : Maturity Date Reached
    
    MATURED --> RENEWAL_SUBMITTED : College Submits Successor FDR
    MATURED --> RELEASE_REQUESTED : College Requests Security Deposit Release
    
    RENEWAL_SUBMITTED --> VERIFIED : Successor FDR Scrutinized & Approved
    RELEASE_REQUESTED --> RELEASE_COMPLETED : All 7 Release Gates Cleared
    
    RELEASE_COMPLETED --> [*]
```

---

## 3. Seven-Stage Release & Refund Gatekeeper Pipeline

```mermaid
flowchart TD
    Start([Institution Requests Release]) --> Gate1["Stage 1: Request Submission\n(Tenure completed, zero liability claim)"]
    
    Gate1 --> Gate2{"Stage 2: Clearance A\n(AICTE Officer 1)"}
    Gate2 -->|Clarification| Gate1
    Gate2 -->|Reject| Rejected([Release Rejected])
    Gate2 -->|Grant| Gate3{"Stage 3: Clearance B\n(AICTE Officer 2)"}
    
    subgraph ActorSeparation ["Mandatory Actor Separation"]
        Gate3 -.->|"Prohibited: Same Actor ID as Officer 1"| ErrorSameActor["403 Forbidden\nActor Separation Enforced"]
    end
    
    Gate3 -->|Reject| Rejected
    Gate3 -->|Grant| Gate4{"Stage 4: Final Authorization\n(Workflow Approver / Admin)"}
    
    Gate4 -->|Reject| Rejected
    Gate4 -->|Authorize| Gate5["Stage 5: Official NOC Issuance\n(NOC Reference Number Generated)"]
    
    Gate5 --> Gate6["Stage 6: Discharge Evidence\n(Bank Lien Cancellation Receipt Uploaded)"]
    
    Gate6 --> Gate6Review{"Stage 6b: Discharge Review\n(AICTE Officer Verification)"}
    Gate6Review -->|Reject| Gate6
    Gate6Review -->|Accept| Gate7["Stage 7: Workflow Completion\n(VajraKosh Process Closed)"]
    
    Gate7 --> End([Complete Lifecycle Logged in Audit Trail])
```

---

## 4. Successor-Aware Maturity & Idempotent Reminder Engine

```mermaid
flowchart TD
    CronJob(["Scheduled Daily Check / Manual Trigger"]) --> LoopFDRs["Iterate over all active/matured FDRs"]
    
    LoopFDRs --> CalcDays["Calculate days_remaining = maturity_date - today"]
    
    CalcDays --> CheckInterval{"days_remaining in\n[30, 15, 7, 0, <0]?"}
    CheckInterval -->|No| Skip["Skip instrument (no reminder today)"]
    
    CheckInterval -->|Overdue| CheckSuccessor{"Has Active Successor FDR\n(submitted/approved)?"}
    
    CheckSuccessor -->|Yes| SuppressOverdue["SUPPRESS Overdue Alert\n(Successor-Aware: Prevents false alarm)"]
    CheckSuccessor -->|No| GenKey["Construct Idempotency Key:\nFDR_{id}_MATURITY_{interval}_{date}_USER_{uid}"]
    
    CheckInterval -->|30, 15, 7, 0 Days| GenKey
    
    GenKey --> CheckDB{"Reminder Key\nAlready Exists in DB?"}
    CheckDB -->|Yes| SkipDuplicate["Deduplicate: Do Not Send Duplicate Notice"]
    CheckDB -->|No| SendNotice["Dispatch Notification & Record Reminder Key"]
```

---

## 5. Four-Role Matrix & Tenant Boundary Enforcement

```mermaid
flowchart LR
    subgraph InstitutionUsers ["Institution Boundary (Tenant Isolation)"]
        College1["College User (Inst 1)"]
        College2["College User (Inst 2)"]
    end

    subgraph ServerAuth ["Authoritative Backend Security Checks"]
        VerifyTenant["verify_institution_access()\nPins College users to their own institution_id"]
        RequireRoles["require_roles()\nEnforces server-side permissions"]
        ReadOnlyGuard["require_not_read_only()\nBlocks mutating actions for AUDITOR"]
    end

    subgraph AICTEUsers ["Regulatory & Governance Boundary"]
        Officer1["AICTE Scrutiny Officer 1"]
        Officer2["AICTE Scrutiny Officer 2 (Clearance B)"]
        Approver["Workflow Approver (Final Auth)"]
        Admin["System Administrator"]
        Auditor["Internal Auditor (Read-Only)"]
    end

    College1 -->|"Access Inst 1 Data"| VerifyTenant
    College1 -.->|"Try Access Inst 2 Data"| Denied1["403 Forbidden\nAccess Denied"]
    
    Auditor -->|"Read All FDRs & Audits"| RequireRoles
    Auditor -.->|"Try POST / PUT / DELETE"| ReadOnlyGuard --> Denied2["403 Forbidden\nRead-Only Access"]
    
    Officer1 -->|"Grant Clearance A"| RequireRoles
    Officer1 -.->|"Try Clearance B on Same Case"| Denied3["400/403 Actor Separation Violation"]
    
    Admin -.->|"Try Final Auth before Clearances"| Denied4["400 Bad Request\nGates Cannot Be Bypassed"]
```
