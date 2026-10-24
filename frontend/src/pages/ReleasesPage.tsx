import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  ArrowUpRight,
  PlusCircle,
  FileText,
  Building2,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Clock,
  ShieldCheck,
  CheckSquare,
  ChevronRight,
  Lock,
  Upload,
  ExternalLink,
  Info
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { ReleaseRequest, FDRRecord, ReleaseStageEvent } from '../types';
import { StatusBadge } from '../components/common/Badge';

const STAGES = [
  { key: 'SUBMITTED', label: '1. Request', desc: 'Institution Grounds' },
  { key: 'CLEARANCE_A', label: '2. Clearance A', desc: 'Regional Dues Check' },
  { key: 'CLEARANCE_B', label: '3. Clearance B', desc: 'Independent Officer' },
  { key: 'FINAL_AUTHORIZATION', label: '4. Final Auth', desc: 'Approver Sign-off' },
  { key: 'NOC_ISSUED', label: '5. NOC Issued', desc: 'Administrative NOC' },
  { key: 'DISCHARGE_EVIDENCE', label: '6. Discharge', desc: 'Bank Lien Evidence' },
  { key: 'COMPLETED', label: '7. Complete', desc: 'Portal Lifecycle Closed' },
];

export const ReleasesPage: React.FC = () => {
  const { user, role } = useAuth();
  const [searchParams] = useSearchParams();
  const preselectedFdrId = searchParams.get('fdr_id');

  const [requests, setRequests] = useState<ReleaseRequest[]>([]);
  const [eligibleFdrs, setEligibleFdrs] = useState<FDRRecord[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(!!preselectedFdrId);

  // New Request Form
  const [fdrId, setFdrId] = useState<string>(preselectedFdrId || '');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Staged Workflow Modal
  const [activeWorkflowReq, setActiveWorkflowReq] = useState<ReleaseRequest | null>(null);
  const [stageEvents, setStageEvents] = useState<ReleaseStageEvent[]>([]);
  const [isLoadingStages, setIsLoadingStages] = useState(false);

  // Stage Action Form
  const [stageDecision, setStageDecision] = useState<string>('GRANTED');
  const [stageReason, setStageReason] = useState<string>('');
  const [evidenceRef, setEvidenceRef] = useState<string>('');
  const [isExecutingStage, setIsExecutingStage] = useState(false);

  const [isLoading, setIsLoading] = useState(true);

  const fetchReleaseData = async () => {
    try {
      setIsLoading(true);
      const [reqData, fdrData] = await Promise.all([
        api.get<ReleaseRequest[]>('/releases'),
        api.get<FDRRecord[]>('/fdrs')
      ]);
      setRequests(reqData);
      setEligibleFdrs(fdrData);
    } catch (err) {
      console.error('Error fetching release requests:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReleaseData();
  }, []);

  const openWorkflowModal = async (req: ReleaseRequest) => {
    setActiveWorkflowReq(req);
    setError(null);
    setSuccessMsg(null);
    setStageReason('');
    setEvidenceRef('');
    setIsLoadingStages(true);

    try {
      const events = await api.get<ReleaseStageEvent[]>(`/releases/${req.id}/stages`);
      setStageEvents(events);
    } catch (err) {
      console.error('Failed to load stage events:', err);
      setStageEvents(req.stage_events || []);
    } finally {
      setIsLoadingStages(false);
    }
  };

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fdrId) {
      setError('Please select an FDR record to request release for.');
      return;
    }
    if (reason.trim().length < 10) {
      setError('Please provide a substantive justification (at least 10 characters).');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await api.post('/releases', {
        fdr_id: parseInt(fdrId),
        reason: reason.trim(),
      });
      setShowCreateModal(false);
      setReason('');
      setFdrId('');
      await fetchReleaseData();
      setSuccessMsg('Release request submitted successfully into staged scrutiny pipeline.');
    } catch (err: any) {
      setError(err.message || 'Failed to submit release request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExecuteStageAction = async (endpoint: string, defaultDecision: string = 'GRANTED') => {
    if (!activeWorkflowReq) return;
    if (stageReason.trim().length < 5) {
      setError('Mandatory scrutiny reason/remarks required (at least 5 characters).');
      return;
    }

    setIsExecutingStage(true);
    setError(null);
    try {
      const updatedReq = await api.post<ReleaseRequest>(`/releases/${activeWorkflowReq.id}/stages/${endpoint}`, {
        decision: stageDecision || defaultDecision,
        reason: stageReason.trim(),
        evidence_reference: evidenceRef.trim() || undefined,
      });

      setActiveWorkflowReq(updatedReq);
      setStageReason('');
      setEvidenceRef('');
      setSuccessMsg(`Stage action recorded successfully.`);

      // Refresh events
      const events = await api.get<ReleaseStageEvent[]>(`/releases/${activeWorkflowReq.id}/stages`);
      setStageEvents(events);

      // Refresh table
      await fetchReleaseData();
    } catch (err: any) {
      setError(err.message || 'Stage execution failed.');
    } finally {
      setIsExecutingStage(false);
    }
  };

  // Helper to determine stage status
  const getStageStatus = (req: ReleaseRequest, stageIndex: number) => {
    const statusMap: Record<string, number> = {
      SUBMITTED: 1,
      CLEARANCE_A_GRANTED: 2,
      CLEARANCE_B_GRANTED: 3,
      AUTHORIZED: 4,
      NOC_ISSUED: 5,
      DISCHARGE_SUBMITTED: 6,
      DISCHARGE_VERIFIED: 6,
      COMPLETED: 7,
      REJECTED: -1,
      CLARIFICATION_REQUIRED: 0
    };

    const currentLevel = statusMap[req.status] ?? 0;
    if (currentLevel === -1) return 'rejected';
    if (stageIndex < currentLevel) return 'completed';
    if (stageIndex === currentLevel) return 'current';
    return 'pending';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-teal-700 uppercase tracking-wider mb-1">
            <ArrowUpRight className="h-4 w-4" />
            <span>Multi-Stage Staged Release & Refund Workflow</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">Security Deposit Release / Refund Pipeline</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Strict gatekeeping: Clearance A & B (separate actors), Final Authorization, NOC, Discharge Evidence & Closure.
          </p>
        </div>

        {role === 'COLLEGE_USER' && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-teal-800 hover:bg-teal-700 text-white text-xs font-semibold shadow-sm transition-all"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Request Deposit Release</span>
          </button>
        )}
      </div>

      {/* Statutory Disclaimers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 flex items-start gap-3 text-amber-900">
          <ShieldCheck className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">No Live Bank Connection & No Direct Fund Transfers:</span> Portal records AICTE administrative lien clearance and authorization. Electronic bank fund transfers are executed through external banking mechanisms.
          </div>
        </div>

        <div className="p-3.5 bg-blue-50 rounded-xl border border-blue-200 flex items-start gap-3 text-blue-900">
          <Info className="h-4 w-4 text-blue-700 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Mandatory Actor Separation Enforced:</span> Clearance A and Clearance B cannot be granted by the same officer user ID. Fewer role types never collapses gates.
          </div>
        </div>
      </div>

      {successMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-600 hover:text-emerald-800 font-bold">×</button>
        </div>
      )}

      {/* Main Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-500 text-xs">Loading Release Requests...</div>
        ) : requests.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs space-y-2">
            <ArrowUpRight className="h-8 w-8 text-slate-400 mx-auto" />
            <p className="font-semibold text-slate-700">No Release Requests Found</p>
            <p className="text-slate-400">Applications for deposit closure or lien release will appear here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 font-semibold">FDR Ref #</th>
                  {role !== 'COLLEGE_USER' && (
                    <th className="py-3 px-4 font-semibold">Institution</th>
                  )}
                  <th className="py-3 px-4 font-semibold">Amount</th>
                  <th className="py-3 px-4 font-semibold">Staged Pipeline Status</th>
                  <th className="py-3 px-4 font-semibold">Latest Remarks</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {requests.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{r.fdr_number}</div>
                      <div className="text-[10px] text-slate-400">Release Case #{r.id}</div>
                    </td>

                    {role !== 'COLLEGE_USER' && (
                      <td className="py-3 px-4 font-medium text-slate-800">
                        {r.institution_name}
                      </td>
                    )}

                    <td className="py-3 px-4 font-bold text-slate-900">
                      ₹{(r.amount || 0).toLocaleString('en-IN')}
                    </td>

                    <td className="py-3 px-4">
                      <div className="space-y-1">
                        <StatusBadge status={r.status} />
                        <div className="text-[10px] text-slate-500">
                          {r.status === 'CLEARANCE_A_GRANTED' && 'Awaiting Clearance B (Officer 2)'}
                          {r.status === 'CLEARANCE_B_GRANTED' && 'Awaiting Final Authorization (Approver)'}
                          {r.status === 'AUTHORIZED' && 'Awaiting Official NOC Issuance'}
                          {r.status === 'NOC_ISSUED' && 'Awaiting Discharge Evidence from Bank/College'}
                          {r.status === 'DISCHARGE_SUBMITTED' && 'Discharge Evidence Under Officer Review'}
                          {r.status === 'COMPLETED' && '✓ Release Process Fully Completed'}
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-slate-600 max-w-xs truncate">
                      {r.remarks || r.reason}
                    </td>

                    <td className="py-3 px-4 text-right space-x-2">
                      <button
                        onClick={() => openWorkflowModal(r)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-teal-800 text-white font-semibold text-xs hover:bg-teal-700 shadow-sm"
                      >
                        <CheckSquare className="h-3.5 w-3.5" />
                        <span>Workflow Pipeline</span>
                      </button>
                      <Link
                        to={`/fdrs/${r.fdr_id}`}
                        className="text-xs text-aicte-navy-700 font-semibold hover:underline"
                      >
                        FDR Detail
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* College Submit Release Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Initiate Security Deposit Release</h3>
                <p className="text-xs text-slate-500">Submits request into mandatory multi-stage administrative clearance.</p>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600 text-lg font-bold">×</button>
            </div>

            {error && (
              <div className="p-3 bg-red-50 text-red-800 rounded-lg text-xs">{error}</div>
            )}

            <form onSubmit={handleCreateRequest} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Select FDR for Release *</label>
                <select
                  value={fdrId}
                  onChange={(e) => setFdrId(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white focus:outline-none"
                >
                  <option value="">-- Choose FDR Record --</option>
                  {eligibleFdrs.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.fdr_number} (₹{f.amount.toLocaleString('en-IN')} at {f.bank_name})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Grounds / Reason for Release *</label>
                <textarea
                  rows={4}
                  required
                  placeholder="State the statutory grounds: e.g. Completion of mandatory 10-year term with zero student liabilities, or voluntary program closure..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-2 border border-slate-300 rounded-lg text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-teal-800 text-white rounded-lg font-semibold hover:bg-teal-700 disabled:opacity-50"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Official Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Staged Workflow Details & Action Modal */}
      {activeWorkflowReq && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full p-6 border border-slate-200 space-y-6 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-teal-800 uppercase tracking-wider">Release Case #{activeWorkflowReq.id}</span>
                  <StatusBadge status={activeWorkflowReq.status} />
                </div>
                <h2 className="text-base font-bold text-slate-900 mt-1">
                  {activeWorkflowReq.fdr_number} • ₹{(activeWorkflowReq.amount || 0).toLocaleString('en-IN')}
                </h2>
                <p className="text-xs text-slate-500">
                  Institution: {activeWorkflowReq.institution_name} • Requester: {activeWorkflowReq.requester_name || 'College Representative'}
                </p>
              </div>
              <button onClick={() => setActiveWorkflowReq(null)} className="text-slate-400 hover:text-slate-600 text-2xl font-bold">×</button>
            </div>

            {error && <div className="p-3 bg-red-50 text-red-800 rounded-lg text-xs">{error}</div>}

            {/* 7-Stage Visual Stepper */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="text-xs font-semibold text-slate-700 mb-3 flex items-center justify-between">
                <span>Staged Release Gatekeeper Progression</span>
                <span className="text-[10px] text-slate-400">Statutory Gates are Never Collapsed</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
                {STAGES.map((s, idx) => {
                  const st = getStageStatus(activeWorkflowReq, idx + 1);
                  return (
                    <div
                      key={s.key}
                      className={`p-2 rounded-lg text-center border transition-all ${
                        st === 'completed'
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-semibold'
                          : st === 'current'
                          ? 'bg-amber-100 border-amber-400 text-amber-950 font-bold ring-2 ring-amber-400/40'
                          : st === 'rejected'
                          ? 'bg-red-50 border-red-300 text-red-800'
                          : 'bg-white border-slate-200 text-slate-400'
                      }`}
                    >
                      <div className="text-[11px] truncate">{s.label}</div>
                      <div className="text-[9px] mt-0.5 truncate opacity-80">{s.desc}</div>
                      <div className="mt-1 text-[10px]">
                        {st === 'completed' && <span className="text-emerald-600 font-bold">✓ Pass</span>}
                        {st === 'current' && <span className="text-amber-700 font-bold">● Active</span>}
                        {st === 'pending' && <span className="text-slate-400">Pending</span>}
                        {st === 'rejected' && <span className="text-red-600 font-bold">✗ Rejected</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recorded Stage Events Audit Timeline */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-teal-700" />
                <span>Recorded Stage Events (Immutable Audit Log)</span>
              </h3>

              {isLoadingStages ? (
                <div className="text-xs text-slate-400 p-4 text-center">Loading audit events...</div>
              ) : stageEvents.length === 0 ? (
                <div className="text-xs text-slate-400 p-3 bg-slate-50 rounded-lg">No stage events recorded yet.</div>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white text-xs">
                  {stageEvents.map((ev) => (
                    <div key={ev.id} className="p-3 hover:bg-slate-50/60">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{ev.stage_name}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            ev.decision === 'GRANTED' || ev.decision === 'AUTHORIZED' || ev.decision === 'ISSUED' || ev.decision === 'COMPLETED' || ev.decision === 'ACCEPTED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : ev.decision === 'REJECTED'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {ev.decision}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {new Date(ev.created_at).toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-600 mt-1">
                        <span className="font-semibold text-slate-700">Actor:</span> {ev.actor_email || `User #${ev.actor_id}`}
                      </div>
                      {ev.reason && (
                        <div className="text-slate-600 mt-1 bg-slate-50 p-2 rounded border border-slate-100 italic">
                          "{ev.reason}"
                        </div>
                      )}
                      {ev.evidence_reference && (
                        <div className="text-[10px] text-teal-800 font-semibold mt-1">
                          Ref: {ev.evidence_reference}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Current Stage Action Execution Panel */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Next Gate Action: {activeWorkflowReq.status}
                </span>
                <span className="text-[10px] font-semibold text-slate-500">
                  Current User Role: <code className="text-teal-800 bg-teal-50 px-1 py-0.5 rounded">{role}</code>
                </span>
              </div>

              {/* STAGE 2: Clearance A */}
              {activeWorkflowReq.status === 'SUBMITTED' && (
                <div className="space-y-3 text-xs">
                  <div className="p-2.5 bg-white rounded-lg border border-slate-200 text-slate-700">
                    <span className="font-bold">Required Authority:</span> AICTE Scrutiny Officer (Clearance A). Verifies regional records, student liability status, and institutional compliance.
                  </div>

                  {(role === 'AICTE_OFFICER' || role === 'ADMIN') ? (
                    <div className="space-y-3 pt-1">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">Clearance A Determination *</label>
                          <select
                            value={stageDecision}
                            onChange={(e) => setStageDecision(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-semibold"
                          >
                            <option value="GRANTED">Grant Clearance A</option>
                            <option value="CLARIFICATION_REQUIRED">Request Institutional Clarification</option>
                            <option value="REJECTED">Reject Release</option>
                          </select>
                        </div>
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">Regional Audit Reference</label>
                          <input
                            type="text"
                            placeholder="e.g. AUDIT/REG/2026/091"
                            value={evidenceRef}
                            onChange={(e) => setEvidenceRef(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-slate-300"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Clearance A Observations *</label>
                        <textarea
                          rows={2}
                          required
                          placeholder="Record verification findings from regional zero-liability register..."
                          value={stageReason}
                          onChange={(e) => setStageReason(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300"
                        />
                      </div>

                      <button
                        onClick={() => handleExecuteStageAction('clearance-a', 'GRANTED')}
                        disabled={isExecutingStage}
                        className="w-full py-2 bg-teal-800 text-white rounded-lg font-bold hover:bg-teal-700 disabled:opacity-50"
                      >
                        {isExecutingStage ? 'Recording...' : 'Commit Clearance A Decision'}
                      </button>
                    </div>
                  ) : (
                    <div className="p-3 bg-slate-100 rounded-lg text-slate-500 flex items-center gap-2">
                      <Lock className="h-4 w-4" />
                      <span>Clearance A can only be executed by an AICTE Scrutiny Officer or Administrator.</span>
                    </div>
                  )}
                </div>
              )}

              {/* STAGE 3: Clearance B (Mandatory Actor Separation) */}
              {activeWorkflowReq.status === 'CLEARANCE_A_GRANTED' && (
                <div className="space-y-3 text-xs">
                  <div className="p-2.5 bg-white rounded-lg border border-slate-200 text-slate-700">
                    <span className="font-bold">Required Authority:</span> Independent AICTE Scrutiny Officer (Clearance B).
                    <div className="text-[11px] text-amber-800 mt-1 font-semibold">
                      ⚠ Mandatory Actor Separation: User #{activeWorkflowReq.clearance_a_actor_id} (Clearance A actor) cannot approve Clearance B.
                    </div>
                  </div>

                  {(role === 'AICTE_OFFICER' || role === 'ADMIN') ? (
                    user?.id === activeWorkflowReq.clearance_a_actor_id ? (
                      <div className="p-3 bg-amber-50 border border-amber-300 text-amber-900 rounded-lg font-medium flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-amber-700 shrink-0" />
                        <span>Actor Separation Enforced: You granted Clearance A on this case. Switch to Deputy Officer (officer2@demo.aicte.gov.in) to perform Clearance B.</span>
                      </div>
                    ) : (
                      <div className="space-y-3 pt-1">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block font-semibold text-slate-700 mb-1">Clearance B Determination *</label>
                            <select
                              value={stageDecision}
                              onChange={(e) => setStageDecision(e.target.value)}
                              className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-semibold"
                            >
                              <option value="GRANTED">Grant Independent Clearance B</option>
                              <option value="CLARIFICATION_REQUIRED">Request Discrepancy Clarification</option>
                              <option value="REJECTED">Reject Release</option>
                            </select>
                          </div>
                          <div>
                            <label className="block font-semibold text-slate-700 mb-1">Second Scrutiny Reference</label>
                            <input
                              type="text"
                              placeholder="e.g. 2ND-REVIEW/HQ/2026/41"
                              value={evidenceRef}
                              onChange={(e) => setEvidenceRef(e.target.value)}
                              className="w-full px-3 py-2 rounded-lg border border-slate-300"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">Independent Review Observations *</label>
                          <textarea
                            rows={2}
                            required
                            placeholder="Record independent scrutiny of ten-year compliance record and no-objection status..."
                            value={stageReason}
                            onChange={(e) => setStageReason(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-slate-300"
                          />
                        </div>

                        <button
                          onClick={() => handleExecuteStageAction('clearance-b', 'GRANTED')}
                          disabled={isExecutingStage}
                          className="w-full py-2 bg-blue-800 text-white rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50"
                        >
                          {isExecutingStage ? 'Recording...' : 'Commit Independent Clearance B'}
                        </button>
                      </div>
                    )
                  ) : (
                    <div className="p-3 bg-slate-100 rounded-lg text-slate-500 flex items-center gap-2">
                      <Lock className="h-4 w-4" />
                      <span>Clearance B can only be executed by a separate AICTE Scrutiny Officer or Administrator.</span>
                    </div>
                  )}
                </div>
              )}

              {/* STAGE 4: Final Authorization */}
              {activeWorkflowReq.status === 'CLEARANCE_B_GRANTED' && (
                <div className="space-y-3 text-xs">
                  <div className="p-2.5 bg-white rounded-lg border border-slate-200 text-slate-700">
                    <span className="font-bold">Required Authority:</span> Workflow Approver or Administrator. Both Clearance A and B have been verified. Final executive sanction required before NOC generation.
                  </div>

                  {(role === 'WORKFLOW_APPROVER' || role === 'ADMIN') ? (
                    <div className="space-y-3 pt-1">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Executive Authorization *</label>
                        <select
                          value={stageDecision}
                          onChange={(e) => setStageDecision(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-semibold"
                        >
                          <option value="AUTHORIZED">Grant Final Administrative Authorization</option>
                          <option value="REJECTED">Reject Release Application</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Executive Sanction Basis *</label>
                        <textarea
                          rows={2}
                          required
                          placeholder="Sanctioning memo reference, committee approval minute, or formal concurrence notes..."
                          value={stageReason}
                          onChange={(e) => setStageReason(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300"
                        />
                      </div>

                      <button
                        onClick={() => handleExecuteStageAction('final-authorization', 'AUTHORIZED')}
                        disabled={isExecutingStage}
                        className="w-full py-2 bg-amber-700 text-white rounded-lg font-bold hover:bg-amber-600 disabled:opacity-50"
                      >
                        {isExecutingStage ? 'Sanctioning...' : 'Grant Final Administrative Authorization'}
                      </button>
                    </div>
                  ) : (
                    <div className="p-3 bg-slate-100 rounded-lg text-slate-500 flex items-center gap-2">
                      <Lock className="h-4 w-4" />
                      <span>Final Authorization requires Workflow Approver or Administrator credentials. Switch to Approver (approver@demo.aicte.gov.in) to proceed.</span>
                    </div>
                  )}
                </div>
              )}

              {/* STAGE 5: Issue NOC */}
              {activeWorkflowReq.status === 'AUTHORIZED' && (
                <div className="space-y-3 text-xs">
                  <div className="p-2.5 bg-white rounded-lg border border-slate-200 text-slate-700">
                    <span className="font-bold">Required Authority:</span> AICTE Scrutiny Officer or Approver. Generates official No Objection Certificate (NOC) reference for the bank lien removal.
                  </div>

                  {(role === 'AICTE_OFFICER' || role === 'WORKFLOW_APPROVER' || role === 'ADMIN') ? (
                    <div className="space-y-3 pt-1">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Formal NOC Reference Number</label>
                        <input
                          type="text"
                          placeholder="AICTE/NOC/2026/84920"
                          value={evidenceRef}
                          onChange={(e) => setEvidenceRef(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">NOC Dispatch / Issuance Remarks *</label>
                        <textarea
                          rows={2}
                          required
                          placeholder="Dispatched to bank and institution; administrative lien clearance issued..."
                          value={stageReason}
                          onChange={(e) => setStageReason(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300"
                        />
                      </div>

                      <button
                        onClick={() => handleExecuteStageAction('issue-noc', 'ISSUED')}
                        disabled={isExecutingStage}
                        className="w-full py-2 bg-emerald-800 text-white rounded-lg font-bold hover:bg-emerald-700 disabled:opacity-50"
                      >
                        {isExecutingStage ? 'Issuing...' : 'Generate & Issue Official AICTE NOC'}
                      </button>
                    </div>
                  ) : (
                    <div className="p-3 bg-slate-100 rounded-lg text-slate-500 flex items-center gap-2">
                      <Lock className="h-4 w-4" />
                      <span>NOC issuance requires AICTE Officer or Approver credentials.</span>
                    </div>
                  )}
                </div>
              )}

              {/* STAGE 6: Discharge Evidence */}
              {(activeWorkflowReq.status === 'NOC_ISSUED' || activeWorkflowReq.status === 'DISCHARGE_SUBMITTED') && (
                <div className="space-y-3 text-xs">
                  <div className="p-2.5 bg-white rounded-lg border border-slate-200 text-slate-700">
                    <span className="font-bold">Discharge Evidence Gate:</span> NOC has been issued. Bank lien discharge voucher / cancellation receipt must be uploaded and accepted before portal closure.
                  </div>

                  {activeWorkflowReq.status === 'NOC_ISSUED' ? (
                    <div className="space-y-3 pt-1">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Bank Discharge Receipt / Voucher Reference *</label>
                        <input
                          type="text"
                          placeholder="e.g. SBI/DISCHARGE/REC-2026-99"
                          value={evidenceRef}
                          onChange={(e) => setEvidenceRef(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Discharge Submission Notes *</label>
                        <textarea
                          rows={2}
                          required
                          placeholder="Bank confirms lien is discharged and security deposit has reached maturity/closure..."
                          value={stageReason}
                          onChange={(e) => setStageReason(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300"
                        />
                      </div>

                      <button
                        onClick={() => handleExecuteStageAction('discharge-evidence', 'SUBMITTED')}
                        disabled={isExecutingStage}
                        className="w-full py-2 bg-teal-800 text-white rounded-lg font-bold hover:bg-teal-700 disabled:opacity-50"
                      >
                        {isExecutingStage ? 'Submitting...' : 'Submit Bank Discharge Evidence'}
                      </button>
                    </div>
                  ) : (
                    (role === 'AICTE_OFFICER' || role === 'ADMIN') ? (
                      <div className="space-y-3 pt-1">
                        <div className="p-2 bg-amber-50 rounded border border-amber-200 text-amber-900">
                          Discharge evidence submitted. Review and verify bank cancellation receipt.
                        </div>

                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">Verification Outcome *</label>
                          <select
                            value={stageDecision}
                            onChange={(e) => setStageDecision(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-semibold"
                          >
                            <option value="ACCEPTED">Accept & Verify Discharge Evidence</option>
                            <option value="REJECTED">Reject Discharge Evidence</option>
                          </select>
                        </div>

                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">Reviewer Observations *</label>
                          <textarea
                            rows={2}
                            required
                            placeholder="Bank stamp and discharge signature verified against NOC..."
                            value={stageReason}
                            onChange={(e) => setStageReason(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-slate-300"
                          />
                        </div>

                        <button
                          onClick={() => handleExecuteStageAction('discharge-evidence', 'ACCEPTED')}
                          disabled={isExecutingStage}
                          className="w-full py-2 bg-blue-800 text-white rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50"
                        >
                          {isExecutingStage ? 'Verifying...' : 'Verify Discharge Evidence'}
                        </button>
                      </div>
                    ) : (
                      <div className="p-3 bg-slate-100 rounded-lg text-slate-500">
                        Discharge evidence is currently under AICTE Officer scrutiny.
                      </div>
                    )
                  )}
                </div>
              )}

              {/* STAGE 7: Complete Workflow */}
              {(activeWorkflowReq.status === 'DISCHARGE_VERIFIED' || activeWorkflowReq.status === 'DISCHARGE_SUBMITTED') && (
                <div className="space-y-3 text-xs pt-2 border-t border-slate-200">
                  <div className="p-2.5 bg-white rounded-lg border border-slate-200 text-slate-700">
                    <span className="font-bold">Final Portal Lifecycle Completion:</span> Close the release case and mark FDR records officially finalized.
                  </div>

                  {(role === 'AICTE_OFFICER' || role === 'WORKFLOW_APPROVER' || role === 'ADMIN') ? (
                    <div className="space-y-3">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Final Lifecycle Completion Remarks *</label>
                        <textarea
                          rows={2}
                          required
                          placeholder="All statutory milestones verified. DepositLedger portal process closed successfully."
                          value={stageReason}
                          onChange={(e) => setStageReason(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300"
                        />
                      </div>

                      <button
                        onClick={() => handleExecuteStageAction('complete', 'COMPLETED')}
                        disabled={isExecutingStage}
                        className="w-full py-2 bg-emerald-800 text-white rounded-lg font-bold hover:bg-emerald-700 disabled:opacity-50"
                      >
                        {isExecutingStage ? 'Closing...' : 'Close & Finalize Release Workflow'}
                      </button>
                    </div>
                  ) : (
                    <div className="p-3 bg-slate-100 rounded-lg text-slate-500">
                      Workflow closure can be performed by an AICTE Officer or Approver.
                    </div>
                  )}
                </div>
              )}

              {/* Workflow Completed Banner */}
              {activeWorkflowReq.status === 'COMPLETED' && (
                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-300 text-center space-y-1">
                  <CheckCircle2 className="h-6 w-6 text-emerald-600 mx-auto" />
                  <div className="text-sm font-bold text-emerald-950">Release Workflow Successfully Completed</div>
                  <div className="text-[11px] text-emerald-800">
                    All 7 gates (Clearance A, Clearance B, Final Sanction, NOC, Discharge) are verified and logged in the immutable audit trail.
                  </div>
                  <div className="text-[10px] text-slate-500 mt-2">
                    PROTOTYPE · SYNTHETIC DATA · No actual funds transfer represented
                  </div>
                </div>
              )}

              {/* Read-Only Auditor Notice */}
              {role === 'AUDITOR' && (
                <div className="p-3 bg-slate-100 rounded-lg text-slate-600 text-xs flex items-center gap-2">
                  <Lock className="h-4 w-4 text-slate-400" />
                  <span>Auditor mode: Read-only observation. Gate actions are disabled for this inspection role.</span>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-between items-center pt-2 border-t border-slate-100 text-xs">
              <span className="text-slate-400">SIH 2026 PS 26265 • Staged Gatekeeper Release Protocol</span>
              <button
                type="button"
                onClick={() => setActiveWorkflowReq(null)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-semibold hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
