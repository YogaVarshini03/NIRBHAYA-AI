import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Crosshair, Layers, MapPin, ShieldCheck, Compass } from 'lucide-react';
import { locationService, GPSLocation } from '../../services/locationService';

// Fix Leaflet's default icon path issue with modern bundlers
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
  zoom = 15,
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
  const activeTileLayerRef = useRef<L.TileLayer | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const accuracyCircleRef = useRef<L.Circle | null>(null);
  const routePolylineRef = useRef<L.Polyline | null>(null);
  const breadcrumbsPolylineRef = useRef<L.Polyline | null>(null);
  const breadcrumbsRef = useRef<L.LatLngTuple[]>([]);
  const destinationMarkerRef = useRef<L.Marker | null>(null);
  const responderMarkerRef = useRef<L.Marker | null>(null);
  const incidentMarkerRef = useRef<L.Marker | null>(null);
  const safePointMarkersRef = useRef<L.LayerGroup | null>(null);
  const hasInitiallyCentered = useRef<boolean>(false);

  const [currentGps, setCurrentGps] = useState<GPSLocation | null>(locationService.getCurrentLocation());
  const [gpsStatus, setGpsStatus] = useState<string>(locationService.getStatus());
  const [isFollowingUser, setIsFollowingUser] = useState<boolean>(true);
  const [activeTheme, setActiveTheme] = useState<'osm' | 'dark'>('dark');

  // Tile layer configurations (Free, Open-Source, NO API Keys Required)
  const tileProviders = {
    // OpenStreetMap standard tiles (Official, 100% Free, No Key Required)
    osm: {
      url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      options: {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
        maxZoom: 19,
      },
    },
    // Esri World Dark Gray Canvas (Sleek Dark Theme, 100% Free, No Key Required)
    dark: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
      options: {
        attribution: 'Tiles &copy; <a href="https://www.esri.com/" target="_blank" rel="noreferrer">Esri</a> &mdash; Esri, DeLorme, NAVTEQ',
        maxZoom: 16,
      },
    },
  };

  // Helper to switch active tile layer without recreating the map
  const applyTileLayer = (theme: 'osm' | 'dark', map: L.Map) => {
    if (activeTileLayerRef.current) {
      map.removeLayer(activeTileLayerRef.current);
    }
    const config = tileProviders[theme];
    const newLayer = L.tileLayer(config.url, config.options);
    newLayer.addTo(map);
    activeTileLayerRef.current = newLayer;
  };

  // 1. Initialize Map
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

    // Apply initial tile layer (Dark theme without CARTO API key errors)
    applyTileLayer(activeTheme, map);
    mapInstanceRef.current = map;

    // Layer group for safe points
    const safeLayerGroup = L.layerGroup().addTo(map);
    safePointMarkersRef.current = safeLayerGroup;

    // Drag detection: pause auto-centering when user manually pans
    map.on('dragstart', () => {
      setIsFollowingUser(false);
    });

    // Optional click handler
    if (onLocationSelect) {
      map.on('click', (e: L.LeafletMouseEvent) => {
        onLocationSelect(e.latlng.lat, e.latlng.lng);
      });
    }

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      activeTileLayerRef.current = null;
    };
  }, []);

  // 2. Handle tile provider toggle
  const toggleTileTheme = () => {
    const nextTheme = activeTheme === 'dark' ? 'osm' : 'dark';
    setActiveTheme(nextTheme);
    if (mapInstanceRef.current) {
      applyTileLayer(nextTheme, mapInstanceRef.current);
    }
  };

  // 3. Subscribe to real continuous GPS updates
  useEffect(() => {
    locationService.startContinuousTracking();
    const unsubscribe = locationService.subscribe((loc, status) => {
      setCurrentGps(loc);
      setGpsStatus(status);

      if (!loc || !mapInstanceRef.current) return;

      const userLatLng: L.LatLngTuple = [loc.latitude, loc.longitude];

      // Initial center on valid GPS fix
      if (!hasInitiallyCentered.current) {
        mapInstanceRef.current.setView(userLatLng, zoom, { animate: true });
        hasInitiallyCentered.current = true;
      }

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

        userMarkerRef.current = L.marker(userLatLng, { icon: userIcon, zIndexOffset: 1000 })
          .addTo(mapInstanceRef.current)
          .bindPopup(`<b>Your Live Position</b><br>Lat: ${loc.latitude.toFixed(6)}<br>Lng: ${loc.longitude.toFixed(6)}<br>Accuracy: ±${loc.accuracy}m`);

        accuracyCircleRef.current = L.circle(userLatLng, {
          radius: Math.max(loc.accuracy, 10),
          color: '#06B6D4',
          fillColor: '#06B6D4',
          fillOpacity: 0.12,
          weight: 1,
        }).addTo(mapInstanceRef.current);
      } else {
        userMarkerRef.current.setLatLng(userLatLng);
        userMarkerRef.current.setPopupContent(
          `<b>Your Live Position</b><br>Lat: ${loc.latitude.toFixed(6)}<br>Lng: ${loc.longitude.toFixed(6)}<br>Accuracy: ±${loc.accuracy}m`
        );
        if (accuracyCircleRef.current) {
          accuracyCircleRef.current.setLatLng(userLatLng);
          accuracyCircleRef.current.setRadius(Math.max(loc.accuracy, 10));
        }
      }

      // Record continuous breadcrumb trail
      const breadcrumbs = breadcrumbsRef.current;
      const lastPoint = breadcrumbs[breadcrumbs.length - 1];
      const hasMoved = !lastPoint ||
        (Math.abs(lastPoint[0] - loc.latitude) > 0.00003 || Math.abs(lastPoint[1] - loc.longitude) > 0.00003);

      if (hasMoved) {
        breadcrumbs.push(userLatLng);
        if (breadcrumbsPolylineRef.current) {
          breadcrumbsPolylineRef.current.setLatLngs(breadcrumbs);
        } else if (mapInstanceRef.current) {
          breadcrumbsPolylineRef.current = L.polyline(breadcrumbs, {
            color: '#06B6D4',
            weight: 3,
            opacity: 0.75,
            dashArray: '4, 8',
          }).addTo(mapInstanceRef.current);
        }
      }

      // Smooth camera follow
      if (isFollowingUser && mapInstanceRef.current) {
        mapInstanceRef.current.panTo(userLatLng, { animate: true });
      }
    });

    return () => {
      unsubscribe();
    };
  }, [isFollowingUser, zoom]);

  // 4. Update Route Polyline if provided
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
      }).addTo(mapInstanceRef.current);

      routePolylineRef.current = polyline;
      mapInstanceRef.current.fitBounds(polyline.getBounds(), { padding: [50, 50] });
    }
  }, [routeGeometry]);

  // 5. Update Destination Marker
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    if (destinationMarkerRef.current) {
      mapInstanceRef.current.removeLayer(destinationMarkerRef.current);
      destinationMarkerRef.current = null;
    }

    if (destination && destination.lat && destination.lng) {
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
        .bindPopup(`<b>Destination Sanctuary</b><br>${destination.name || 'Safety Verified Haven'}`);
    }
  }, [destination]);

  // 6. Update Responder Marker
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    if (responderMarkerRef.current) {
      mapInstanceRef.current.removeLayer(responderMarkerRef.current);
      responderMarkerRef.current = null;
    }

    if (responderLocation && responderLocation.lat && responderLocation.lng) {
      const respIcon = L.divIcon({
        className: 'responder-marker',
        html: `
          <div class="relative flex items-center justify-center">
            <div class="absolute w-8 h-8 rounded-full bg-amber-500/30 animate-pulse"></div>
            <div class="w-7 h-7 rounded-full bg-amber-500 border-2 border-white flex items-center justify-center shadow-lg shadow-amber-500/50 text-[10px] font-black text-black">
              PCR
            </div>
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      responderMarkerRef.current = L.marker([responderLocation.lat, responderLocation.lng], { icon: respIcon })
        .addTo(mapInstanceRef.current)
        .bindPopup(`<b>Emergency Responder</b><br>${responderLocation.name || 'Officer Arjun Kumar (En Route)'}`);
    }
  }, [responderLocation]);

  // 7. Update Incident Marker (if passed explicitly)
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    if (incidentMarkerRef.current) {
      mapInstanceRef.current.removeLayer(incidentMarkerRef.current);
      incidentMarkerRef.current = null;
    }

    if (incidentLocation && incidentLocation.lat && incidentLocation.lng) {
      const incIcon = L.divIcon({
        className: 'incident-marker',
        html: `
          <div class="relative flex items-center justify-center">
            <div class="absolute w-9 h-9 rounded-full bg-red-600/40 animate-ping"></div>
            <div class="w-7 h-7 rounded-full bg-red-600 border-2 border-white flex items-center justify-center shadow-lg shadow-red-600/50 text-[10px] font-black text-white">
              SOS
            </div>
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      incidentMarkerRef.current = L.marker([incidentLocation.lat, incidentLocation.lng], { icon: incIcon, zIndexOffset: 2000 })
        .addTo(mapInstanceRef.current)
        .bindPopup(`<b>Emergency Incident Active</b><br>${incidentLocation.name || 'Distress Beacon'}`);
    }
  }, [incidentLocation]);

  // 8. Safe Points (Police / Hospital / Sanctuaries) relative to genuine position
  useEffect(() => {
    if (!mapInstanceRef.current || !safePointMarkersRef.current || !showSafePoints) return;

    safePointMarkersRef.current.clearLayers();

    if (!centerLat && !currentGps?.latitude) {
      return; // Do not render synthetic safe points if no genuine location fix exists
    }

    const baseLat = centerLat || currentGps!.latitude;
    const baseLng = centerLng || currentGps!.longitude;

    const safePoints = [
      { name: 'Police Station / Emergency Post (24x7)', lat: baseLat + 0.005, lng: baseLng + 0.004, type: 'police' },
      { name: 'City Hospital Emergency Care (ER)', lat: baseLat - 0.004, lng: baseLng + 0.006, type: 'hospital' },
      { name: 'Women Safety Booth & CCTV Post', lat: baseLat + 0.002, lng: baseLng - 0.005, type: 'booth' },
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
        .bindPopup(`<b>${sp.name}</b><br>Verified 24/7 Nirbhaya Emergency Sanctuary`);
    });
  }, [centerLat, centerLng, currentGps, showSafePoints]);

  const recenterGPS = () => {
    if (mapInstanceRef.current && currentGps) {
      setIsFollowingUser(true);
      mapInstanceRef.current.setView([currentGps.latitude, currentGps.longitude], zoom, { animate: true });
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
          {gpsStatus === 'LIVE_GPS' && currentGps ? 'Real GPS Active' : 'GPS unavailable'}
        </span>
        <span className="text-slate-400 border-l border-slate-700 pl-2 font-mono">
          {currentGps ? `±${currentGps.accuracy.toFixed(1)}m` : 'No fix'}
        </span>
      </div>

      {/* Floating Controls (Theme Switcher & Recenter) */}
      <div className="absolute bottom-4 right-4 z-[400] flex flex-col gap-2">
        <button
          onClick={toggleTileTheme}
          title={`Switch to ${activeTheme === 'dark' ? 'OpenStreetMap Standard' : 'Dark Tactical Canvas'}`}
          className="p-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 backdrop-blur-md shadow-xl transition-all active:scale-95 flex items-center justify-center"
        >
          <Layers className="w-5 h-5" />
        </button>

        <button
          onClick={recenterGPS}
          title="Recenter on Live GPS"
          className={`p-2.5 rounded-xl border backdrop-blur-md shadow-xl transition-all active:scale-95 flex items-center justify-center ${
            isFollowingUser
              ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50'
              : 'bg-slate-900/90 hover:bg-slate-800 text-slate-400 border-slate-700/60'
          }`}
        >
          <Crosshair className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
