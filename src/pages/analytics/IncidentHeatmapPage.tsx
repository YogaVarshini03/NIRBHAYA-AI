import React from 'react';
import { Flame, Info, ShieldCheck, MapPin } from 'lucide-react';
import { HeatmapView } from '../../components/map/HeatmapView';
import { Badge } from '../../components/common/Badge';

export const IncidentHeatmapPage: React.FC = () => {
  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-orange-400">
              Metropolitan Risk Density
            </span>
            <Badge variant="high" size="sm" dot>
              Sector Heatmap
            </Badge>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
            Incident Heatmap & Threat Zones
          </h2>
          <p className="text-sm text-slate-400">
            Spatial distribution of historical distress signals, street illumination gradients, and patrol frequencies.
          </p>
        </div>
      </div>

      {/* Heatmap View */}
      <HeatmapView />
    </div>
  );
};
