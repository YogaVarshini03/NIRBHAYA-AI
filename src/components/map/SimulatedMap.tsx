import React, { useState, useEffect } from 'react';
import {
  Navigation,
  Shield,
  Plus,
  Minus,
  Crosshair,
  MapPin,
  Car,
  Building2,
  AlertCircle,
  Radio,
  X,
  Map as MapIcon,
  Layers
} from 'lucide-react';
import { SafePoint, RouteOption } from '../../types';
import { DEMO_SAFE_POINTS } from '../../services/routeService';
import { RealMap } from './RealMap';
import { locationService } from '../../services/locationService';

interface SimulatedMapProps {
  selectedRoute?: RouteOption | null;
  showResponder?: boolean;
  showSafePoints?: boolean;
  userLocationText?: string;
  height?: string;
  interactive?: boolean;
  className?: string;
  responderLocation?: { lat: number; lng: number; name?: string } | null;
  incidentLocation?: { lat: number; lng: number; name?: string } | null;
}

export const SimulatedMap: React.FC<SimulatedMapProps> = ({
  selectedRoute,
  showResponder = true,
  showSafePoints = true,
  userLocationText = 'Connaught Place Sec 4 (Current Pin)',
  height = 'h-[460px]',
  interactive = true,
  className = '',
  responderLocation,
  incidentLocation,
}) => {
  const [mapMode, setMapMode] = useState<'real' | 'tactical'>('real');
  const [zoom, setZoom] = useState(1);
  const [selectedSafePoint, setSelectedSafePoint] = useState<SafePoint | null>(null);
  const [currentGps, setCurrentGps] = useState(locationService.getCurrentLocation());

  useEffect(() => {
    locationService.startContinuousTracking();
    const unsub = locationService.subscribe((loc) => {
      setCurrentGps(loc);
    });
    return unsub;
  }, []);

  const handleZoomIn = () => setZoom((z) => Math.min(1.6, z + 0.15));
  const handleZoomOut = () => setZoom((z) => Math.max(0.75, z - 0.15));
  const handleRecenter = () => setZoom(1);

  if (mapMode === 'real') {
    return (
      <div className={`relative w-full ${height} rounded-2xl overflow-hidden ${className}`}>
        <RealMap
          className={`w-full ${height}`}
          routeGeometry={selectedRoute?.geometry}
          showSafePoints={showSafePoints}
          responderLocation={responderLocation}
          incidentLocation={incidentLocation}
          destination={selectedRoute && currentGps ? {
            lat: currentGps.latitude + 0.02,
            lng: currentGps.longitude + 0.02,
            name: selectedRoute.name,
          } : null}
        />
        {/* Mode switcher overlay */}
        <div className="absolute top-4 right-4 z-[400] flex items-center bg-slate-900/90 backdrop-blur-md p-1 rounded-xl border border-slate-700/60 shadow-xl">
          <button
            onClick={() => setMapMode('real')}
            className="px-2.5 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 bg-cyan-500 text-black shadow-md"
          >
            <MapIcon className="w-3.5 h-3.5" />
            Live Map
          </button>
          <button
            onClick={() => setMapMode('tactical')}
            className="px-2.5 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 text-slate-400 hover:text-white"
          >
            <Layers className="w-3.5 h-3.5" />
            Tactical Grid
          </button>
        </div>
      </div>
    );
  }

  const responderPos = { x: 74, y: 32 };

  return (
    <div
      className={`relative w-full ${height} bg-[#0A0E1A] rounded-2xl border border-white/10 overflow-hidden select-none ${className}`}
    >
      {/* Mode switcher overlay on tactical grid */}
      <div className="absolute top-4 right-4 z-30 flex items-center bg-slate-900/90 backdrop-blur-md p-1 rounded-xl border border-slate-700/60 shadow-xl">
        <button
          onClick={() => setMapMode('real')}
          className="px-2.5 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 text-slate-400 hover:text-white"
        >
          <MapIcon className="w-3.5 h-3.5" />
          Live Map
        </button>
        <button
          onClick={() => setMapMode('tactical')}
          className="px-2.5 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 bg-purple-600 text-white shadow-md"
        >
          <Layers className="w-3.5 h-3.5" />
          Tactical Grid
        </button>
      </div>
      {/* Background City Grid Pattern */}
      <div
        className="absolute inset-0 transition-transform duration-300 ease-out"
        style={{
          transform: `scale(${zoom})`,
          transformOrigin: '50% 50%',
        }}
      >
        <svg className="w-full h-full" viewBox="0 0 1000 500" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            {/* Grid pattern */}
            <pattern id="street-grid" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M 60 0 L 0 0 0 60" fill="none" stroke="rgba(255, 255, 255, 0.04)" strokeWidth="1" />
            </pattern>

            {/* Glowing filter for safe routes */}
            <filter id="glow-route-safer" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <linearGradient id="gradient-safer" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#8B5CF6" />
              <stop offset="100%" stopColor="#10B981" />
            </linearGradient>

            <linearGradient id="gradient-fastest" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3B82F6" />
              <stop offset="100%" stopColor="#F59E0B" />
            </linearGradient>
          </defs>

          {/* Grid background */}
          <rect width="100%" height="100%" fill="url(#street-grid)" />

          {/* Simulated Urban Blocks / Buildings */}
          <g fill="rgba(30, 41, 59, 0.35)" stroke="rgba(255, 255, 255, 0.06)" strokeWidth="1">
            <rect x="5%" y="8%" width="18%" height="22%" rx="8" />
            <rect x="28%" y="10%" width="22%" height="15%" rx="8" />
            <rect x="55%" y="6%" width="25%" height="20%" rx="8" />
            <rect x="8%" y="36%" width="16%" height="28%" rx="8" />
            <rect x="58%" y="32%" width="22%" height="24%" rx="8" />
            <rect x="84%" y="35%" width="12%" height="32%" rx="8" />
            <rect x="12%" y="70%" width="24%" height="20%" rx="8" />
            <rect x="42%" y="74%" width="32%" height="18%" rx="8" />
            <rect x="78%" y="72%" width="18%" height="20%" rx="8" />
          </g>

          {/* Arterial Roads */}
          <g stroke="rgba(255, 255, 255, 0.12)" strokeWidth="14" strokeLinecap="round" fill="none">
            <line x1="0%" y1="32%" x2="100%" y2="32%" />
            <line x1="0%" y1="68%" x2="100%" y2="68%" />
            <line x1="26%" y1="0%" x2="26%" y2="100%" />
            <line x1="52%" y1="0%" x2="52%" y2="100%" />
            <line x1="82%" y1="0%" x2="82%" y2="100%" />
          </g>

          {/* Route path lines */}
          {selectedRoute?.type === 'safer' && (
            <path
              d="M 480 260 L 520 260 L 520 180 L 720 180 L 720 65"
              stroke="url(#gradient-safer)"
              strokeWidth="5"
              fill="none"
              strokeLinecap="round"
              strokeDasharray="8 6"
              filter="url(#glow-route-safer)"
              className="animate-pulse"
            />
          )}

          {selectedRoute?.type === 'fastest' && (
            <path
              d="M 480 260 L 620 260 L 720 65"
              stroke="url(#gradient-fastest)"
              strokeWidth="5"
              fill="none"
              strokeLinecap="round"
              strokeDasharray="6 4"
            />
          )}

          {selectedRoute?.type === 'public' && (
            <path
              d="M 480 260 L 480 340 L 720 340 L 720 65"
              stroke="#06B6D4"
              strokeWidth="5"
              fill="none"
              strokeLinecap="round"
            />
          )}
        </svg>

        {/* User Location Marker (Coordinates: 48%, 52%) */}
        <div
          className="absolute z-20 -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
          style={{ left: '48%', top: '52%' }}
        >
          <div className="relative flex items-center justify-center">
            <span className="absolute w-12 h-12 rounded-full bg-purple-500/25 animate-ping" />
            <span className="absolute w-7 h-7 rounded-full bg-purple-600/40 border border-purple-400" />
            <div className="w-4 h-4 rounded-full bg-gradient-to-r from-purple-400 to-cyan-300 shadow-[0_0_12px_#8B5CF6] z-10" />
          </div>
          {/* Tooltip */}
          <div className="absolute top-7 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-lg bg-navy-950/90 border border-purple-500/40 text-[11px] font-semibold text-purple-200 whitespace-nowrap shadow-lg">
            {userLocationText}
          </div>
        </div>

        {/* Responder Marker */}
        {showResponder && (
          <div
            className="absolute z-20 -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-1000 ease-out"
            style={{ left: `${responderPos.x}%`, top: `${responderPos.y}%` }}
          >
            <div className="relative flex items-center justify-center">
              <span className="absolute w-10 h-10 rounded-full bg-blue-500/25 animate-ping" />
              <div className="w-8 h-8 rounded-full bg-blue-600 border border-blue-300 flex items-center justify-center text-white shadow-glow-blue z-10">
                <Car className="w-4 h-4" />
              </div>
            </div>
            <div className="absolute top-9 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-lg bg-navy-950/90 border border-blue-500/40 text-[10px] font-bold text-blue-300 whitespace-nowrap shadow-lg">
              Officer Arjun (RSP-1042)
            </div>
          </div>
        )}

        {/* Safe Point Markers */}
        {showSafePoints &&
          DEMO_SAFE_POINTS.map((sp) => {
            let icon = <Building2 className="w-3.5 h-3.5 text-cyan-300" />;
            let badgeBg = 'bg-cyan-950/80 border-cyan-500/40 text-cyan-300';
            if (sp.type === 'Police Station') {
              icon = <Shield className="w-3.5 h-3.5 text-blue-300" />;
              badgeBg = 'bg-blue-950/80 border-blue-500/40 text-blue-300';
            } else if (sp.type === 'Hospital') {
              icon = <AlertCircle className="w-3.5 h-3.5 text-emerald-300" />;
              badgeBg = 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300';
            }

            return (
              <div
                key={sp.id}
                onClick={() => setSelectedSafePoint(sp)}
                className="absolute z-10 -translate-x-1/2 -translate-y-1/2 cursor-pointer hover:scale-125 transition-transform"
                style={{ left: `${sp.x}%`, top: `${sp.y}%` }}
              >
                <div className={`p-1.5 rounded-full border shadow-md ${badgeBg}`}>
                  {icon}
                </div>
              </div>
            );
          })}

        {/* Destination Marker */}
        <div
          className="absolute z-20 -translate-x-1/2 -translate-y-1/2 cursor-pointer"
          style={{ left: '72%', top: '13%' }}
        >
          <div className="p-2 rounded-xl bg-purple-600/90 border border-purple-300 text-white shadow-glow-violet flex items-center gap-1.5 text-xs font-bold">
            <MapPin className="w-3.5 h-3.5 text-yellow-300" />
            <span>Demo Central Mall</span>
          </div>
        </div>
      </div>

      {/* Top Banner: Mode Indicator */}
      <div className="absolute top-4 left-4 z-30 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-navy-900/90 border border-white/10 backdrop-blur-md text-xs font-medium text-slate-300">
        <Radio className="w-3.5 h-3.5 text-electric-cyan animate-pulse" />
        <span>Tactical Sector Grid Overlay</span>
      </div>

      {/* Map Interactive Controls */}
      {interactive && (
        <div className="absolute top-4 right-4 z-30 flex flex-col gap-1.5">
          <button
            onClick={handleZoomIn}
            className="w-8 h-8 rounded-lg bg-navy-900/90 border border-white/10 text-slate-200 hover:bg-white/10 flex items-center justify-center transition-colors shadow-md"
            title="Zoom In"
            aria-label="Zoom In"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={handleZoomOut}
            className="w-8 h-8 rounded-lg bg-navy-900/90 border border-white/10 text-slate-200 hover:bg-white/10 flex items-center justify-center transition-colors shadow-md"
            title="Zoom Out"
            aria-label="Zoom Out"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
            onClick={handleRecenter}
            className="w-8 h-8 rounded-lg bg-navy-900/90 border border-white/10 text-slate-200 hover:bg-white/10 flex items-center justify-center transition-colors shadow-md"
            title="Recenter"
            aria-label="Recenter"
          >
            <Crosshair className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Safe Point Popup Card (Rule 22) */}
      {selectedSafePoint && (
        <div className="absolute bottom-4 left-4 right-4 sm:right-auto sm:max-w-sm z-30 p-4 rounded-2xl bg-navy-900/95 border border-purple-500/40 backdrop-blur-xl shadow-2xl animate-in slide-in-from-bottom-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40">
                {selectedSafePoint.type}
              </span>
              <h4 className="text-sm font-bold text-white mt-1">{selectedSafePoint.name}</h4>
              <p className="text-xs text-slate-400 mt-0.5">{selectedSafePoint.distanceKm} km away • {selectedSafePoint.openHours}</p>
            </div>
            <button
              onClick={() => setSelectedSafePoint(null)}
              className="text-slate-400 hover:text-white p-1"
              aria-label="Close popup"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between text-xs">
            <span className="text-slate-400">Emergency Node:</span>
            <span className="font-mono text-purple-300 font-semibold">{selectedSafePoint.contactNumber}</span>
          </div>
        </div>
      )}

      {/* Bottom Map Legend */}
      <div className="absolute bottom-4 right-4 z-20 hidden md:flex items-center gap-3 px-3 py-1.5 rounded-xl bg-navy-900/80 border border-white/10 backdrop-blur-md text-[11px] text-slate-300">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-purple-400" />
          <span>You</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-400" />
          <span>Responder</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
          <span>Safe Havens</span>
        </div>
      </div>
    </div>
  );
};
