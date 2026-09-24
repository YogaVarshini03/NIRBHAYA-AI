import React, { useState } from 'react';
import {
  Bell,
  Menu,
  ShieldCheck,
  Radio,
  Sun,
  Moon,
  X,
  CheckCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Badge } from '../common/Badge';

interface HeaderProps {
  onOpenMobileMenu: () => void;
  pageTitle?: string;
}

export const Header: React.FC<HeaderProps> = ({ onOpenMobileMenu, pageTitle }) => {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([
    {
      id: 'n1',
      title: 'AI Environmental Scan Updated',
      desc: 'Ambient lighting and pedestrian crowd index verified safe.',
      time: '2 mins ago',
      read: false,
    },
    {
      id: 'n2',
      title: 'Safe Route Recommended',
      desc: 'New low-risk corridor mapped to Demo Central Mall.',
      time: '15 mins ago',
      read: false,
    },
    {
      id: 'n3',
      title: 'Responder Drill Standby',
      desc: 'Officer Arjun Kumar unit synced in immediate sector.',
      time: '1 hour ago',
      read: true,
    }
  ]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  return (
    <header className="h-16 px-4 md:px-8 bg-navy-950/80 backdrop-blur-xl border-b border-white/[0.08] flex items-center justify-between z-30 select-none">
      {/* Left: Mobile Toggle & Page Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        {pageTitle && (
          <h1 className="text-base sm:text-lg font-bold text-white tracking-tight hidden sm:block">
            {pageTitle}
          </h1>
        )}
      </div>

      {/* Center: Global Demo Mode & Network Indicators (Rule 4 & 7) */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Live Network & Backend Indicator */}
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-200 text-xs font-semibold shadow-glow-emerald">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>LIVE SAFETY NETWORK</span>
          <span className="hidden md:inline text-emerald-300/80 font-normal">
            — Railway Backend & WSS Telemetry Connected
          </span>
        </div>

        {/* Network status */}
        <div className="hidden xl:flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>AI Safety Network Online</span>
        </div>
      </div>

      {/* Right: Security Tag, Theme Toggle, Notifications, User */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Security indicator (Rule 7 & 49) */}
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-navy-850 border border-white/10 text-[11px] text-slate-300">
          <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
          <span>Secure Demo Session</span>
        </div>

        {/* Theme Toggle (Rule 38) */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4 text-purple-300" />}
        </button>

        {/* Notifications Popover */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 relative transition-colors"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-electric-cyan animate-ping" />
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-3 w-80 sm:w-96 rounded-2xl bg-navy-900 border border-white/10 backdrop-blur-2xl shadow-2xl p-4 z-50 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Live Telemetry Alerts
                  </span>
                  {unreadCount > 0 && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 font-bold">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={markAllRead}
                    className="text-[11px] text-purple-400 hover:text-purple-300 flex items-center gap-1"
                    title="Mark all as read"
                  >
                    <CheckCheck className="w-3 h-3" /> Read all
                  </button>
                  <button
                    onClick={() => setShowNotifications(false)}
                    className="text-slate-400 hover:text-white p-1"
                    aria-label="Close notifications"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {notifications.map((item) => (
                  <div
                    key={item.id}
                    className={`p-3 rounded-xl border text-xs transition-colors ${
                      item.read
                        ? 'bg-navy-950/40 border-white/5 text-slate-400'
                        : 'bg-navy-800/80 border-purple-500/30 text-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-100">{item.title}</span>
                      <span className="text-[10px] text-slate-400">{item.time}</span>
                    </div>
                    <p className="mt-1 text-slate-400 leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User Mini Profile Avatar */}
        {user && (
          <div className="flex items-center gap-2.5 pl-2 border-l border-white/10">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-electric-violet to-electric-blue flex items-center justify-center text-white text-xs font-bold shadow-glow-violet">
              {user.name.charAt(0)}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
