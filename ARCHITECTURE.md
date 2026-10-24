# DepositLedger: System Architecture & Design Specification

> For the comprehensive, detailed architecture specification with RBAC models, 7-stage release pipeline, and full state machine diagrams, see **[`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md)** and **[`docs/PROTOTYPE_FLOWCHARTS.md`](./docs/PROTOTYPE_FLOWCHARTS.md)**.

---

## 1. System Overview
**DepositLedger** digitizes and streamlines the statutory lifecycle management of security deposits and Fixed Deposit Receipts (FDRs) submitted by technical institutions to the **All India Council for Technical Education (AICTE)**.

## 2. Technology Stack & Deployment
1. **Frontend:** React 18, Vite, TypeScript, Tailwind CSS, Lucide React, Recharts, React Router v6.
   - Deployed on **Vercel** or **Render Static Sites**.
2. **Backend:** FastAPI (Python 3.11+), SQLAlchemy 2.0 ORM, Pydantic v2, Uvicorn.
   - Deployed on **Render Web Services** (`python run.py`).
3. **Database Tier:**
   - Production / Cloud: Render Managed PostgreSQL (`render.yaml`).
   - Local Development: Zero-setup SQLite (`aicte_fdr.db`).
4. **Storage Tier:**
   - Local private storage with anti-path-traversal verification (`uploads/`).

## 3. Five-Role Access Control (RBAC)
- **College User (`COLLEGE_USER`):** Own institution scope; submit FDRs, renewal lineage, release requests, and upload discharge proof. Anti-IDOR protected.
- **AICTE Officer (`AICTE_OFFICER`):** All institutions; review scrutiny queue, record observations, grant Clearance A or Clearance B.
- **Workflow Approver (`WORKFLOW_APPROVER`):** Senior authority for Stage 3: Final Administrative Authorization and NOC issuance.
- **System Administrator (`ADMIN`):** System governance, user account management, triggered scheduled maturity sweeps.
- **Auditor (`AUDITOR`):** Read-only observational oversight across all FDRs, releases, renewals, and immutable audit logs. Mutations strictly blocked (`403 Forbidden`).
