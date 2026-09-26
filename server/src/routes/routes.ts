import { Router, Request, Response } from 'express';
import { calculateRealRoutes } from '../services/routingService';

export const routesRouter = Router();

// Geocode query helper using OpenStreetMap Nominatim
async function resolveDestinationCoordinates(query: string, originLat: number, originLng: number): Promise<{ lat: number; lng: number; name: string } | null> {
  const normalized = query.trim();
  if (!normalized) return null;

  // Check if query is "lat,lng" format
  const coordParts = query.split(',').map((s) => parseFloat(s.trim()));
  if (coordParts.length === 2 && !isNaN(coordParts[0]) && !isNaN(coordParts[1])) {
    return { lat: coordParts[0], lng: coordParts[1], name: `Point (${coordParts[0].toFixed(4)}, ${coordParts[1].toFixed(4)})` };
  }

  // Try Nominatim OpenStreetMap Geocoding
  try {
    const encoded = encodeURIComponent(query);
    const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=1`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

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
    console.warn('[Routes] Nominatim lookup timed out or failed:', err);
  }

  return null;
}

// POST /api/routes/calculate
routesRouter.post('/calculate', async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      originLat,
      originLng,
      destLat,
      destLng,
      destination = '',
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
      if (!resolved) {
        res.status(404).json({
          success: false,
          error: 'Destination could not be found. Please check spelling or specify a known landmark.',
        });
        return;
      }
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
