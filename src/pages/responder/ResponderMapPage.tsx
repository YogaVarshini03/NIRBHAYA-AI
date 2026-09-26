import React, { useState, useEffect } from 'react';
import {
  Map,
  Layers,
  Shield,
  Car,
  AlertOctagon,
  Radio,
  Eye,
  Compass,
  AlertTriangle,
  ExternalLink,
  Navigation,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { RealMap } from '../../components/map/RealMap';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { useEmergency } from '../../context/EmergencyContext';
import { emergencyService } from '../../services/emergencyService';
import { locationService, GPSLocation } from '../../services/locationService';
import { socketService } from '../../services/socketService';
import { useToast } from '../../context/ToastContext';
import { apiUrl } from '../../services/apiConfig';

export const ResponderMapPage: React.FC = () => {
  const { showToast } = useToast();
  const [activeIncidents, setActiveIncidents] = useState<any[]>([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [responderGps, setResponderGps] = useState<GPSLocation | null>(() => locationService.getCurrentLocation());
  const [gpsStatus, setGpsStatus] = useState<string>(() => locationService.getStatus());
  const [routeGeometry, setRouteGeometry] = useState<[number, number][]>([]);
  const [routeInfo, setRouteInfo] = useState<{ distanceKm: number; durationMin: number } | null>(null);
  const [routeStatus, setRouteStatus] = useState<'CALCULATING' | 'AVAILABLE' | 'UNAVAILABLE'>('UNAVAILABLE');

  const loadIncidents = async () => {
    try {
      const items = await emergencyService.fetchActiveIncidentsFromBackend();
      setActiveIncidents(items || []);
      if (items && items.length > 0) {
        if (!selectedIncidentId || !items.some((i: any) => i.id === selectedIncidentId)) {
          setSelectedIncidentId(items[0].id);
        }
      } else {
        setSelectedIncidentId(null);
      }
    } catch (err) {
      console.warn('[ResponderMapPage] Failed to load incidents:', err);
    }
  };

  useEffect(() => {
    loadIncidents();

    // Track real responder device GPS
    locationService.startContinuousTracking();
    const unsubLoc = locationService.subscribe((loc, status) => {
      setResponderGps(loc);
      setGpsStatus(status);

      // Broadcast responder location over WebSocket to backend
      if (loc && selectedIncidentId) {
        socketService.sendLocation({
          incidentId: selectedIncidentId,
          latitude: loc.latitude,
          longitude: loc.longitude,
          accuracy: loc.accuracy,
          senderRole: 'RESPONDER',
        });
      }
    });

    // Realtime WebSocket subscriptions
    socketService.subscribeToAll();

    const unsubUserLoc = socketService.on('USER_LOCATION', (payload: any) => {
      setActiveIncidents((prev) =>
        prev.map((i) =>
          i.id === payload.incidentId
            ? { ...i, latitude: payload.latitude, longitude: payload.longitude, accuracy: payload.accuracy, updated_at: payload.timestamp }
            : i
        )
      );
    });

    const unsubTrigger = socketService.on('EMERGENCY_TRIGGERED', (payload: any) => {
      if (payload?.incident) {
        setActiveIncidents((prev) => [payload.incident, ...prev.filter((i) => i.id !== payload.incident.id)]);
        setSelectedIncidentId(payload.incident.id);
        showToast(`🚨 Real emergency triggered: ${payload.incident.id}`, 'emergency');
      }
    });

    const unsubResolved = socketService.on('INCIDENT_RESOLVED', (payload: any) => {
      if (payload?.incidentId) {
        setActiveIncidents((prev) => prev.filter((i) => i.id !== payload.incidentId));
      }
    });

    return () => {
      unsubLoc();
      unsubUserLoc();
      unsubTrigger();
      unsubResolved();
    };
  }, [selectedIncidentId]);

  const selectedIncident = activeIncidents.find((i) => i.id === selectedIncidentId) || null;

  // Calculate real OSRM driving route: Responder GPS -> Selected Emergency GPS (Section 10)
  useEffect(() => {
    if (!responderGps || !selectedIncident?.latitude || !selectedIncident?.longitude) {
      setRouteGeometry([]);
      setRouteInfo(null);
      setRouteStatus('UNAVAILABLE');
      return;
    }

    const calculateOsrmRoute = async () => {
      setRouteStatus('CALCULATING');
      try {
        const originLng = responderGps.longitude;
        const originLat = responderGps.latitude;
        const destLng = selectedIncident.longitude;
        const destLat = selectedIncident.latitude;

        const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${originLng},${originLat};${destLng},${destLat}?overview=full&geometries=geojson`;
        const res = await fetch(osrmUrl, { signal: AbortSignal.timeout(6000) });

        if (res.ok) {
          const data = await res.json();
          if (data.routes && data.routes[0]) {
            const r = data.routes[0];
            const coords: [number, number][] = r.geometry.coordinates.map((c: [number, number]) => [c[1], c[0]]);
            setRouteGeometry(coords);
            setRouteInfo({
              distanceKm: Number((r.distance / 1000).toFixed(1)),
              durationMin: Math.max(1, Math.round(r.duration / 60)),
            });
            setRouteStatus('AVAILABLE');
            return;
          }
        }
        setRouteGeometry([]);
        setRouteInfo(null);
        setRouteStatus('UNAVAILABLE');
      } catch (e) {
        setRouteGeometry([]);
        setRouteInfo(null);
        setRouteStatus('UNAVAILABLE');
      }
    };

    calculateOsrmRoute();
  }, [responderGps?.latitude, responderGps?.longitude, selectedIncident?.latitude, selectedIncident?.longitude]);

  const handleNavigate = () => {
    if (!selectedIncident?.latitude || !selectedIncident?.longitude) {
      showToast('Incident GPS coordinates unavailable.', 'warning');
      return;
    }
    const url = `https://www.google.com/maps/dir/?api=1&destination=${selectedIncident.latitude},${selectedIncident.longitude}&travelmode=driving`;
    window.open(url, '_blank');
    showToast('Opening turn-by-turn navigation in Google Maps...', 'info');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header (Section 7) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
              Tactical Operational Map
            </span>
            <Badge variant="cyan" size="sm" dot>
              Real OpenStreetMap & Esri Feeds
            </Badge>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
            Responder Tactical Map
          </h2>
          <p className="text-sm text-slate-400">
            Real GPS emergency coordinates with live WebSocket breadcrumbs and OSRM turn-by-turn routing.
          </p>
        </div>

        {/* Tactical Actions */}
        <div className="flex items-center gap-3">
          {selectedIncident && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleNavigate}
              leftIcon={<Navigation className="w-4 h-4 text-cyan-400" />}
            >
              Navigate to {selectedIncident.id}
            </Button>
          )}
        </div>
      </div>

      {/* Status Indicators Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
        <div className="p-3 rounded-2xl bg-navy-900/80 border border-white/10 flex items-center justify-between">
          <span className="text-slate-400">Responder GPS:</span>
          {responderGps ? (
            <span className="text-emerald-400 font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              LIVE (±{responderGps.accuracy}m)
            </span>
          ) : (
            <span className="text-amber-400 font-bold">Responder GPS unavailable</span>
          )}
        </div>

        <div className="p-3 rounded-2xl bg-navy-900/80 border border-white/10 flex items-center justify-between">
          <span className="text-slate-400">Active Incidents:</span>
          <span className={activeIncidents.length > 0 ? 'text-red-400 font-bold' : 'text-slate-400 font-bold'}>
            {activeIncidents.length > 0 ? `${activeIncidents.length} Distress Beacon(s)` : 'No active incidents'}
          </span>
        </div>

        <div className="p-3 rounded-2xl bg-navy-900/80 border border-white/10 flex items-center justify-between">
          <span className="text-slate-400">OSRM Real Route:</span>
          {routeStatus === 'AVAILABLE' && routeInfo ? (
            <span className="text-cyan-300 font-bold">
              {routeInfo.distanceKm} km ({routeInfo.durationMin} mins)
            </span>
          ) : routeStatus === 'CALCULATING' ? (
            <span className="text-amber-300 font-bold">Calculating...</span>
          ) : (
            <span className="text-slate-400">Route unavailable</span>
          )}
        </div>
      </div>

      {/* Main Map Canvas: Leaflet OpenStreetMap */}
      <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
        <RealMap
          centerLat={selectedIncident ? selectedIncident.latitude : responderGps?.latitude}
          centerLng={selectedIncident ? selectedIncident.longitude : responderGps?.longitude}
          zoom={selectedIncident ? 16 : 14}
          routeGeometry={routeGeometry.length > 0 ? routeGeometry : undefined}
          incidentLocation={
            selectedIncident && selectedIncident.latitude && selectedIncident.longitude
              ? {
                  lat: selectedIncident.latitude,
                  lng: selectedIncident.longitude,
                  name: `Distress Incident: ${selectedIncident.id} (Risk: ${selectedIncident.risk_score || 88})`,
                }
              : null
          }
          responderLocation={
            responderGps && responderGps.latitude && responderGps.longitude
              ? {
                  lat: responderGps.latitude,
                  lng: responderGps.longitude,
                  name: 'Your Responder Location (Real GPS)',
                }
              : null
          }
          showSafePoints={false}
          className="h-[640px] w-full"
        />

        {/* Overlay Notice if No Incidents */}
        {activeIncidents.length === 0 && (
          <div className="absolute top-4 left-4 z-[1000] p-4 rounded-2xl bg-navy-950/95 border border-white/10 max-w-sm backdrop-blur-xl shadow-xl space-y-1">
            <div className="flex items-center gap-2 text-white font-bold text-xs uppercase tracking-wider">
              <Shield className="w-4 h-4 text-emerald-400" />
              No Active Incidents
            </div>
            <p className="text-xs text-slate-300">
              The operational network has zero active distress beacons recorded in the database. When an emergency SOS is triggered, real GPS coordinates will appear here instantly via WebSocket.
            </p>
          </div>
        )}

        {/* Selected Incident Floating Triage Pill */}
        {selectedIncident && (
          <div className="absolute bottom-4 left-4 right-4 sm:right-auto sm:max-w-md z-[1000] p-4 rounded-2xl bg-navy-950/95 border border-red-500/40 backdrop-blur-xl shadow-2xl space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                <span className="text-xs font-mono font-bold text-white">{selectedIncident.id}</span>
                <Badge variant="critical" size="sm">
                  {selectedIncident.risk_level || 'CRITICAL'} ({selectedIncident.risk_score || 88})
                </Badge>
              </div>
              <span className="text-[11px] font-mono text-cyan-300">
                ±{Math.round(selectedIncident.accuracy || 10)}m accuracy
              </span>
            </div>

            <p className="text-xs text-slate-200 truncate">
              {selectedIncident.location_name || `Live GPS (${selectedIncident.latitude.toFixed(5)}, ${selectedIncident.longitude.toFixed(5)})`}
            </p>

            <div className="flex items-center justify-between pt-2 border-t border-white/10 text-xs">
              <span className="text-slate-400 font-mono text-[11px] uppercase">
                Status: {selectedIncident.status}
              </span>
              <Button
                variant="primary"
                size="sm"
                onClick={handleNavigate}
                className="text-xs py-1"
                leftIcon={<Compass className="w-3.5 h-3.5" />}
              >
                Turn-by-turn Navigation
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
