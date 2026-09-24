import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { MobileNav } from './MobileNav';
import { EmergencyWorkflowModal } from '../sos/EmergencyWorkflowModal';

export const AppLayout: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  // Compute readable page title from route
  const getPageTitle = (path: string) => {
    if (path.includes('/risk-analysis')) return 'AI Risk Intelligence';
    if (path.includes('/safe-route')) return 'Safe Route Intelligence';
    if (path.includes('/sos')) return 'Silent SOS Response';
    if (path.includes('/live-tracking')) return 'Live Telemetry & GPS Tracking';
    if (path.includes('/evidence')) return 'Secure Evidence Locker';
    if (path.includes('/contacts')) return 'Trusted Emergency Guardians';
    if (path.includes('/history')) return 'Safety History & Telemetry Logs';
    if (path.includes('/responder/active')) return 'Active Emergency Response Command';
    if (path.includes('/responder/map')) return 'Tactical Responder Map';
    if (path.includes('/responder')) return 'Responder Operations Hub';
    if (path.includes('/analytics/heatmap')) return 'Metropolitan Incident Heatmap';
    if (path.includes('/analytics/system')) return 'System Node Health & Architecture';
    if (path.includes('/analytics')) return 'Safety Analytics & Metrics';
    if (path.includes('/settings')) return 'System Settings & Privacy';
    return 'Safety Command Overview';
  };

  return (
    <div className="flex h-screen bg-[#070A11] text-slate-100 overflow-hidden font-sans">
      {/* Desktop Fixed Left Sidebar */}
      <div className="hidden lg:block shrink-0 h-full">
        <Sidebar />
      </div>

      {/* Mobile Drawer Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="relative w-72 max-w-[80vw] h-full z-10 animate-in slide-in-from-left duration-250">
            <Sidebar onCloseMobile={() => setIsMobileMenuOpen(false)} />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <Header
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          pageTitle={getPageTitle(location.pathname)}
        />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 pb-24 lg:pb-8">
          <div className="max-w-7xl mx-auto w-full">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileNav />

      {/* Global Emergency Workflow Simulation Modal */}
      <EmergencyWorkflowModal />
    </div>
  );
};
