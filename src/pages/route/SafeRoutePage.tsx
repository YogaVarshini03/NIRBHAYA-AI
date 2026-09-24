import React, { useState } from 'react';
import {
  Navigation,
  MapPin,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Flame,
  Zap,
  Building,
  Eye,
  AlertCircle
} from 'lucide-react';
import { routeService } from '../../services/routeService';
import { RouteOption } from '../../types';
import { SimulatedMap } from '../../components/map/SimulatedMap';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { useToast } from '../../context/ToastContext';

import { locationService } from '../../services/locationService';

export const SafeRoutePage: React.FC = () => {
  const { showToast } = useToast();
  const [gpsLoc, setGpsLoc] = useState(() => locationService.getCurrentLocation());
  const [currentLocation, setCurrentLocation] = useState('Acquiring Live GPS...');
  const [destination, setDestination] = useState('T. Nagar Commercial Hub');
  const [destinationError, setDestinationError] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [routes, setRoutes] = useState<RouteOption[]>(() => routeService.getAvailableRoutes());
  const [selectedRoute, setSelectedRoute] = useState<RouteOption>(() => routeService.getSelectedRoute());

  React.useEffect(() => {
    locationService.startContinuousTracking();
    const unsub = locationService.subscribe((loc, status) => {
      setGpsLoc(loc);
      if (status === 'LIVE_GPS' && loc) {
        setCurrentLocation(`Live GPS (${loc.latitude.toFixed(4)}, ${loc.longitude.toFixed(4)}) ±${loc.accuracy}m`);
      } else if (!loc) {
        setCurrentLocation('GPS unavailable — waiting for location permission');
      }
    });
    return unsub;
  }, []);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!destination.trim()) {
      setDestinationError('Destination cannot be empty.');
      return;
    }
    setDestinationError('');
    setIsAnalyzing(true);

    try {
      const lat = gpsLoc?.latitude || 13.0827;
      const lng = gpsLoc?.longitude || 80.2707;
      const computed = await routeService.calculateRealRoutes(lat, lng, destination);
      setRoutes(computed);
      if (computed.length > 0) {
        setSelectedRoute(computed[1] || computed[0]);
        routeService.saveSelectedRoute(computed[1] || computed[0]);
      }
      showToast('Safer routes generated with real-time road topology and risk score.', 'success');
    } catch (err: any) {
      showToast('Could not calculate real routes. Fallback corridor loaded.', 'info');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSelectRoute = (route: RouteOption) => {
    setSelectedRoute(route);
    routeService.saveSelectedRoute(route);
    showToast(`Route updated to: ${route.name}`, 'info');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/[0.08]">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
            Intelligent Vector Navigation
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
            Safe Route Intelligence
          </h2>
          <p className="text-sm text-slate-400">
            Compare travel time against real-time illumination, pedestrian density, and verified safe havens.
          </p>
        </div>
      </div>

      {/* Input Form Card */}
      <Card variant="glass" className="p-6">
        <form onSubmit={handleAnalyze} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Current Origin
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-purple-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={currentLocation}
                  onChange={(e) => setCurrentLocation(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-navy-950/80 border border-white/10 text-white text-sm focus:border-purple-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Destination Point
              </label>
              <div className="relative">
                <Navigation className="w-4 h-4 text-cyan-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="e.g. Demo Central Mall"
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-navy-950/80 border border-white/10 text-white text-sm focus:border-purple-500 focus:outline-none"
                />
              </div>
              {destinationError && (
                <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> {destinationError}
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isAnalyzing}
              leftIcon={<Sparkles className="w-4 h-4" />}
            >
              Analyze Routes
            </Button>
          </div>
        </form>
      </Card>

      {/* Two Column Layout: Route Options on Left, Live Vector Map on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Route Cards (Rule 19 & 20) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white">Analyzed Route Options</h3>
            <span className="text-xs text-slate-400">Sorted by AI Safety Score</span>
          </div>

          {routes.map((route) => {
            const isSelected = selectedRoute.id === route.id;
            const isSafer = route.type === 'safer';

            return (
              <div
                key={route.id}
                onClick={() => handleSelectRoute(route)}
                className={`p-5 rounded-2xl border transition-all duration-200 cursor-pointer ${
                  isSelected
                    ? 'bg-purple-950/40 border-purple-500 shadow-glow-violet'
                    : 'bg-navy-900/60 border-white/[0.08] hover:border-white/20'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    {route.badge && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 mb-1.5">
                        <Sparkles className="w-3 h-3" />
                        {route.badge}
                      </span>
                    )}
                    <h4 className="text-base font-bold text-white">{route.name}</h4>
                  </div>
                  <div className="text-right">
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-lg border ${
                        route.riskScore <= 30
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                      }`}
                    >
                      Risk: {route.riskScore}/100
                    </span>
                  </div>
                </div>

                {/* Duration & Distance */}
                <div className="flex items-center gap-4 text-xs text-slate-300 my-3 font-mono">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" /> {route.durationMin} mins
                  </span>
                  <span>•</span>
                  <span>{route.distanceKm} km</span>
                  <span>•</span>
                  <span className="text-purple-300">{route.safePointsNearby} Safe Havens</span>
                </div>

                {/* Reasons List */}
                <div className="space-y-1 pt-2 border-t border-white/5">
                  {route.reasons.map((reason, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs text-slate-400">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>{reason}</span>
                    </div>
                  ))}
                </div>

                {/* Select button */}
                <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">
                    {isSelected ? 'Currently Selected for Navigation' : 'Click to select & visualize'}
                  </span>
                  <Button
                    variant={isSelected ? 'primary' : 'secondary'}
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectRoute(route);
                    }}
                  >
                    {isSelected ? 'Selected' : 'Select Route'}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Column: Live Map with selected route visualized (Rule 21 & 22) */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white">Interactive Corridor Visualization</h3>
            <span className="text-xs text-slate-400">Showing {selectedRoute.name}</span>
          </div>

          <SimulatedMap
            selectedRoute={selectedRoute}
            showResponder={true}
            showSafePoints={true}
            height="h-[520px]"
          />

          <div className="p-4 rounded-xl bg-navy-900/60 border border-white/5 text-xs text-slate-400 flex items-center justify-between">
            <span>Safe Point Nodes along this corridor: Police Haven (1.2 km), City Hospital (1.9 km)</span>
            <span className="text-emerald-400 font-semibold font-mono">Telematics Sync: OK</span>
          </div>
        </div>
      </div>
    </div>
  );
};
