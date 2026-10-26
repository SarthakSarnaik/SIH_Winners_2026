import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Bell,
  LogOut,
  Building2,
  ChevronDown,
  Layers,
  User as UserIcon,
  Menu,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { UserRole } from '../../types';

interface NavbarProps {
  onToggleMobileSidebar?: () => void;
  onToggleDesktopSidebar?: () => void;
  isSidebarCollapsed?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  onToggleMobileSidebar,
  onToggleDesktopSidebar,
  isSidebarCollapsed = false,
}) => {
  const { user, role, logout, loginAsDemo } = useAuth();
  const { unreadCount, notifications, markAsRead } = useNotifications();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [showPersonaMenu, setShowPersonaMenu] = useState(false);
  const navigate = useNavigate();

  const handlePersonaSwitch = async (targetRole: UserRole) => {
    setShowPersonaMenu(false);
    await loginAsDemo(targetRole);
    if (targetRole === 'COLLEGE_USER') navigate('/college/dashboard');
    else if (targetRole === 'AICTE_OFFICER' || targetRole === 'WORKFLOW_APPROVER') navigate('/officer/dashboard');
    else if (targetRole === 'AUDITOR') navigate('/admin/audit');
    else navigate('/admin/dashboard');
  };

  // Format display role name
  const roleDisplay = 
    role === 'COLLEGE_USER' ? 'College User' :
    role === 'AICTE_OFFICER' ? 'AICTE Officer' :
    role === 'WORKFLOW_APPROVER' ? 'Workflow Approver' :
    role === 'AUDITOR' ? 'Auditor' : 'Administrator';

  // Get initials for avatar
  const getInitials = (name?: string) => {
    if (!name) return 'AU';
    const parts = name.split(' ').filter(Boolean);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200/90 shadow-sm">
      {/* Official Government Tri-Color Top Accent */}
      <div className="h-1.5 w-full bg-gradient-to-r from-[#FFB800] via-white to-emerald-600" />
      
      <div className="px-4 sm:px-6 lg:px-8 py-2.5 sm:py-3.5">
        <div className="flex items-center justify-between min-h-[64px] sm:min-h-[68px]">
          {/* Left: Official AICTE Logo Asset + Toggle Button + VajraKosh Identity */}
          <div className="flex items-center gap-2.5 sm:gap-4">
            {/* Mobile Drawer Toggle */}
            {onToggleMobileSidebar && (
              <button
                type="button"
                className="md:hidden p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
                onClick={onToggleMobileSidebar}
                aria-label="Open navigation menu"
              >
                <Menu className="h-5 w-5" />
              </button>
            )}

            {/* Desktop Sidebar Fold / Unfold Toggle */}
            {onToggleDesktopSidebar && (
              <button
                type="button"
                className="hidden md:flex p-2 text-slate-600 hover:text-[#092D62] hover:bg-slate-100 rounded-lg transition-colors"
                onClick={onToggleDesktopSidebar}
                title={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                <Menu className="h-5 w-5" />
              </button>
            )}

            <Link to="/" className="flex items-center gap-3.5 sm:gap-4.5 group">
              <img 
                src="/aicte-logo.png" 
                alt="AICTE Official Logo" 
                className="h-13 w-13 sm:h-14 sm:w-14 object-contain shrink-0 drop-shadow-xs" 
              />
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="font-black text-xl sm:text-2xl text-[#092D62] tracking-tight group-hover:text-blue-900 transition-colors">
                    VajraKosh
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium hidden sm:block leading-none mt-1">
                  Security Deposit &amp; FDR Management Portal
                </p>
              </div>
            </Link>
          </div>

          {/* Right Navigation & Persona Tools matching mockup */}
          <div className="flex items-center gap-4 sm:gap-6 lg:gap-7">
            {/* Quick Demo Persona Switcher Pill */}
            <div className="relative">
              <button
                onClick={() => setShowPersonaMenu(!showPersonaMenu)}
                className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold rounded-xl bg-[#FEF9EE] text-[#8C5209] border border-[#F2DEBA] hover:bg-[#FDF4DC] transition-all shadow-xs"
                title="Switch Demo Persona"
              >
                <UserIcon className="h-3.5 w-3.5 text-[#B45309]" />
                <span className="font-bold">{roleDisplay}</span>
                <ChevronDown className="h-3.5 w-3.5 opacity-70" />
              </button>

              {showPersonaMenu && (
                <div className="absolute right-0 mt-2 w-72 rounded-xl bg-white shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="px-3.5 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Select Demonstration Persona
                  </div>
                  <button
                    onClick={() => handlePersonaSwitch('COLLEGE_USER')}
                    className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between hover:bg-slate-50 ${role === 'COLLEGE_USER' ? 'bg-amber-50/70 font-semibold text-amber-900' : 'text-slate-700'}`}
                  >
                    <div>
                      <div className="font-semibold text-slate-900">1. College User</div>
                      <div className="text-[11px] text-slate-500">Delhi Institute of Tech</div>
                    </div>
                    {role === 'COLLEGE_USER' && <span className="text-[10px] bg-[#FFB800] text-black font-bold px-1.5 py-0.5 rounded">Active</span>}
                  </button>
                  <button
                    onClick={() => handlePersonaSwitch('AICTE_OFFICER')}
                    className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between hover:bg-slate-50 ${role === 'AICTE_OFFICER' ? 'bg-amber-50/70 font-semibold text-amber-900' : 'text-slate-700'}`}
                  >
                    <div>
                      <div className="font-semibold text-slate-900">2. AICTE Officer (Clearance A)</div>
                      <div className="text-[11px] text-slate-500">Scrutiny & Document Inspection</div>
                    </div>
                    {role === 'AICTE_OFFICER' && <span className="text-[10px] bg-[#FFB800] text-black font-bold px-1.5 py-0.5 rounded">Active</span>}
                  </button>
                  <button
                    onClick={() => handlePersonaSwitch('WORKFLOW_APPROVER')}
                    className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between hover:bg-slate-50 ${role === 'WORKFLOW_APPROVER' ? 'bg-amber-50/70 font-semibold text-amber-900' : 'text-slate-700'}`}
                  >
                    <div>
                      <div className="font-semibold text-slate-900">3. Workflow Approver</div>
                      <div className="text-[11px] text-slate-500">Final Sanction & NOC Issuance</div>
                    </div>
                    {role === 'WORKFLOW_APPROVER' && <span className="text-[10px] bg-[#FFB800] text-black font-bold px-1.5 py-0.5 rounded">Active</span>}
                  </button>
                  <button
                    onClick={() => handlePersonaSwitch('ADMIN')}
                    className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between hover:bg-slate-50 ${role === 'ADMIN' ? 'bg-amber-50/70 font-semibold text-amber-900' : 'text-slate-700'}`}
                  >
                    <div>
                      <div className="font-semibold text-slate-900">4. Administrator</div>
                      <div className="text-[11px] text-slate-500">System Governance & Scheduler</div>
                    </div>
                    {role === 'ADMIN' && <span className="text-[10px] bg-[#FFB800] text-black font-bold px-1.5 py-0.5 rounded">Active</span>}
                  </button>
                  <button
                    onClick={() => handlePersonaSwitch('AUDITOR')}
                    className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between hover:bg-slate-50 ${role === 'AUDITOR' ? 'bg-amber-50/70 font-semibold text-amber-900' : 'text-slate-700'}`}
                  >
                    <div>
                      <div className="font-semibold text-slate-900">5. Internal Auditor (Read-Only)</div>
                      <div className="text-[11px] text-slate-500">Statutory Oversight & Audit Logs</div>
                    </div>
                    {role === 'AUDITOR' && <span className="text-[10px] bg-[#FFB800] text-black font-bold px-1.5 py-0.5 rounded">Active</span>}
                  </button>
                </div>
              )}
            </div>

            {/* Notifications Bell with Counter Badge */}
            <div className="relative">
              <button
                onClick={() => setShowNotifMenu(!showNotifMenu)}
                className="relative p-2.5 sm:p-3 text-slate-600 hover:text-[#092D62] bg-slate-50 hover:bg-slate-100 border border-slate-200/70 rounded-xl transition-all shadow-xs"
                title="Notifications"
              >
                <Bell className="h-5 w-5 text-slate-600" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white shadow-xs ring-2 ring-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {showNotifMenu && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl bg-white shadow-2xl border border-slate-200 py-2 z-50">
                  <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100">
                    <span className="font-semibold text-sm text-slate-800">Notifications ({unreadCount} unread)</span>
                    <Link
                      to="/notifications"
                      onClick={() => setShowNotifMenu(false)}
                      className="text-xs text-[#092D62] hover:underline font-semibold"
                    >
                      View All
                    </Link>
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                    {notifications.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-500">No notifications yet.</div>
                    ) : (
                      notifications.slice(0, 5).map((n) => (
                        <div
                          key={n.id}
                          onClick={() => {
                            markAsRead(n.id);
                            setShowNotifMenu(false);
                            if (n.fdr_id) navigate(`/fdrs/${n.fdr_id}`);
                          }}
                          className={`p-3 text-xs cursor-pointer hover:bg-slate-50 transition-colors ${!n.is_read ? 'bg-amber-50/40' : ''}`}
                        >
                          <div className="flex items-start justify-between">
                            <span className="font-semibold text-slate-900">{n.subject}</span>
                            {!n.is_read && <span className="h-2 w-2 rounded-full bg-red-500 mt-1" />}
                          </div>
                          <p className="text-slate-600 mt-1 line-clamp-2">{n.message}</p>
                          <span className="text-[10px] text-slate-400 mt-1 block">
                            {new Date(n.created_at).toLocaleDateString()} • {n.delivery_provider}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Subtle Vertical Divider with Margin */}
            <div className="hidden sm:block h-8 w-px bg-slate-200/90 mx-1" />

            {/* User Profile Avatar & Role Title */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-3.5 p-1.5 pr-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200/80 transition-all text-slate-700"
              >
                <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-gradient-to-br from-[#092D62] to-[#0B1F3A] text-white flex items-center justify-center font-bold text-xs sm:text-sm tracking-wider shadow-xs ring-2 ring-slate-100 shrink-0">
                  {getInitials(user?.name)}
                </div>
                <div className="hidden lg:block text-left leading-tight">
                  <div className="text-xs sm:text-sm font-bold text-slate-900 truncate max-w-[140px]">{user?.name || 'Admin User'}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5 font-medium">{roleDisplay}</div>
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400 hidden sm:block ml-0.5" />
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-56 rounded-xl bg-white shadow-xl border border-slate-200 py-1.5 z-50">
                  <div className="px-4 py-2 border-b border-slate-100">
                    <p className="text-xs font-bold text-slate-900">{user?.name}</p>
                    <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
                  </div>
                  <Link
                    to="/settings"
                    onClick={() => setShowUserMenu(false)}
                    className="flex items-center gap-2 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50"
                  >
                    <Layers className="h-4 w-4 text-slate-400" />
                    <span>Settings & Cloud Status</span>
                  </Link>
                  <button
                    onClick={logout}
                    className="w-full flex items-center gap-2 px-4 py-2 text-xs text-red-600 hover:bg-red-50 text-left"
                  >
                    <LogOut className="h-4 w-4 text-red-500" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
