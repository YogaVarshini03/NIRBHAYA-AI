import React, { useState } from 'react';
import { HeatmapZone, HEATMAP_ZONES } from '../../services/analyticsService';
import { Badge } from '../common/Badge';
import { ShieldCheck, AlertTriangle, AlertOctagon, Info, Clock, MapPin } from 'lucide-react';

export const HeatmapView: React.FC = () => {
  const [selectedZone, setSelectedZone] = useState<HeatmapZone>(HEATMAP_ZONES[0]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Heatmap Interactive Visual Map */}
        <div className="lg:col-span-2 relative h-[480px] bg-[#070A12] rounded-3xl border border-white/10 overflow-hidden select-none">
          {/* Subtle Grid Lines */}
          <div className="absolute inset-0 bg-grid-pattern opacity-30" />

          {/* Simulated Street Grid Arteries */}
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <g stroke="rgba(255, 255, 255, 0.08)" strokeWidth="6" fill="none">
              <line x1="10%" y1="0%" x2="10%" y2="100%" />
              <line x1="35%" y1="0%" x2="35%" y2="100%" />
              <line x1="65%" y1="0%" x2="65%" y2="100%" />
              <line x1="90%" y1="0%" x2="90%" y2="100%" />
              <line x1="0%" y1="25%" x2="100%" y2="25%" />
              <line x1="0%" y1="55%" x2="100%" y2="55%" />
              <line x1="0%" y1="85%" x2="100%" y2="85%" />
            </g>

            {/* Glowing Risk Heatmap Circles */}
            {HEATMAP_ZONES.map((zone) => {
              let fillGradient = 'rgba(16, 185, 129, 0.25)';
              let strokeColor = '#10B981';
              if (zone.riskLevel === 'MODERATE') {
                fillGradient = 'rgba(245, 158, 11, 0.28)';
                strokeColor = '#F59E0B';
              } else if (zone.riskLevel === 'HIGH') {
                fillGradient = 'rgba(239, 68, 68, 0.35)';
                strokeColor = '#EF4444';
              }

              const isSelected = selectedZone.id === zone.id;

              return (
                <g
                  key={zone.id}
                  className="cursor-pointer transition-all duration-300"
                  onClick={() => setSelectedZone(zone)}
                >
                  {/* Outer glow ring */}
                  <circle
                    cx={`${zone.x}%`}
                    cy={`${zone.y}%`}
                    r={zone.radius}
                    fill={fillGradient}
                    stroke={strokeColor}
                    strokeWidth={isSelected ? '3' : '1.5'}
                    strokeDasharray={isSelected ? '6 4' : 'none'}
                    className={isSelected ? 'animate-pulse' : ''}
                    style={{
                      filter: `drop-shadow(0 0 15px ${strokeColor})`,
                    }}
                  />
                  {/* Center Dot */}
                  <circle
                    cx={`${zone.x}%`}
                    cy={`${zone.y}%`}
                    r={isSelected ? 8 : 5}
                    fill={strokeColor}
                  />
                </g>
              );
            })}
          </svg>

          {/* Interactive zone labels */}
          {HEATMAP_ZONES.map((zone) => (
            <button
              key={`label_${zone.id}`}
              onClick={() => setSelectedZone(zone)}
              className={`absolute -translate-x-1/2 -translate-y-1/2 px-2.5 py-1 rounded-xl text-[10px] font-bold tracking-wider backdrop-blur-md transition-all ${
                selectedZone.id === zone.id
                  ? 'bg-navy-950 text-white border-2 border-purple-400 shadow-glow-violet scale-105 z-30'
                  : 'bg-navy-900/80 text-slate-300 border border-white/10 hover:border-white/30 z-20'
              }`}
              style={{ left: `${zone.x}%`, top: `${zone.y - 7}%` }}
            >
              {zone.name.split(' ')[0]} ({zone.score})
            </button>
          ))}

          {/* Floating Instructions */}
          <div className="absolute top-4 left-4 z-30 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-navy-900/90 border border-white/10 backdrop-blur-md text-xs text-slate-300">
            <Info className="w-4 h-4 text-electric-cyan" />
            <span>Click any color zone to inspect safety telemetry</span>
          </div>

          {/* Legend */}
          <div className="absolute bottom-4 left-4 z-30 flex items-center gap-4 px-3.5 py-2 rounded-xl bg-navy-900/90 border border-white/10 backdrop-blur-md text-xs">
            <div className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-3 h-3 rounded-full bg-emerald-500/40 border border-emerald-400" />
              <span>Low (0-30)</span>
            </div>
            <div className="flex items-center gap-1.5 text-amber-400">
              <span className="w-3 h-3 rounded-full bg-amber-500/40 border border-amber-400" />
              <span>Moderate (31-60)</span>
            </div>
            <div className="flex items-center gap-1.5 text-red-400">
              <span className="w-3 h-3 rounded-full bg-red-500/40 border border-red-400" />
              <span>High (61-100)</span>
            </div>
          </div>
        </div>

        {/* Selected Zone Detail Panel */}
        <div className="p-6 rounded-3xl bg-navy-800/60 border border-white/10 backdrop-blur-xl flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Badge
                variant={
                  selectedZone.riskLevel === 'LOW'
                    ? 'low'
                    : selectedZone.riskLevel === 'MODERATE'
                    ? 'moderate'
                    : 'high'
                }
                dot
              >
                {selectedZone.riskLevel} RISK ZONE
              </Badge>
              <span className="text-xs text-slate-400 font-mono">ID: {selectedZone.id.toUpperCase()}</span>
            </div>

            <div>
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <MapPin className="w-5 h-5 text-purple-400 shrink-0" />
                <span>{selectedZone.name}</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> Telemetry updated {selectedZone.lastUpdated}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-3 rounded-xl bg-navy-900/80 border border-white/5">
                <span className="text-[11px] text-slate-400">Aggregated Score</span>
                <div className="text-2xl font-extrabold text-white mt-0.5">{selectedZone.score} <span className="text-xs text-slate-400 font-normal">/ 100</span></div>
              </div>
              <div className="p-3 rounded-xl bg-navy-900/80 border border-white/5">
                <span className="text-[11px] text-slate-400">Past Incidents (12m)</span>
                <div className="text-2xl font-extrabold text-white mt-0.5">{selectedZone.incidentCount}</div>
              </div>
            </div>

            <div className="space-y-2.5 pt-2">
              <div className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-navy-900/60 border border-white/5">
                <span className="text-slate-400">Patrol Frequency:</span>
                <span className="font-semibold text-slate-200">{selectedZone.patrolFrequency}</span>
              </div>
              <div className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-navy-900/60 border border-white/5">
                <span className="text-slate-400">Street Lighting:</span>
                <span className="font-semibold text-slate-200">{selectedZone.lightingQuality}</span>
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-navy-900/60 border border-white/5 text-xs text-slate-400 leading-relaxed">
            <span className="font-semibold text-slate-200">AI Safety Advisory: </span>
            {selectedZone.riskLevel === 'LOW' &&
              'High commercial footfall and continuous active surveillance make this sector optimal for night transit.'}
            {selectedZone.riskLevel === 'MODERATE' &&
              'Exercise standard caution. Keep live location sharing active when traversing through bypass alleys.'}
            {selectedZone.riskLevel === 'HIGH' &&
              'Avoid solo traversal past 10 PM. Automated rerouting will bypass this zone whenever viable.'}
          </div>
        </div>
      </div>
    </div>
  );
};
