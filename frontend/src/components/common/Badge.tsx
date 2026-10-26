import React from 'react';

interface BadgeProps {
  status: string;
  type?: 'admin' | 'maturity' | 'role';
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<BadgeProps> = ({ status, type = 'admin', size = 'md' }) => {
  const s = status.toUpperCase();
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[10px] font-semibold' : 'px-2.5 py-1 text-xs font-semibold';

  // Role badges
  if (type === 'role') {
    if (s === 'ADMIN') {
      return <span className={`inline-flex items-center rounded-md bg-purple-50 text-purple-800 border border-purple-200 ${sizeClasses}`}>Administrator</span>;
    }
    if (s === 'AICTE_OFFICER') {
      return <span className={`inline-flex items-center rounded-md bg-blue-50 text-[#092D62] border border-blue-200 ${sizeClasses}`}>AICTE Officer</span>;
    }
    if (s === 'WORKFLOW_APPROVER') {
      return <span className={`inline-flex items-center rounded-md bg-amber-50 text-amber-900 border border-amber-200 ${sizeClasses}`}>Workflow Approver</span>;
    }
    if (s === 'AUDITOR') {
      return <span className={`inline-flex items-center rounded-md bg-amber-100 text-amber-950 border border-amber-300 ${sizeClasses}`}>Auditor (Read-Only)</span>;
    }
    return <span className={`inline-flex items-center rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 ${sizeClasses}`}>College User</span>;
  }

  // Maturity badges
  if (type === 'maturity') {
    if (s === 'MATURED') {
      return <span className={`inline-flex items-center rounded-full bg-red-50 text-red-700 border border-red-200 ${sizeClasses}`}>Matured (Overdue)</span>;
    }
    if (s === 'APPROACHING_MATURITY') {
      return <span className={`inline-flex items-center rounded-full bg-amber-50 text-amber-800 border border-amber-200 ${sizeClasses}`}>Approaching Maturity</span>;
    }
    return <span className={`inline-flex items-center rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 ${sizeClasses}`}>Active</span>;
  }

  // Administrative workflow badges
  switch (s) {
    case 'VERIFIED':
      return <span className={`inline-flex items-center rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 ${sizeClasses}`}>Verified</span>;
    case 'UNDER_REVIEW':
      return <span className={`inline-flex items-center rounded-full bg-blue-50 text-[#092D62] border border-blue-200 ${sizeClasses}`}>Under Scrutiny</span>;
    case 'SUBMITTED':
      return <span className={`inline-flex items-center rounded-full bg-slate-100 text-slate-800 border border-slate-200 ${sizeClasses}`}>Submitted</span>;
    case 'CLARIFICATION_REQUIRED':
      return <span className={`inline-flex items-center rounded-full bg-amber-50 text-amber-900 border border-amber-200 ${sizeClasses}`}>Clarification Required</span>;
    case 'DISCREPANCY_DETECTED':
      return <span className={`inline-flex items-center rounded-full bg-orange-50 text-orange-800 border border-orange-200 ${sizeClasses}`}>Discrepancy Detected</span>;
    case 'REJECTED':
      return <span className={`inline-flex items-center rounded-full bg-red-50 text-red-800 border border-red-200 ${sizeClasses}`}>Rejected</span>;
    case 'RENEWED':
    case 'RENEWAL_SUBMITTED':
      return <span className={`inline-flex items-center rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200 ${sizeClasses}`}>Renewed</span>;
    case 'RELEASE_APPROVED':
      return <span className={`inline-flex items-center rounded-full bg-teal-50 text-teal-800 border border-teal-200 ${sizeClasses}`}>Release Approved</span>;
    case 'CLEARANCE_A_GRANTED':
      return <span className={`inline-flex items-center rounded-full bg-blue-50 text-blue-800 border border-blue-200 ${sizeClasses}`}>Clearance A Granted</span>;
    case 'CLEARANCE_B_GRANTED':
      return <span className={`inline-flex items-center rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200 ${sizeClasses}`}>Clearance B Granted</span>;
    case 'FINAL_AUTHORIZED':
      return <span className={`inline-flex items-center rounded-full bg-purple-50 text-purple-800 border border-purple-200 ${sizeClasses}`}>Final Authorized</span>;
    case 'NOC_ISSUED':
      return <span className={`inline-flex items-center rounded-full bg-teal-50 text-teal-800 border border-teal-200 ${sizeClasses}`}>NOC Issued</span>;
    case 'DISCHARGE_SUBMITTED':
      return <span className={`inline-flex items-center rounded-full bg-amber-50 text-amber-800 border border-amber-200 ${sizeClasses}`}>Discharge Submitted</span>;
    case 'COMPLETED':
    case 'RELEASED':
      return <span className={`inline-flex items-center rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 ${sizeClasses}`}>Completed</span>;
    default:
      return <span className={`inline-flex items-center rounded-full bg-slate-100 text-slate-800 border border-slate-200 ${sizeClasses}`}>{status}</span>;
  }
};
