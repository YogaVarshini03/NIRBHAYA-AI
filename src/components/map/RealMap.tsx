import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Crosshair, Shield, Navigation, AlertTriangle, Hospital, ShieldAlert, Layers } from 'lucide-react';
import { locationService, GPSLocation } from '../../services/locationService';

// Fix Leaflet's default icon path issue with bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface RealMapProps {
  centerLat?: number;
  centerLng?: number;
  zoom?: number;
  routeGeometry?: [number, number][]; // [lat, lng] array
  destination?: { lat: number; lng: number; name?: string } | null;
  responderLocation?: { lat: number; lng: number; name?: string } | null;
  incidentLocation?: { lat: number; lng: number; name?: string } | null;
  showSafePoints?: boolean;
  className?: string;
  onLocationSelect?: (lat: number, lng: number) => void;
}

export const RealMap: React.FC<RealMapProps> = ({
  centerLat,
  centerLng,
  zoom = 14,
  routeGeometry,
  destination,
  responderLocation,
  incidentLocation,
  showSafePoints = true,
  className = 'h-96 w-full rounded-2xl',
  onLocationSelect,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const accuracyCircleRef = useRef<L.Circle | null>(null);
  const routePolylineRef = useRef<L.Polyline | null>(null);
  const destinationMarkerRef = useRef<L.Marker | null>(null);
  const responderMarkerRef = useRef<L.Marker | null>(null);
  const safePointMarkersRef = useRef<L.LayerGroup | null>(null);

  const [currentGps, setCurrentGps] = useState<GPSLocation | null>(locationService.getCurrentLocation());
  const [gpsStatus, setGpsStatus] = useState<string>(locationService.getStatus());
  const [isFollowingUser, setIsFollowingUser] = useState<boolean>(true);
  const [tileLayerType, setTileLayerType] = useState<'dark' | 'standard'>('dark');

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const hasInitialCoord = Boolean(centerLat && centerLng) || Boolean(currentGps?.latitude && currentGps?.longitude);
    const initialLat = centerLat || currentGps?.latitude || 20.5937;
    const initialLng = centerLng || currentGps?.longitude || 78.9629;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: hasInitialCoord ? zoom : 5,
      zoomControl: false,
    });

    // Dark security map tiles (CartoDB Dark Matter)
    const darkTile = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      subdomains: 'abcd',
      maxZoom: 19,
    });

    darkTile.addTo(map);
    mapInstanceRef.current = map;

    // Layer group for safe points
    const safeLayerGroup = L.layerGroup().addTo(map);
    safePointMarkersRef.current = safeLayerGroup;

    // Optional click handler
    if (onLocationSelect) {
      map.on('click', (e: L.LeafletMouseEvent) => {
        onLocationSelect(e.latlng.lat, e.latlng.lng);
      });
    }

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Subscribe to real continuous GPS updates
  useEffect(() => {
    locationService.startContinuousTracking();
    const unsubscribe = locationService.subscribe((loc, status) => {
      setCurrentGps(loc);
      setGpsStatus(status);

      if (!loc || !mapInstanceRef.current) return;

      const userLatLng: L.LatLngTuple = [loc.latitude, loc.longitude];

      // Update or create user location pulsating marker
      if (!userMarkerRef.current) {
        const userIcon = L.divIcon({
          className: 'user-gps-pulse-marker',
          html: `
            <div class="relative flex items-center justify-center">
              <div class="absolute w-8 h-8 rounded-full bg-cyan-500/30 animate-ping"></div>
              <div class="w-4 h-4 rounded-full bg-cyan-400 border-2 border-white shadow-lg shadow-cyan-500/50"></div>
            </div>
          `,
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        });

        userMarkerRef.current = L.marker(userLatLng, { icon: userIcon })
          .addTo(mapInstanceRef.current)
          .bindPopup('<b>Your Live GPS Location</b><br>Continuous High-Accuracy Telemetry');

        accuracyCircleRef.current = L.circle(userLatLng, {
          radius: Math.max(loc.accuracy, 10),
          color: '#06B6D4',
          fillColor: '#06B6D4',
          fillOpacity: 0.1,
          weight: 1,
        }).addTo(mapInstanceRef.current);
      } else {
        userMarkerRef.current.setLatLng(userLatLng);
        if (accuracyCircleRef.current) {
          accuracyCircleRef.current.setLatLng(userLatLng);
          accuracyCircleRef.current.setRadius(Math.max(loc.accuracy, 10));
        }
      }

      if (isFollowingUser) {
        mapInstanceRef.current.panTo(userLatLng, { animate: true });
      }
    });

    return () => {
      unsubscribe();
    };
  }, [isFollowingUser]);

  // Update Route Polyline
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    if (routePolylineRef.current) {
      mapInstanceRef.current.removeLayer(routePolylineRef.current);
      routePolylineRef.current = null;
    }

    if (routeGeometry && routeGeometry.length > 1) {
      const polyline = L.polyline(routeGeometry, {
        color: '#10B981', // Emerald green safer corridor
        weight: 5,
        opacity: 0.85,
        lineCap: 'round',
        lineJoin: 'round',
        dashArray: undefined,
      }).addTo(mapInstanceRef.current);

      routePolylineRef.current = polyline;

      // Fit bounds to show entire route
      mapInstanceRef.current.fitBounds(polyline.getBounds(), { padding: [50, 50] });
    }
  }, [routeGeometry]);

  // Update Destination Marker
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    if (destinationMarkerRef.current) {
      mapInstanceRef.current.removeLayer(destinationMarkerRef.current);
      destinationMarkerRef.current = null;
    }

    if (destination) {
      const destIcon = L.divIcon({
        className: 'dest-marker',
        html: `
          <div class="relative flex items-center justify-center">
            <div class="w-6 h-6 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center shadow-lg shadow-emerald-500/50">
              <div class="w-2 h-2 rounded-full bg-white"></div>
            </div>
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      destinationMarkerRef.current = L.marker([destination.lat, destination.lng], { icon: destIcon })
        .addTo(mapInstanceRef.current)
        .bindPopup(`<b>Destination</b><br>${destination.name || 'Safety Verified Point'}`);
    }
  }, [destination]);

  // Update Responder Marker
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    if (responderMarkerRef.current) {
      mapInstanceRef.current.removeLayer(responderMarkerRef.current);
      responderMarkerRef.current = null;
    }

    if (responderLocation) {
      const respIcon = L.divIcon({
        className: 'responder-marker',
        html: `
          <div class="relative flex items-center justify-center">
            <div class="absolute w-8 h-8 rounded-full bg-amber-500/30 animate-pulse"></div>
            <div class="w-6 h-6 rounded-full bg-amber-500 border-2 border-white flex items-center justify-center shadow-lg shadow-amber-500/50">
              <span style="font-size: 10px; font-weight: bold; color: black;">POL</span>
            </div>
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      responderMarkerRef.current = L.marker([responderLocation.lat, responderLocation.lng], { icon: respIcon })
        .addTo(mapInstanceRef.current)
        .bindPopup(`<b>Emergency Responder</b><br>${responderLocation.name || 'Officer En Route'}`);
    }
  }, [responderLocation]);

  // Safe Points (Police / Hospital / Sanctuaries)
  useEffect(() => {
    if (!mapInstanceRef.current || !safePointMarkersRef.current || !showSafePoints) return;

    if (!centerLat && !currentGps?.latitude) {
      return; // Do not plot safe points until genuine location is acquired
    }

    const baseLat = centerLat || currentGps!.latitude;
    const baseLng = centerLng || currentGps!.longitude;

    const safePoints = [
      { name: 'All-Women Police Station (24x7)', lat: baseLat + 0.006, lng: baseLng + 0.005, type: 'police' },
      { name: 'Government Multi-Super Hospital (ER)', lat: baseLat - 0.005, lng: baseLng + 0.008, type: 'hospital' },
      { name: 'Pink Booth & CCTV Surveillance Hub', lat: baseLat + 0.003, lng: baseLng - 0.007, type: 'booth' },
    ];

    safePoints.forEach((sp) => {
      const isHospital = sp.type === 'hospital';
      const icon = L.divIcon({
        className: 'safepoint-marker',
        html: `
          <div class="w-5 h-5 rounded-full ${isHospital ? 'bg-red-500' : 'bg-blue-500'} border-2 border-white flex items-center justify-center shadow-md">
            <span style="font-size: 9px; font-weight: bold; color: white;">${isHospital ? 'H' : 'P'}</span>
          </div>
        `,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });

      L.marker([sp.lat, sp.lng], { icon })
        .addTo(safePointMarkersRef.current!)
        .bindPopup(`<b>${sp.name}</b><br>Designated Nirbhaya Emergency Sanctuary`);
    });
  }, [centerLat, centerLng, currentGps, showSafePoints]);

  const recenterGPS = () => {
    if (mapInstanceRef.current && currentGps) {
      setIsFollowingUser(true);
      mapInstanceRef.current.setView([currentGps.latitude, currentGps.longitude], 15, { animate: true });
    }
  };

  return (
    <div className={`relative overflow-hidden border border-slate-800 bg-slate-950 ${className}`}>
      {/* Map Canvas */}
      <div ref={mapContainerRef} className="h-full w-full z-0" />

      {/* Floating GPS Status Pill */}
      <div className="absolute top-4 left-4 z-[400] flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/90 backdrop-blur-md border border-slate-700/60 text-xs shadow-xl">
        <span className="relative flex h-2 w-2">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${gpsStatus === 'LIVE_GPS' ? 'bg-emerald-400 opacity-75' : 'bg-amber-400 opacity-75'}`}></span>
          <span className={`relative inline-flex rounded-full h-2 w-2 ${gpsStatus === 'LIVE_GPS' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
        </span>
        <span className="font-semibold text-slate-200">
          {gpsStatus === 'LIVE_GPS' && currentGps ? 'Live GPS' : 'GPS unavailable'}
        </span>
        <span className="text-slate-400 border-l border-slate-700 pl-2">
          {currentGps ? `±${currentGps.accuracy}m` : 'No fix'}
        </span>
      </div>

      {/* Floating Controls */}
      <div className="absolute bottom-4 right-4 z-[400] flex flex-col gap-2">
        <button
          onClick={recenterGPS}
          title="Recenter on Live GPS"
          className="p-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-cyan-400 border border-slate-700/60 backdrop-blur-md shadow-xl transition-all active:scale-95 flex items-center justify-center"
        >
          <Crosshair className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
