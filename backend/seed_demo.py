"""
VajraKosh - SIH 2026 PS 26265
Synthetic Demo Database Reset & Seeding Utility

Resets the local prototype SQLite database and re-seeds deterministic synthetic records.
DISCLAIMER: Prototype Environment. Synthetic Data. No live bank connection. No actual funds transfer.
"""
import os
import sys
from app.db.session import engine, Base, SessionLocal
from app.db.init_db import init_db

def reset_and_seed():
    print("================================================================================")
    print(" VajraKosh - AICTE FDR Portal: Deterministic Synthetic Demo Seeder")
    print(" PS 26265 - SIH 2026 Prototype Evaluation")
    print("================================================================================")
    
    # Drop and recreate schema
    print("[1/3] Resetting database tables...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    
    # Seed data
    print("[2/3] Seeding realistic synthetic records across 4 institutions and 5 roles...")
    db = SessionLocal()
    try:
        init_db(db)
        print("[3/3] Demo seeding complete!")
    finally:
        db.close()
        
    print("\n--------------------------------------------------------------------------------")
    print(" DEMO PERSONAS AVAILABLE (Password for all: Demo@12345):")
    print("   1. Institution User:    college@demo.aicte.gov.in (Delhi Tech - submit/renewal/release)")
    print("   2. Institution User 2:  college2@demo.aicte.gov.in (Bangalore Engg - pre-seeded release)")
    print("   3. AICTE Officer 1:     officer@demo.aicte.gov.in (Scrutiny & Clearance A)")
    print("   4. AICTE Officer 2:     officer2@demo.aicte.gov.in (Clearance B - Actor Separation)")
    print("   5. Workflow Approver:   approver@demo.aicte.gov.in (Final Sanction & Gatekeeper)")
    print("   6. System Admin:        admin@demo.aicte.gov.in (Governance & Audit)")
    print("   7. Internal Auditor:    auditor@demo.aicte.gov.in (Read-Only Compliance Observer)")
    print("--------------------------------------------------------------------------------")
    print(" PRE-SEEDED DEMO SCENARIOS:")
    print("   A. Active FDR:                SBI-FDR-2024-8921 (Delhi Tech, healthy, 180 days to maturity)")
    print("   B. Approaching Maturity:      PNB-SEC-7749102 (15 days remaining, triggers automated notice)")
    print("   C. Overdue with Successor:    CAN-CORPUS-449182 (Overdue suppressed by active successor)")
    print("   D. Successor Renewal FDR:     CAN-CORPUS-449182-RENEW-2026 (Linked replacement instrument)")
    print("   E. Documentary Discrepancy:   HDFC-DEP-1029384 (Clarification Required - smudged bank seal)")
    print("   F. Staged Release Pipeline:   IOB-TECH-552810 (Clearance A & B granted, ready for Approver)")
    print("================================================================================\n")

if __name__ == "__main__":
    reset_and_seed()
