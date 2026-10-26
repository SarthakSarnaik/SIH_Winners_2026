import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  PlusCircle,
  CheckSquare,
  RefreshCw,
  ArrowUpRight,
  Building,
  Bell,
  BarChart3,
  Users,
  ShieldAlert,
  Settings,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';

interface NavItem {
  to: string;
  label: string;
  icon: any;
  badge?: number;
  section?: string;
}

interface SidebarProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isCollapsed = false, onToggleCollapse }) => {
  const { role } = useAuth();
  const { unreadCount } = useNotifications();

  // Navigation items based on role
  const getNavLinks = (): { mainLinks: NavItem[]; adminLinks: NavItem[] } => {
    const dashboardLink: NavItem =
      role === 'COLLEGE_USER'
        ? { to: '/college/dashboard', label: 'Dashboard', icon: LayoutDashboard }
        : (role === 'AICTE_OFFICER' || role === 'WORKFLOW_APPROVER')
        ? { to: '/officer/dashboard', label: 'Dashboard', icon: LayoutDashboard }
        : role === 'AUDITOR'
        ? { to: '/admin/audit', label: 'Auditor View', icon: ShieldAlert }
        : { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard };

    const mainLinks: NavItem[] = [
      dashboardLink,
      { to: '/fdrs', label: 'FDR Registry', icon: FileText },
    ];

    if (role === 'COLLEGE_USER' || role === 'ADMIN') {
      mainLinks.push({ to: '/fdrs/new', label: 'Submit New FDR', icon: PlusCircle });
    }

    if (role === 'AICTE_OFFICER' || role === 'WORKFLOW_APPROVER' || role === 'ADMIN') {
      mainLinks.push({ to: '/officer/queue', label: 'Scrutiny Queue', icon: CheckSquare });
    }

    mainLinks.push(
      { to: '/renewals', label: 'Renewals & Replace', icon: RefreshCw },
      { to: '/releases', label: 'Release / Refunds', icon: ArrowUpRight },
      { to: '/notifications', label: 'Notifications', icon: Bell, badge: unreadCount },
      { to: '/reports', label: 'Reports & Analytics', icon: BarChart3 }
    );

    if (role === 'AICTE_OFFICER' || role === 'WORKFLOW_APPROVER' || role === 'ADMIN' || role === 'AUDITOR') {
      mainLinks.push({ to: '/admin/audit', label: 'Audit Trail', icon: ShieldAlert });
    }

    const adminLinks: NavItem[] = [];
    if (role === 'ADMIN') {
      adminLinks.push({ to: '/admin/users', label: 'User Management', icon: Users });
    }
    adminLinks.push({ to: '/settings', label: 'Settings & System', icon: Settings });

    return { mainLinks, adminLinks };
  };

  const { mainLinks, adminLinks } = getNavLinks();

  return (
    <aside
      className={`${
        isCollapsed ? 'w-20' : 'w-64'
      } bg-[#0B1F3A] text-slate-200 flex flex-col shrink-0 h-full select-none transition-all duration-300 ease-in-out border-r border-slate-800/60`}
    >
      {/* Sidebar Top Collapse Toggle Bar */}
      {onToggleCollapse && (
        <div
          className={`py-3 px-3.5 flex items-center ${
            isCollapsed ? 'justify-center' : 'justify-between'
          } border-b border-slate-800/80 bg-[#07162C]/40`}
        >
          {!isCollapsed && (
            <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase pl-1">
              Navigation
            </span>
          )}
          <button
            onClick={onToggleCollapse}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
        </div>
      )}

      {/* Navigation Links (Independent smooth scrolling if items overflow vertically) */}
      <nav className={`flex-1 ${isCollapsed ? 'p-2 space-y-2' : 'p-3 space-y-1'} overflow-y-auto overflow-x-hidden`}>
        {mainLinks.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              title={isCollapsed ? item.label : undefined}
              className={({ isActive }) =>
                `flex items-center ${
                  isCollapsed ? 'justify-center p-3' : 'justify-between px-3.5 py-2.5'
                } rounded-xl text-xs font-medium transition-all group relative ${
                  isActive
                    ? 'bg-[#FFB800] text-[#0B1F3A] font-bold shadow-sm'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
                    <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-[#0B1F3A]' : 'text-slate-300'}`} />
                    {!isCollapsed && <span className="truncate">{item.label}</span>}
                  </div>

                  {/* Badge */}
                  {item.badge && item.badge > 0 ? (
                    isCollapsed ? (
                      <span className="absolute top-2 right-2 h-2.5 w-2.5 bg-red-500 rounded-full ring-2 ring-[#0B1F3A]" />
                    ) : (
                      <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs">
                        {item.badge}
                      </span>
                    )
                  ) : null}

                  {/* Floating tooltip when collapsed */}
                  {isCollapsed && (
                    <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-[#092D62] text-white text-xs font-semibold rounded-lg shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 border border-slate-700">
                      {item.label}
                      {item.badge && item.badge > 0 ? ` (${item.badge})` : ''}
                    </div>
                  )}
                </>
              )}
            </NavLink>
          );
        })}

        {/* Administration Section Divider / Header */}
        {adminLinks.length > 0 && (
          isCollapsed ? (
            <div className="my-2 border-t border-slate-800/80 mx-2" title="Administration" />
          ) : (
            <div className="pt-4 pb-1 px-3.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                ADMINISTRATION
              </span>
            </div>
          )
        )}

        {adminLinks.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              title={isCollapsed ? item.label : undefined}
              className={({ isActive }) =>
                `flex items-center ${
                  isCollapsed ? 'justify-center p-3' : 'justify-between px-3.5 py-2.5'
                } rounded-xl text-xs font-medium transition-all group relative ${
                  isActive
                    ? 'bg-[#FFB800] text-[#0B1F3A] font-bold shadow-sm'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
                    <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-[#0B1F3A]' : 'text-slate-300'}`} />
                    {!isCollapsed && <span className="truncate">{item.label}</span>}
                  </div>

                  {/* Floating tooltip when collapsed */}
                  {isCollapsed && (
                    <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-[#092D62] text-white text-xs font-semibold rounded-lg shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 border border-slate-700">
                      {item.label}
                    </div>
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom Technical Support Notice */}
      {isCollapsed ? (
        <div className="p-3 border-t border-slate-800/80 flex justify-center bg-[#07162C]/60 relative group">
          <button
            type="button"
            className="p-1.5 text-slate-400 hover:text-[#FFB800] transition-colors"
            title="AICTE Helpdesk"
          >
            <HelpCircle className="h-4 w-4 text-[#FFB800]" />
          </button>
          <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-[#092D62] text-white text-[11px] rounded-lg shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 border border-slate-700">
            AICTE Helpdesk: fdr-support@aicte-india.org
          </div>
        </div>
      ) : (
        <div className="p-3.5 border-t border-slate-800/80 text-[11px] text-slate-400 bg-[#07162C]/60">
          <div className="flex items-center gap-1.5 text-slate-300 font-semibold mb-1">
            <HelpCircle className="h-3.5 w-3.5 text-[#FFB800]" />
            <span>Need Assistance?</span>
          </div>
          <p className="text-[10px] text-slate-400 leading-tight">
            AICTE ICT Helpdesk: fdr-support@aicte-india.org
          </p>
        </div>
      )}
    </aside>
  );
};

