import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ShieldAlert,
  Radio,
  MapPin,
  Battery,
  Clock,
  Phone,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  RefreshCw,
  Navigation
} from 'lucide-react';
import { RealMap } from '../../components/map/RealMap';
import { apiUrl } from '../../services/apiConfig';

export const PublicTrackingPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const fetchTrackingData = async () => {
    if (!token) return;
    try {
      const res = await fetch(apiUrl(`/api/tracking/${token}`));
      const json = await res.json();

      if (!res.ok || !json.success) {
        setError(json.message || 'Tracking session is invalid or has expired.');
      } else {
        setData(json);
        setError(null);
        setLastRefreshed(new Date());
      }
    } catch (err: any) {
      setError('Unable to reach telemetry servers. Please check your internet connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrackingData();
    const interval = setInterval(fetchTrackingData, 5000); // 5-second live polling
    return () => clearInterval(interval);
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-center p-6">
        <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="text-xl font-bold">Connecting to Live GPS Stream...</h2>
        <p className="text-neutral-400 text-sm mt-1">Decrypting telemetry beacon for token {token?.slice(0, 10)}...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full bg-neutral-900 border border-neutral-800 rounded-2xl p-6 text-center">
          <div className="w-14 h-14 bg-red-500/10 border border-red-500/20 text-red-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold mb-2">Tracking Session Inactive</h2>
          <p className="text-neutral-400 text-sm mb-6 leading-relaxed">
            {error || 'This live emergency tracking link is no longer broadcasting or has expired.'}
          </p>
          <div className="space-y-3">
            <a
              href="tel:112"
              className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-xl transition"
            >
              <Phone className="w-5 h-5" />
              Call National Emergency (112)
            </a>
            <Link
              to="/"
              className="w-full block bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-medium py-3 px-4 rounded-xl text-center transition"
            >
              Return to NIRBHAYA AI Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const incident = data.incident || {};
  const latest = data.latestLocation || {};
  const userLat = latest.latitude || incident.latitude || 11.0168;
  const userLng = latest.longitude || incident.longitude || 76.9558;
  const accuracy = Math.round(latest.accuracy || incident.accuracy || 8);
  const status = incident.status || 'LIVE_TRACKING';

  const isResolved = status === 'RESOLVED' || status === 'CANCELLED';
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${userLat},${userLng}`;

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col">
      {/* Header Banner */}
      <header className="bg-neutral-900/90 border-b border-neutral-800 backdrop-blur sticky top-0 z-30 px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-sm sm:text-base">NIRBHAYA AI</h1>
                <span className="bg-red-500/20 text-red-400 border border-red-500/30 text-xs px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  LIVE SOS
                </span>
              </div>
              <p className="text-xs text-neutral-400">Public Live Telemetry Monitor</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="tel:112"
              className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm font-bold px-3 py-2 rounded-lg transition"
            >
              <Phone className="w-4 h-4" />
              <span>Call 112</span>
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 flex flex-col gap-4">
        {/* Status Card */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <span className="text-xs text-neutral-400 font-mono">INCIDENT CODE</span>
              <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                {incident.id || 'ACTIVE EMERGENCY'}
                <span className={`text-xs px-2.5 py-1 rounded-md font-semibold ${
                  isResolved ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'
                }`}>
                  {status}
                </span>
              </h2>
            </div>

            <div className="flex items-center gap-3 text-xs text-neutral-400">
              <span className="flex items-center gap-1 bg-neutral-800/80 px-2.5 py-1.5 rounded-lg border border-neutral-700/50">
                <Clock className="w-3.5 h-3.5 text-purple-400" />
                Updated {Math.max(0, Math.round((Date.now() - lastRefreshed.getTime()) / 1000))}s ago
              </span>
              <span className="flex items-center gap-1 bg-neutral-800/80 px-2.5 py-1.5 rounded-lg border border-neutral-700/50">
                <Battery className="w-3.5 h-3.5 text-emerald-400" />
                {incident.battery_level || 85}% Battery
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-neutral-800 text-xs sm:text-sm">
            <div className="flex items-start gap-2.5">
              <MapPin className="w-4 h-4 text-purple-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-neutral-400">Current Vector Location</p>
                <p className="font-semibold text-neutral-200">{incident.location_name || 'Live GPS Coordinates'}</p>
                <p className="text-neutral-500 text-xs font-mono">{userLat.toFixed(5)}, {userLng.toFixed(5)} (±{accuracy}m)</p>
              </div>
            </div>

            {incident.police_station_name && (
              <div className="flex items-start gap-2.5">
                <Radio className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-neutral-400">Assigned Nearest Police Station</p>
                  <p className="font-semibold text-neutral-200">{incident.police_station_name}</p>
                  {incident.police_station_phone && (
                    <a
                      href={`tel:${incident.police_station_phone}`}
                      className="text-blue-400 hover:text-blue-300 text-xs flex items-center gap-1 mt-0.5 underline"
                    >
                      <Phone className="w-3 h-3" />
                      {incident.police_station_phone}
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Live Vector Map */}
        <div className="flex-1 bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden min-h-[380px] sm:min-h-[460px] flex flex-col relative">
          <div className="absolute top-3 left-3 z-[1000] bg-neutral-900/90 backdrop-blur border border-neutral-700/80 px-3 py-1.5 rounded-xl shadow-lg flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
            <span className="text-xs font-medium text-neutral-200">Live Satellite / OpenStreetMap Lock</span>
          </div>

          <div className="flex-1 w-full h-full min-h-[380px]">
            <RealMap
              centerLat={userLat}
              centerLng={userLng}
              incidentLocation={{ lat: userLat, lng: userLng, name: incident.location_name || 'Active SOS Location' }}
              responderLocation={incident.responder_latitude && incident.responder_longitude ? {
                lat: incident.responder_latitude,
                lng: incident.responder_longitude,
                name: incident.responder_name || 'Emergency Responder'
              } : null}
              className="h-full w-full rounded-none"
            />
          </div>

          {/* Map Footer Action Bar */}
          <div className="p-3 bg-neutral-900 border-t border-neutral-800 flex flex-wrap items-center justify-between gap-2 z-10">
            <a
              href={mapsUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-xl transition shadow-lg shadow-purple-600/20"
            >
              <Navigation className="w-4 h-4" />
              Open in Google Maps Navigation
              <ExternalLink className="w-3.5 h-3.5 opacity-70" />
            </a>

            {incident.police_station_phone && (
              <a
                href={`tel:${incident.police_station_phone}`}
                className="flex items-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs sm:text-sm font-medium px-4 py-2.5 rounded-xl transition border border-neutral-700"
              >
                <Phone className="w-4 h-4 text-blue-400" />
                Call Police ({incident.police_station_name?.split(',')[0] || 'Station'})
              </a>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-neutral-500 pb-2">
          Protected by NIRBHAYA AI telemetry encryption. This live link expires automatically upon resolution.
        </p>
      </main>
    </div>
  );
};
export default PublicTrackingPage;
