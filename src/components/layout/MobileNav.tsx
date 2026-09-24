import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Navigation, AlertOctagon, Shield, FileLock2 } from 'lucide-react';

interface MobileNavProps {
  onQuickSosClick?: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ onQuickSosClick }) => {
  const itemClass = ({ isActive }: { isActive: boolean }) =>
    `flex flex-col items-center justify-center py-2 px-3 text-[10px] font-medium transition-colors ${
      isActive ? 'text-purple-400 font-bold' : 'text-slate-400 hover:text-slate-200'
    }`;

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-navy-950/95 backdrop-blur-xl border-t border-white/[0.08] flex items-center justify-around z-40 px-2 select-none">
      <NavLink to="/dashboard" className={itemClass}>
        <LayoutDashboard className="w-5 h-5 mb-0.5" />
        <span>Overview</span>
      </NavLink>

      <NavLink to="/safe-route" className={itemClass}>
        <Navigation className="w-5 h-5 mb-0.5" />
        <span>Routes</span>
      </NavLink>

      {/* Floating Center SOS Button */}
      <NavLink
        to="/sos"
        onClick={onQuickSosClick}
        className="-mt-5 flex flex-col items-center group"
      >
        <div className="w-13 h-13 rounded-full bg-gradient-to-r from-red-600 to-red-700 border-2 border-red-400/50 flex items-center justify-center text-white shadow-glow-red group-hover:scale-105 transition-transform p-3">
          <AlertOctagon className="w-6 h-6 animate-pulse" />
        </div>
        <span className="text-[10px] font-bold text-red-400 mt-1 uppercase tracking-wider">
          SOS
        </span>
      </NavLink>

      <NavLink to="/responder" className={itemClass}>
        <Shield className="w-5 h-5 mb-0.5" />
        <span>Responder</span>
      </NavLink>

      <NavLink to="/evidence" className={itemClass}>
        <FileLock2 className="w-5 h-5 mb-0.5" />
        <span>Vault</span>
      </NavLink>
    </nav>
  );
};
