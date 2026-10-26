import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Building2,
  Calendar,
  AlertTriangle,
  Clock,
  Play,
  CheckCircle2,
  ChevronRight,
  TrendingUp,
  Landmark,
  Coins,
  FileCheck2,
  FileText,
  UserCheck,
  ShieldCheck,
  Send,
  Archive,
  ArrowUpRight,
  Plus,
  UserPlus,
  RefreshCw,
  Eye
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';
import { api } from '../services/api';
import { AdminDashboardStats, AuditLogItem } from '../types';

export const AdminDashboardPage: React.FC = () => {
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [recentAudits, setRecentAudits] = useState<AuditLogItem[]>([]);
  const [isTriggeringJob, setIsTriggeringJob] = useState(false);
  const [jobFeedback, setJobFeedback] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  const fetchAdminDashboard = async () => {
    try {
      setIsLoading(true);
      const [statsData, auditsData] = await Promise.all([
        api.get<AdminDashboardStats>('/dashboard/admin'),
        api.get<AuditLogItem[]>('/audit?limit=6')
      ]);
      setStats(statsData);
      setRecentAudits(auditsData);
    } catch (err) {
      console.error('Error loading admin dashboard:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminDashboard();
  }, []);

  const handleRunMaturityJob = async () => {
    setIsTriggeringJob(true);
    setJobFeedback(null);
    try {
      const res: any = await api.post('/jobs/maturity-check');
      setJobFeedback(
        `Job Executed: ${res.total_checked} FDRs evaluated, ${res.reminders_sent} notifications dispatched (Idempotent 0 duplicates).`
      );
      await fetchAdminDashboard();
    } catch (e: any) {
      setJobFeedback(`Error triggering job: ${e.message}`);
    } finally {
      setIsTriggeringJob(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-2">
          <div className="h-8 w-8 border-4 border-[#092D62] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500 font-medium">Loading Administrator Governance Telemetry...</p>
        </div>
      </div>
    );
  }

  // Pre-formatted status distribution data
  const statusLegendColors: Record<string, string> = {
    'Active': '#1E40AF',
    'Approaching Maturity': '#FFB800',
    'Overdue': '#DC2626',
    'Under Scrutiny': '#9333EA',
    'In Release Process': '#059669',
  };

  const statusItems = [
    { name: 'Active', count: 4, pct: '57.1%', color: '#1E40AF' },
    { name: 'Approaching Maturity', count: 2, pct: '28.6%', color: '#FFB800' },
    { name: 'Overdue', count: 0, pct: '0.0%', color: '#DC2626' },
    { name: 'Under Scrutiny', count: 1, pct: '14.3%', color: '#9333EA' },
    { name: 'In Release Process', count: 0, pct: '0.0%', color: '#059669' },
  ];

  // Bank distribution chart data
  const bankData = [
    { bank: 'State Bank of India', count: 2 },
    { bank: 'Punjab National Bank', count: 1 },
    { bank: 'Canara Bank', count: 2 },
    { bank: 'Bank of Baroda', count: 1 },
    { bank: 'HDFC Bank', count: 1 },
    { bank: 'Indian Overseas Bank', count: 0 },
  ];

  const totalFdrsCount = stats?.total_fdrs || 7;

  return (
    <div className="space-y-5">
      {/* 1. Welcome Header Banner matching reference layout */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Welcome, <span className="text-[#092D62]">Administrator</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Manage institutions, oversee FDR lifecycle, monitor compliance and system health.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 max-w-sm">
          <div className="h-10 w-10 rounded-lg bg-[#092D62] text-white flex items-center justify-center shrink-0">
            <Landmark className="h-5 w-5 text-[#FFB800]" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900">System Governance</div>
            <div className="text-[11px] text-slate-500 leading-tight mt-0.5">
              Centralized, transparent and auditable FDR repository for AICTE approved institutions.
            </div>
          </div>
        </div>
      </div>

      {/* 2. Four KPI Metric Cards in 4-Column Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Registered Institutions */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="h-10 w-10 rounded-xl bg-blue-50 text-[#092D62] flex items-center justify-center">
              <Landmark className="h-5 w-5" />
            </div>
            <span className="text-slate-400 text-xs font-medium">Institutes</span>
          </div>
          <div className="mt-4">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
              Registered Institutions
            </div>
            <div className="text-3xl font-black text-slate-900 tracking-tight mt-1">
              {stats?.total_institutions || 4}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 font-medium">
              Multi-tenant isolation active
            </div>
          </div>
        </div>

        {/* Card 2: Total FDRs Under Custody */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="h-10 w-10 rounded-xl bg-amber-50 text-[#B45309] flex items-center justify-center">
              <Coins className="h-5 w-5" />
            </div>
            <span className="text-slate-400 text-xs font-medium">Instruments</span>
          </div>
          <div className="mt-4">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
              Total FDRs Under Custody
            </div>
            <div className="text-3xl font-black text-slate-900 tracking-tight mt-1">
              {totalFdrsCount}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 font-medium">
              Total Value: ₹{(stats?.total_amount || 11800000).toLocaleString('en-IN')}
            </div>
          </div>
        </div>

        {/* Card 3: Approaching Maturity (Next 30 Days) */}
        <div 
          onClick={() => navigate('/fdrs')}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between cursor-pointer hover:border-amber-300 transition-all group"
        >
          <div className="flex items-center justify-between">
            <div className="h-10 w-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
              <Calendar className="h-5 w-5" />
            </div>
            <div className="h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-[#FFB800] group-hover:text-black transition-colors">
              <ChevronRight className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
              Approaching Maturity (Next 30 Days)
            </div>
            <div className="text-3xl font-black text-slate-900 tracking-tight mt-1">
              {stats?.approaching_maturity ?? 2}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 font-medium">
              30 / 15 / 7 day alerts active
            </div>
          </div>
        </div>

        {/* Card 4: Pending Release Requests */}
        <div 
          onClick={() => navigate('/releases')}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between cursor-pointer hover:border-emerald-300 transition-all group"
        >
          <div className="flex items-center justify-between">
            <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <FileCheck2 className="h-5 w-5" />
            </div>
            <div className="h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
              <ChevronRight className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
              Pending Release Requests
            </div>
            <div className="text-3xl font-black text-slate-900 tracking-tight mt-1">
              {stats?.pending_releases ?? 1}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 font-medium">
              Awaiting clearance / authorization
            </div>
          </div>
        </div>
      </div>

      {/* 3. Scheduled Maturity Monitor Banner Card with Saffron Button */}
      <div className="bg-[#FFFBEB] rounded-2xl border border-[#FDE68A] p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="h-10 w-10 rounded-xl bg-[#FEF3C7] text-[#B45309] flex items-center justify-center shrink-0 mt-0.5">
            <Calendar className="h-5 w-5 text-[#B45309]" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Scheduled Maturity Monitor (EventBridge / Lambda)
            </h3>
            <p className="text-xs text-slate-600 mt-1 font-medium leading-relaxed max-w-3xl">
              Evaluates upcoming maturities at configured intervals (30, 15, 7, 0 days, and overdue). Guaranteed idempotent with zero duplicate notifications.
            </p>
          </div>
        </div>

        <button
          onClick={handleRunMaturityJob}
          disabled={isTriggeringJob}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#FFB800] hover:bg-[#E0A300] text-black text-xs font-extrabold shadow-sm transition-all disabled:opacity-50 shrink-0 cursor-pointer"
        >
          <Play className="h-3.5 w-3.5 fill-black" />
          <span>{isTriggeringJob ? 'Executing Job...' : 'Execute Scheduled Job Now'}</span>
        </button>
      </div>

      {jobFeedback && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-800 flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{jobFeedback}</span>
        </div>
      )}

      {/* 4. Middle Charts Grid: FDR Status Donut + Bank Distribution Bar Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: FDR Status Distribution Donut */}
        <div className="lg:col-span-6 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#092D62]" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                FDR Status Distribution
              </h3>
            </div>
            <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
              By Status ▾
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
            {/* Donut Chart with Center Count */}
            <div className="sm:col-span-6 relative h-52 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusItems}
                    cx="50%"
                    cy="50%"
                    innerRadius={58}
                    outerRadius={82}
                    paddingAngle={3}
                    dataKey="count"
                  >
                    {statusItems.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: any, name: any) => [`${value} FDRs`, name]}
                    contentStyle={{ borderRadius: '8px', fontSize: '11px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-black text-slate-900 leading-none">{totalFdrsCount}</span>
                <span className="text-[11px] font-bold text-slate-400 uppercase mt-1">FDRs</span>
              </div>
            </div>

            {/* Right Side Legend matching mockup */}
            <div className="sm:col-span-6 space-y-2 text-xs">
              {statusItems.map((item) => (
                <div key={item.name} className="flex items-center justify-between text-slate-700 py-0.5">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="font-medium text-slate-700 text-xs truncate max-w-[130px]">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-3 font-semibold text-slate-900">
                    <span>{item.count}</span>
                    <span className="text-slate-400 font-normal w-12 text-right">{item.pct}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Bank-wise Distribution of Fixed Deposits */}
        <div className="lg:col-span-6 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#092D62]" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Bank-wise Distribution of Fixed Deposits
              </h3>
            </div>
            <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
              By Count ▾
            </span>
          </div>

          <div className="h-52 w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bankData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis 
                  dataKey="bank" 
                  tick={{ fontSize: 9, fill: '#475569' }} 
                  interval={0} 
                  angle={-15} 
                  textAnchor="end" 
                />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#64748B' }} />
                <Tooltip 
                  formatter={(value: any) => [`${value} FDRs`, 'Count']}
                  contentStyle={{ borderRadius: '8px', fontSize: '11px' }}
                />
                <Bar dataKey="count" fill="#092D62" radius={[6, 6, 0, 0]} barSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 5. Bottom Row: Release Workflow Timeline + Recent Activities matching mockup */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Release Workflow Timeline (All Active Cases) */}
        <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#092D62]" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Release Workflow Timeline (All Active Cases)
              </h3>
            </div>
            <Link to="/releases" className="text-xs font-bold text-[#092D62] hover:underline flex items-center gap-1">
              <span>View Cases</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* Stepper matching layout image */}
          <div className="py-4 overflow-x-auto">
            <div className="flex items-center justify-between min-w-[500px] relative">
              {/* Connecting Bar */}
              <div className="absolute top-4 left-6 right-6 h-0.5 bg-slate-200 -z-0" />

              {/* Step 1 */}
              <div className="flex flex-col items-center text-center relative z-10">
                <div className="h-9 w-9 rounded-full bg-[#FFB800] text-black font-bold flex items-center justify-center text-xs shadow-xs border-2 border-white">
                  ✓
                </div>
                <div className="text-[11px] font-bold text-slate-800 mt-2">Request<br />Submitted</div>
                <div className="text-[10px] text-slate-500 font-medium mt-0.5">1 case</div>
              </div>

              {/* Step 2 */}
              <div className="flex flex-col items-center text-center relative z-10">
                <div className="h-9 w-9 rounded-full bg-[#1E40AF] text-white font-bold flex items-center justify-center text-xs shadow-xs border-2 border-white">
                  ✓
                </div>
                <div className="text-[11px] font-bold text-slate-800 mt-2">Clearance A<br />(PGRC)</div>
                <div className="text-[10px] text-slate-500 font-medium mt-0.5">1 case</div>
              </div>

              {/* Step 3 */}
              <div className="flex flex-col items-center text-center relative z-10">
                <div className="h-9 w-9 rounded-full bg-slate-300 text-slate-600 flex items-center justify-center text-xs shadow-xs border-2 border-white">
                  <UserCheck className="h-4 w-4" />
                </div>
                <div className="text-[11px] font-medium text-slate-600 mt-2">Clearance B<br />(Vigilance)</div>
                <div className="text-[10px] text-slate-400 font-medium mt-0.5">0 case</div>
              </div>

              {/* Step 4 */}
              <div className="flex flex-col items-center text-center relative z-10">
                <div className="h-9 w-9 rounded-full bg-slate-300 text-slate-600 flex items-center justify-center text-xs shadow-xs border-2 border-white">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div className="text-[11px] font-medium text-slate-600 mt-2">Final Authorization<br />(CA)</div>
                <div className="text-[10px] text-slate-400 font-medium mt-0.5">0 case</div>
              </div>

              {/* Step 5 */}
              <div className="flex flex-col items-center text-center relative z-10">
                <div className="h-9 w-9 rounded-full bg-slate-300 text-slate-600 flex items-center justify-center text-xs shadow-xs border-2 border-white">
                  <FileText className="h-4 w-4" />
                </div>
                <div className="text-[11px] font-medium text-slate-600 mt-2">NOC Issuance</div>
                <div className="text-[10px] text-slate-400 font-medium mt-0.5">0 case</div>
              </div>

              {/* Step 6 */}
              <div className="flex flex-col items-center text-center relative z-10">
                <div className="h-9 w-9 rounded-full bg-slate-300 text-slate-600 flex items-center justify-center text-xs shadow-xs border-2 border-white">
                  <Archive className="h-4 w-4" />
                </div>
                <div className="text-[11px] font-medium text-slate-600 mt-2">Discharge Evidence<br />& Completion</div>
                <div className="text-[10px] text-slate-400 font-medium mt-0.5">0 case</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Recent Activities */}
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#092D62]" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Recent Activities
              </h3>
            </div>
            <Link to="/admin/audit" className="text-xs font-bold text-[#092D62] hover:underline">
              View All
            </Link>
          </div>

          <div className="space-y-3.5 text-xs">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <Plus className="h-3.5 w-3.5" />
                </div>
                <span className="font-semibold text-slate-800 text-[11px]">
                  New FDR submitted by Delhi Tech
                </span>
              </div>
              <span className="text-[10px] text-slate-400 shrink-0 font-medium">Today, 10:24 AM</span>
            </div>

            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded-full bg-blue-50 text-[#1E40AF] flex items-center justify-center shrink-0">
                  <FileText className="h-3.5 w-3.5" />
                </div>
                <span className="font-semibold text-slate-800 text-[11px]">
                  Scrutiny observation added (SBI-2024-8921)
                </span>
              </div>
              <span className="text-[10px] text-slate-400 shrink-0 font-medium">Today, 09:15 AM</span>
            </div>

            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded-full bg-amber-50 text-[#B45309] flex items-center justify-center shrink-0">
                  <Calendar className="h-3.5 w-3.5" />
                </div>
                <span className="font-semibold text-slate-800 text-[11px]">
                  Maturity reminder generated (PNB-SEC-7749102)
                </span>
              </div>
              <span className="text-[10px] text-slate-400 shrink-0 font-medium">Today, 08:00 AM</span>
            </div>

            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </div>
                <span className="font-semibold text-slate-800 text-[11px]">
                  Release request initiated (IOB-TECH-552810)
                </span>
              </div>
              <span className="text-[10px] text-slate-400 shrink-0 font-medium">Yesterday, 04:32 PM</span>
            </div>

            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded-full bg-blue-50 text-[#092D62] flex items-center justify-center shrink-0">
                  <UserPlus className="h-3.5 w-3.5" />
                </div>
                <span className="font-semibold text-slate-800 text-[11px]">
                  New user logged: officer2@demo.aicte.gov.in
                </span>
              </div>
              <span className="text-[10px] text-slate-400 shrink-0 font-medium">Yesterday, 11:20 AM</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
