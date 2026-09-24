import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Shield,
  Activity,
  Navigation,
  AlertOctagon,
  Radio,
  FileLock2,
  Users,
  History,
  LayoutDashboard,
  ShieldAlert,
  Map,
  BarChart3,
  Flame,
  Cpu,
  Settings,
  LogOut,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onCloseMobile }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
    if (onCloseMobile) onCloseMobile();
  };

  const navItemClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
      isActive
        ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30 shadow-glow-violet'
        : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'
    }`;

  const navClick = () => {
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <aside className="w-64 h-full bg-navy-950 border-r border-white/[0.08] flex flex-col justify-between select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-white/[0.08]">
        <NavLink to="/dashboard" onClick={navClick} className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-electric-violet to-electric-blue flex items-center justify-center text-white shadow-glow-violet group-hover:scale-105 transition-transform">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-base tracking-wider text-white">NIRBHAYA</span>
              <span className="text-xs font-bold px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40">
                AI
              </span>
            </div>
            <p className="text-[10px] text-slate-400 tracking-tight font-medium">
              Predict. Prevent. Protect.
            </p>
          </div>
        </NavLink>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {/* Core Safety Navigation */}
        <div className="space-y-1">
          <div className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Safety Core
          </div>
          <NavLink to="/dashboard" onClick={navClick} className={navItemClass}>
            <LayoutDashboard className="w-4 h-4 text-purple-400" />
            <span>Overview</span>
          </NavLink>
          <NavLink to="/risk-analysis" onClick={navClick} className={navItemClass}>
            <Activity className="w-4 h-4 text-cyan-400" />
            <span>Risk Intelligence</span>
          </NavLink>
          <NavLink to="/safe-route" onClick={navClick} className={navItemClass}>
            <Navigation className="w-4 h-4 text-emerald-400" />
            <span>Safe Route</span>
          </NavLink>
          <NavLink to="/sos" onClick={navClick} className={navItemClass}>
            <AlertOctagon className="w-4 h-4 text-red-400 animate-pulse" />
            <span className="font-semibold text-red-300">Silent SOS</span>
          </NavLink>
          <NavLink to="/live-tracking" onClick={navClick} className={navItemClass}>
            <Radio className="w-4 h-4 text-blue-400" />
            <span>Live Tracking</span>
          </NavLink>
          <NavLink to="/evidence" onClick={navClick} className={navItemClass}>
            <FileLock2 className="w-4 h-4 text-amber-400" />
            <span>Evidence Locker</span>
          </NavLink>
          <NavLink to="/contacts" onClick={navClick} className={navItemClass}>
            <Users className="w-4 h-4 text-indigo-400" />
            <span>Trusted Contacts</span>
          </NavLink>
          <NavLink to="/history" onClick={navClick} className={navItemClass}>
            <History className="w-4 h-4 text-slate-400" />
            <span>Safety History</span>
          </NavLink>
        </div>

        {/* Responder Section */}
        <div className="space-y-1 pt-2 border-t border-white/5">
          <div className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
            <span>Responder Mode</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300">HQ</span>
          </div>
          <NavLink to="/responder" onClick={navClick} className={navItemClass}>
            <Shield className="w-4 h-4 text-blue-400" />
            <span>Responder Dashboard</span>
          </NavLink>
          <NavLink to="/responder/active" onClick={navClick} className={navItemClass}>
            <ShieldAlert className="w-4 h-4 text-red-400" />
            <span className="flex items-center justify-between flex-1">
              <span>Active Emergency</span>
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
            </span>
          </NavLink>
          <NavLink to="/responder/map" onClick={navClick} className={navItemClass}>
            <Map className="w-4 h-4 text-cyan-400" />
            <span>Responder Map</span>
          </NavLink>
        </div>

        {/* Analytics Section */}
        <div className="space-y-1 pt-2 border-t border-white/5">
          <div className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Intelligence & Ops
          </div>
          <NavLink to="/analytics" end onClick={navClick} className={navItemClass}>
            <BarChart3 className="w-4 h-4 text-purple-400" />
            <span>Safety Analytics</span>
          </NavLink>
          <NavLink to="/analytics/heatmap" onClick={navClick} className={navItemClass}>
            <Flame className="w-4 h-4 text-orange-400" />
            <span>Incident Heatmap</span>
          </NavLink>
          <NavLink to="/analytics/system" onClick={navClick} className={navItemClass}>
            <Cpu className="w-4 h-4 text-emerald-400" />
            <span>System Monitoring</span>
          </NavLink>
        </div>
      </div>

      {/* Bottom Profile and Settings */}
      <div className="p-3 border-t border-white/[0.08] space-y-2 bg-navy-900/60">
        <NavLink to="/settings" onClick={navClick} className={navItemClass}>
          <Settings className="w-4 h-4 text-slate-400" />
          <span>Settings</span>
        </NavLink>

        {user && (
          <div className="p-2.5 rounded-xl bg-navy-950/80 border border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-500 flex items-center justify-center text-white font-bold text-xs shrink-0">
                {user.name.charAt(0)}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white truncate">{user.name}</p>
                <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg hover:bg-white/5 transition-colors"
              title="Logout"
              aria-label="Logout"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};
