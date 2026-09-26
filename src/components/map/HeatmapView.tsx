import React, { useState, useEffect } from 'react';
import { apiUrl } from '../../services/apiConfig';
import { Badge } from '../common/Badge';
import { ShieldCheck, AlertTriangle, AlertOctagon, Info, Clock, MapPin, RefreshCw } from 'lucide-react';
import { RealMap } from './RealMap';

interface HeatmapIncident {
  id: string;
  lat: number;
  lng: number;
  riskScore: number;
  riskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  locationName: string;
  status: string;
  timestamp: string;
}

export const HeatmapView: React.FC = () => {
  const [incidents, setIncidents] = useState<HeatmapIncident[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<HeatmapIncident | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHeatmap = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(apiUrl('/api/analytics/heatmap'));
      if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to load heatmap`);
      const data = await res.json();
      if (data.success) {
        setIncidents(data.incidents || []);
        if (data.incidents?.length > 0) {
          setSelectedIncident(data.incidents[0]);
        }
      } else {
        setError(data.message || 'NO INCIDENT DATA AVAILABLE');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHeatmap();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-purple-400">
            Database Incident Coordinates
          </span>
          <h3 className="text-xl font-extrabold text-white mt-0.5">
            Operational Incident Distribution
          </h3>
          <p className="text-xs text-slate-400">
            Rendered exclusively from stored distress coordinates in the production database.
          </p>
        </div>

        <button
          onClick={fetchHeatmap}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-navy-900 border border-white/10 hover:border-white/20 text-xs text-slate-300 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Database</span>
        </button>
      </div>

      {loading ? (
        <div className="p-16 text-center text-slate-400 text-sm">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-purple-400" />
          Loading authentic incident coordinates from database...
        </div>
      ) : incidents.length === 0 ? (
        <div className="p-16 text-center rounded-3xl bg-navy-950/60 border border-white/10 space-y-3">
          <ShieldCheck className="w-12 h-12 text-emerald-400 mx-auto" />
          <h4 className="text-base font-bold text-white uppercase tracking-wider">
            NO INCIDENT DATA AVAILABLE
          </h4>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            The emergency incident database currently contains 0 distress records with geolocations. Synthetic or random points are strictly prevented.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Real Leaflet Map with actual incident coordinates */}
          <div className="lg:col-span-2 relative h-[480px] rounded-3xl overflow-hidden border border-white/10">
            <RealMap
              centerLat={selectedIncident?.lat || incidents[0]?.lat}
              centerLng={selectedIncident?.lng || incidents[0]?.lng}
              incidentLocation={
                selectedIncident
                  ? {
                      lat: selectedIncident.lat,
                      lng: selectedIncident.lng,
                      name: `${selectedIncident.id} (${selectedIncident.riskLevel})`,
                    }
                  : null
              }
              className="h-full w-full"
            />
          </div>

          {/* Right Col: Incident Details & Cluster List */}
          <div className="space-y-4">
            <div className="p-5 rounded-2xl bg-navy-900/60 border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Selected Incident
                </span>
                {selectedIncident && (
                  <Badge
                    variant={
                      selectedIncident.riskLevel === 'CRITICAL'
                        ? 'critical'
                        : selectedIncident.riskLevel === 'HIGH'
                        ? 'high'
                        : 'moderate'
                    }
                    size="sm"
                  >
                    {selectedIncident.riskLevel}
                  </Badge>
                )}
              </div>

              {selectedIncident ? (
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-slate-400">Incident ID:</span>
                    <span className="font-mono text-purple-300 font-bold">{selectedIncident.id}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-slate-400">Risk Score:</span>
                    <span className="font-mono font-bold text-red-400">
                      {selectedIncident.riskScore} / 100
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-slate-400">Location:</span>
                    <span className="font-semibold text-white truncate max-w-[170px]">
                      {selectedIncident.locationName || 'GPS Fix'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-slate-400">Coordinates:</span>
                    <span className="font-mono text-cyan-300">
                      {selectedIncident.lat.toFixed(4)}, {selectedIncident.lng.toFixed(4)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-slate-400">Status:</span>
                    <span className="font-mono text-emerald-400 font-semibold">{selectedIncident.status}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300 pt-1 border-t border-white/5">
                    <span className="text-slate-400">Logged At:</span>
                    <span className="text-slate-400 text-[11px]">
                      {new Date(selectedIncident.timestamp).toLocaleString()}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-400">Select an incident from below.</p>
              )}
            </div>

            {/* List of actual stored incidents */}
            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Stored Incident Records ({incidents.length})
              </span>
              {incidents.map((inc) => (
                <div
                  key={inc.id}
                  onClick={() => setSelectedIncident(inc)}
                  className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                    selectedIncident?.id === inc.id
                      ? 'bg-purple-950/40 border-purple-500/50 shadow-glow-violet'
                      : 'bg-navy-900/40 border-white/5 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold">
                    <span className="text-white font-mono">{inc.id}</span>
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                        inc.riskLevel === 'CRITICAL'
                          ? 'bg-red-500/20 text-red-300'
                          : 'bg-amber-500/20 text-amber-300'
                      }`}
                    >
                      {inc.riskScore}/100
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 truncate mt-1">
                    {inc.locationName || `${inc.lat.toFixed(4)}, ${inc.lng.toFixed(4)}`}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
