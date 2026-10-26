import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from '../components/common/Navbar';
import { Sidebar } from '../components/common/Sidebar';
import { X } from 'lucide-react';

export const DashboardLayout: React.FC = () => {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem('fdr_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleSidebarCollapse = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('fdr_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  return (
    <div className="h-screen flex flex-col bg-[#F5F7FA] overflow-hidden">
      {/* Main Official Header / Navbar (Anchored top, never scrolls) */}
      <Navbar 
        onToggleMobileSidebar={() => setMobileSidebarOpen(true)}
        onToggleDesktopSidebar={toggleSidebarCollapse}
        isSidebarCollapsed={isSidebarCollapsed}
      />

      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Desktop Persistent Left Sidebar (Fixed on the left, does not scroll when right side scrolls) */}
        <aside className="hidden md:flex shrink-0 h-full overflow-hidden">
          <Sidebar 
            isCollapsed={isSidebarCollapsed} 
            onToggleCollapse={toggleSidebarCollapse} 
          />
        </aside>

        {/* Mobile Slide-over Sidebar */}
        {mobileSidebarOpen && (
          <div className="fixed inset-0 z-50 flex md:hidden">
            <div
              className="fixed inset-0 bg-[#0B1F3A]/70 backdrop-blur-sm"
              onClick={() => setMobileSidebarOpen(false)}
            />
            <div className="relative flex-1 flex flex-col max-w-xs w-full bg-[#0B1F3A]">
              <div className="absolute top-0 right-0 -mr-12 pt-2">
                <button
                  type="button"
                  className="ml-1 flex items-center justify-center h-10 w-10 rounded-full text-white"
                  onClick={() => setMobileSidebarOpen(false)}
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              <Sidebar isCollapsed={false} />
            </div>
          </div>
        )}

        {/* Main Content Area (Only the right-side page content scrolls smoothly) */}
        <main className="flex-1 overflow-y-auto min-w-0">
          <div className="p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
