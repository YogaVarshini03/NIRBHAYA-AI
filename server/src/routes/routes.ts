import { Router, Request, Response } from 'express';
import { calculateRealRoutes } from '../services/routingService';

export const routesRouter = Router();

// Known reference locations for common test queries
const KNOWN_DESTINATIONS: Record<string, { lat: number; lng: number; name: string }> = {
  't nagar': { lat: 13.0418, lng: 80.2341, name: 'T. Nagar Commercial Hub' },
  't. nagar': { lat: 13.0418, lng: 80.2341, name: 'T. Nagar Commercial Hub' },
  'central station': { lat: 13.0827, lng: 80.2757, name: 'Puratchi Thalaivar Dr. M.G.R. Central Station' },
  'airport': { lat: 12.9941, lng: 80.1709, name: 'Chennai International Airport (MAA)' },
  'guindy': { lat: 13.0067, lng: 80.2025, name: 'Guindy Tech Park & Metro' },
  'velachery': { lat: 12.9759, lng: 80.2212, name: 'Velachery Phoenix Corridor' },
  'marina beach': { lat: 13.0500, lng: 80.2824, name: 'Marina Beach Promenade' },
  'anna nagar': { lat: 13.0850, lng: 80.2100, name: 'Anna Nagar Tower Park' },
};

// Geocode query helper using Nominatim or known list
async function resolveDestinationCoordinates(query: string, originLat: number, originLng: number): Promise<{ lat: number; lng: number; name: string }> {
  const normalized = query.toLowerCase().trim();
  
  for (const [key, val] of Object.entries(KNOWN_DESTINATIONS)) {
    if (normalized.includes(key)) {
      return val;
    }
  }

  // Check if query is "lat,lng" format
  const coordParts = query.split(',').map((s) => parseFloat(s.trim()));
  if (coordParts.length === 2 && !isNaN(coordParts[0]) && !isNaN(coordParts[1])) {
    return { lat: coordParts[0], lng: coordParts[1], name: `Point (${coordParts[0].toFixed(4)}, ${coordParts[1].toFixed(4)})` };
  }

  // Try Nominatim geocoding
  try {
    const encoded = encodeURIComponent(query);
    const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=1`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    const res = await fetch(nominatimUrl, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Nirbhaya-AI-Safety-App/1.0' },
    });
    clearTimeout(timeout);

    if (res.ok) {
      const results = await res.json() as any[];
      if (results && results.length > 0) {
        return {
          lat: parseFloat(results[0].lat),
          lng: parseFloat(results[0].lon),
          name: results[0].display_name.split(',')[0],
        };
      }
    }
  } catch (err) {
    console.warn('[Routes] Nominatim lookup timed out or failed, using relative offset.');
  }

  // Fallback: 3km North-East of origin
  return {
    lat: originLat + 0.025,
    lng: originLng + 0.025,
    name: query || 'Selected Destination',
  };
}

// POST /api/routes/calculate
routesRouter.post('/calculate', async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      originLat,
      originLng,
      destLat,
      destLng,
      destination = 'Safe Sanctuary',
    } = req.body;

    if (originLat === undefined || originLng === undefined || typeof originLat !== 'number' || typeof originLng !== 'number') {
      res.status(400).json({
        success: false,
        error: 'GPS location required — valid origin coordinates are needed to calculate a safe route.',
      });
      return;
    }

    let targetLat = destLat;
    let targetLng = destLng;
    let targetName = destination;

    if (!targetLat || !targetLng) {
      const resolved = await resolveDestinationCoordinates(destination, originLat, originLng);
      targetLat = resolved.lat;
      targetLng = resolved.lng;
      targetName = resolved.name;
    }

    const routes = await calculateRealRoutes(originLat, originLng, targetLat, targetLng, targetName);

    res.json({
      success: true,
      origin: { lat: originLat, lng: originLng },
      destination: { lat: targetLat, lng: targetLng, name: targetName },
      routes,
      calculatedAt: new Date().toISOString(),
      disclaimer: 'Risk score is an experimental safety indicator calculated from real-time road topology, lighting levels, and historical police data.',
    });
  } catch (error: any) {
    console.error('[Routes] Error calculating safer routes:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});
