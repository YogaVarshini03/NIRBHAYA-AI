import { db } from '../db';

export interface PoliceStationInfo {
  id: string;
  name: string;
  phone: string;
  distanceKm: number;
  distanceFormatted: string;
  latitude: number;
  longitude: number;
  district?: string;
  address?: string;
  source: 'OVERPASS_OSM' | 'LOCAL_DATABASE';
}

function calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Finds nearest 3 police stations within 5km radius using Overpass API (OSM),
 * falling back to local pre-seeded database if Overpass is unreachable or returns no stations with phone.
 */
export async function getNearestPoliceStations(
  userLat: number,
  userLng: number,
  radiusMeters: number = 5000
): Promise<PoliceStationInfo[]> {
  const stations: PoliceStationInfo[] = [];

  // 1. Try Overpass API for live OpenStreetMap police data within radius
  try {
    const overpassQuery = `
      [out:json][timeout:5];
      (
        node["amenity"="police"](around:${radiusMeters},${userLat},${userLng});
        way["amenity"="police"](around:${radiusMeters},${userLat},${userLng});
      );
      out center 10;
    `;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: `data=${encodeURIComponent(overpassQuery)}`,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json() as any;
      if (data && Array.isArray(data.elements)) {
        for (const el of data.elements) {
          const lat = el.lat || el.center?.lat;
          const lon = el.lon || el.center?.lon;
          if (!lat || !lon) continue;

          const tags = el.tags || {};
          const name = tags.name || tags['name:en'] || 'Police Station';
          const phone = tags.phone || tags['contact:phone'] || tags['contact:mobile'] || '';
          const dist = calculateHaversineDistance(userLat, userLng, lat, lon);

          stations.push({
            id: `osm_${el.id}`,
            name,
            phone: phone ? phone.replace(/[\s\-]/g, '') : '',
            distanceKm: parseFloat(dist.toFixed(2)),
            distanceFormatted: `${dist.toFixed(2)} km`,
            latitude: lat,
            longitude: lon,
            address: tags['addr:street'] ? `${tags['addr:street']}, ${tags['addr:city'] || ''}` : undefined,
            source: 'OVERPASS_OSM',
          });
        }
      }
    }
  } catch (err: any) {
    console.warn(`[PoliceService] Overpass API query failed or timed out: ${err.message}. Using local database fallback.`);
  }

  // 2. Fetch local fallback stations from database
  try {
    const localStations = await db.query<any>('SELECT * FROM police_stations');
    for (const ls of localStations) {
      const dist = calculateHaversineDistance(userLat, userLng, ls.latitude, ls.longitude);
      stations.push({
        id: ls.id,
        name: ls.name,
        phone: ls.phone,
        distanceKm: parseFloat(dist.toFixed(2)),
        distanceFormatted: `${dist.toFixed(2)} km`,
        latitude: ls.latitude,
        longitude: ls.longitude,
        district: ls.district,
        address: ls.address,
        source: 'LOCAL_DATABASE',
      });
    }
  } catch (e: any) {
    console.error('[PoliceService] Error querying local police stations:', e.message);
  }

  // 3. Sort by distance ascending and pick top 3
  stations.sort((a, b) => a.distanceKm - b.distanceKm);

  // Return unique top 3
  const uniqueStations: PoliceStationInfo[] = [];
  const seenNames = new Set<string>();

  for (const st of stations) {
    const key = st.name.toLowerCase().trim();
    if (!seenNames.has(key)) {
      seenNames.add(key);
      uniqueStations.push(st);
      if (uniqueStations.length >= 3) break;
    }
  }

  return uniqueStations;
}
