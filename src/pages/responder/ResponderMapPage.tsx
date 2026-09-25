import React, { useState } from 'react';
import {
  Map,
  Layers,
  Shield,
  Car,
  AlertOctagon,
  Radio,
  Eye,
  Sliders,
  Filter
} from 'lucide-react';
import { SimulatedMap } from '../../components/map/SimulatedMap';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { useEmergency } from '../../context/EmergencyContext';

export const ResponderMapPage: React.FC = () => {
  const { activeIncident } = useEmergency();
  const [showPatrols, setShowPatrols] = useState(true);
  const [showSanctuaries, setShowSanctuaries] = useState(true);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
              Tactical Sector Visualizer
            </span>
            <Badge variant="cyan" size="sm" dot>
              Real-time Feeds
            </Badge>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
            Tactical Responder Map
          </h2>
          <p className="text-sm text-slate-400">
            Metropolitan sector grid with multi-agency responder nodes, emergency beacons, and safe points.
          </p>
        </div>

        {/* Layer Toggles */}
        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={() => setShowPatrols(!showPatrols)}
            className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 transition-colors ${
              showPatrols
                ? 'bg-blue-600/20 border-blue-500/40 text-blue-300'
                : 'bg-navy-900 border-white/10 text-slate-400'
            }`}
          >
            <Car className="w-3.5 h-3.5" /> Patrol Units
          </button>
          <button
            onClick={() => setShowSanctuaries(!showSanctuaries)}
            className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 transition-colors ${
              showSanctuaries
                ? 'bg-emerald-600/20 border-emerald-500/40 text-emerald-300'
                : 'bg-navy-900 border-white/10 text-slate-400'
            }`}
          >
            <Shield className="w-3.5 h-3.5" /> Sanctuaries
          </button>
        </div>
      </div>

      {/* Large Tactical Map */}
      <SimulatedMap
        showResponder={showPatrols}
        showSafePoints={showSanctuaries}
        height="h-[640px]"
        userLocationText={activeIncident?.id ? `Active Incident Node ${activeIncident.id}` : 'Tactical Sector Monitoring Node'}
      />
    </div>
  );
};
