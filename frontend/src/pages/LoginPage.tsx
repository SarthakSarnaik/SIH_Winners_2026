import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Mail,
  Lock,
  ArrowRight,
  ShieldCheck,
  Building2,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Cloud,
  FileCheck2,
  Layers,
  Eye
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import { API_BASE } from '../services/api';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingRole, setLoadingRole] = useState<string | null>(null);

  const { login, loginAsDemo } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as any)?.from?.pathname || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    try {
      setError('');
      setIsSubmitting(true);
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoLogin = async (demoEmail: string, targetRole: UserRole) => {
    try {
      setError('');
      setLoadingRole(targetRole);
      await loginAsDemo(targetRole);
      
      if (targetRole === 'COLLEGE_USER') {
        navigate('/college/dashboard', { replace: true });
      } else if (targetRole === 'AICTE_OFFICER' || targetRole === 'WORKFLOW_APPROVER') {
        navigate('/officer/dashboard', { replace: true });
      } else if (targetRole === 'AUDITOR') {
        navigate('/admin/audit', { replace: true });
      } else {
        navigate('/admin/dashboard', { replace: true });
      }
    } catch (err: any) {
      setError(err.message || 'Demo login failed');
    } finally {
      setLoadingRole(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA] flex flex-col justify-between">
      {/* Top National Header Bar with Official AICTE Logo */}
      <div className="bg-white border-b border-slate-200 shadow-xs">
        <div className="h-1.5 w-full bg-gradient-to-r from-[#FFB800] via-white to-emerald-600" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <img 
              src="/aicte-logo.png" 
              alt="AICTE Official Logo" 
              className="h-12 w-12 object-contain shrink-0" 
            />
            <div>
              <div className="font-extrabold text-base text-[#092D62] tracking-tight">
                ALL INDIA COUNCIL FOR TECHNICAL EDUCATION
              </div>
              <div className="text-xs text-slate-500 font-medium">
                Ministry of Education, Government of India
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Login Container */}
      <div className="flex-1 flex items-center justify-center py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          
          {/* Left Column: Info & Official Regulatory Capabilities */}
          <div className="lg:col-span-6 space-y-6 pr-0 lg:pr-4">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A] shadow-xs">
                <span className="h-2 w-2 rounded-full bg-[#D97706]" />
                <span>Problem Statement ID: 26265</span>
              </div>
              
              <div>
                <h1 className="text-4xl sm:text-5xl font-black text-[#092D62] tracking-tight">
                  VajraKosh
                </h1>
                <p className="text-base sm:text-lg font-bold text-slate-700 mt-1">
                  Security Deposit &amp; FDR Management Portal
                </p>
                <div className="h-1 w-20 bg-[#FFB800] rounded-full mt-2.5 mb-3" />
              </div>

              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
                Centralized, transparent and auditable repository for managing mandatory institutional fixed deposits, renewals, compliance scrutiny, and authorized releases.
              </p>
            </div>

            {/* Verified Regulatory Capabilities Card */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 sm:p-6 space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                <div className="h-8 w-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Verified Regulatory Capabilities
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    AICTE statutory fixed deposit compliance framework
                  </p>
                </div>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50/80 border border-slate-100 hover:bg-slate-50 transition-colors">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                  <div>
                    <span className="font-bold text-slate-900 block">Institutional Data Isolation</span>
                    <span className="text-slate-600 text-[11px] leading-relaxed">Zero cross-college data leakage with strict tenant-scoped access policies</span>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50/80 border border-slate-100 hover:bg-slate-50 transition-colors">
                  <span className="h-2 w-2 rounded-full bg-[#092D62] mt-1.5 shrink-0" />
                  <div>
                    <span className="font-bold text-slate-900 block">Officer Scrutiny &amp; Discrepancy Detection</span>
                    <span className="text-slate-600 text-[11px] leading-relaxed">Document inspection, bank seal verification, observation logging &amp; clarification workflow</span>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50/80 border border-slate-100 hover:bg-slate-50 transition-colors">
                  <span className="h-2 w-2 rounded-full bg-[#FFB800] mt-1.5 shrink-0" />
                  <div>
                    <span className="font-bold text-slate-900 block">Automated Idempotent Maturity Alerts</span>
                    <span className="text-slate-600 text-[11px] leading-relaxed">EventBridge/Lambda scheduled notifications at 30, 15, 7, and 0 days</span>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50/80 border border-slate-100 hover:bg-slate-50 transition-colors">
                  <span className="h-2 w-2 rounded-full bg-purple-600 mt-1.5 shrink-0" />
                  <div>
                    <span className="font-bold text-slate-900 block">Linked Replacement &amp; Multi-Step Refund</span>
                    <span className="text-slate-600 text-[11px] leading-relaxed">Predecessor-successor FDR audit chain with actor-separated staged clearance</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Sign In Form & Demo Personas */}
          <div className="lg:col-span-6 bg-white rounded-2xl shadow-xl border border-slate-200/80 p-6 sm:p-8 space-y-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Sign in to Official Portal</h2>
              <p className="text-xs text-slate-500 mt-0.5">Use your registered institutional or officer credentials</p>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2.5 text-xs text-red-800">
                <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Official Email Address
                </label>
                <div className="relative">
                  <Mail className="h-4 w-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="officer@aicte.gov.in or college@domain.edu.in"
                    required
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#092D62] focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Portal Password
                </label>
                <div className="relative">
                  <Lock className="h-4 w-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#092D62] focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 bg-[#092D62] hover:bg-[#072249] text-white text-xs font-bold rounded-lg shadow-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
              >
                <span>{isSubmitting ? 'Authenticating...' : 'Sign In with Credentials'}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>

            {/* 1-Click Persona Login Grid for Evaluation */}
            <div className="pt-4 border-t border-slate-100">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="h-4 w-4 text-[#FFB800]" />
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  1-Click Hackathon Demo Login
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mb-3">
                Select any authorized role to test the live end-to-end workflow immediately:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* 1. College User */}
                <button
                  type="button"
                  onClick={() => handleDemoLogin('college@demo.aicte.gov.in', 'COLLEGE_USER')}
                  disabled={loadingRole !== null}
                  className="p-3 text-left border border-slate-200 rounded-xl hover:border-[#FFB800] hover:bg-amber-50/40 transition-all group disabled:opacity-50 cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900 group-hover:text-blue-900">
                      Institution
                    </span>
                    <Building2 className="h-4 w-4 text-slate-400 group-hover:text-[#FFB800]" />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 truncate">College User (Delhi Tech)</p>
                  <span className="inline-block mt-2 text-[10px] font-bold text-blue-700">
                    {loadingRole === 'COLLEGE_USER' ? 'Entering...' : '1-Click Enter →'}
                  </span>
                </button>

                {/* 2. AICTE Scrutiny Officer */}
                <button
                  type="button"
                  onClick={() => handleDemoLogin('officer@demo.aicte.gov.in', 'AICTE_OFFICER')}
                  disabled={loadingRole !== null}
                  className="p-3 text-left border border-slate-200 rounded-xl hover:border-[#FFB800] hover:bg-amber-50/40 transition-all group disabled:opacity-50 cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900 group-hover:text-blue-900">
                      AICTE Officer
                    </span>
                    <ShieldCheck className="h-4 w-4 text-slate-400 group-hover:text-[#FFB800]" />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 truncate">Scrutiny & Clearances</p>
                  <span className="inline-block mt-2 text-[10px] font-bold text-blue-700">
                    {loadingRole === 'AICTE_OFFICER' ? 'Entering...' : '1-Click Enter →'}
                  </span>
                </button>

                {/* 3. Workflow Approver */}
                <button
                  type="button"
                  onClick={() => handleDemoLogin('approver@demo.aicte.gov.in', 'WORKFLOW_APPROVER')}
                  disabled={loadingRole !== null}
                  className="p-3 text-left border border-slate-200 rounded-xl hover:border-[#FFB800] hover:bg-amber-50/40 transition-all group disabled:opacity-50 cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900 group-hover:text-blue-900">
                      Approver
                    </span>
                    <UserCheck className="h-4 w-4 text-slate-400 group-hover:text-[#FFB800]" />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 truncate">Final Authorization</p>
                  <span className="inline-block mt-2 text-[10px] font-bold text-blue-700">
                    {loadingRole === 'WORKFLOW_APPROVER' ? 'Entering...' : '1-Click Enter →'}
                  </span>
                </button>

                {/* 4. Administrator */}
                <button
                  type="button"
                  onClick={() => handleDemoLogin('admin@demo.aicte.gov.in', 'ADMIN')}
                  disabled={loadingRole !== null}
                  className="p-3 text-left border border-slate-200 rounded-xl hover:border-[#FFB800] hover:bg-amber-50/40 transition-all group disabled:opacity-50 cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900 group-hover:text-blue-900">
                      Administrator
                    </span>
                    <Cloud className="h-4 w-4 text-slate-400 group-hover:text-[#FFB800]" />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 truncate">Governance & Controls</p>
                  <span className="inline-block mt-2 text-[10px] font-bold text-purple-700">
                    {loadingRole === 'ADMIN' ? 'Entering...' : '1-Click Enter →'}
                  </span>
                </button>
              </div>

              {/* 5. Read-Only Auditor */}
              <div className="mt-2.5">
                <button
                  type="button"
                  onClick={() => handleDemoLogin('auditor@demo.aicte.gov.in', 'AUDITOR')}
                  disabled={loadingRole !== null}
                  className="w-full p-2.5 text-left border border-slate-200 rounded-xl hover:border-[#FFB800] hover:bg-amber-50/40 transition-all group disabled:opacity-50 flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-slate-400 group-hover:text-[#FFB800]" />
                    <div>
                      <span className="font-bold text-xs text-slate-900 group-hover:text-blue-900">
                        Auditor (Read-Only)
                      </span>
                      <span className="text-[11px] text-slate-500 ml-2">Independent Compliance Oversight</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-blue-700">
                    {loadingRole === 'AUDITOR' ? 'Entering...' : '1-Click Enter →'}
                  </span>
                </button>
              </div>
            </div>

            {/* Target API Notice */}
            <div className="text-center pt-2 text-[10px] text-slate-400">
              Target API: <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-slate-600">{API_BASE}</code>
            </div>
          </div>
        </div>
      </div>

      {/* Institutional Footer */}
      <footer className="py-3.5 border-t border-slate-200/80 bg-white/70 text-center text-[11px] text-slate-500">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>All India Council for Technical Education • Nelson Mandela Marg, Vasant Kunj, New Delhi-110070</span>
          <span className="font-medium text-slate-600">VajraKosh — Security Deposit &amp; FDR Portal</span>
        </div>
      </footer>
    </div>
  );
};
