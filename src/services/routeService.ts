import { RouteOption, SafePoint } from '../types';
import { storageService, StorageKeys } from './storageService';
import { apiUrl } from './apiConfig';

export const VERIFIED_SAFE_HAVENS: SafePoint[] = [
  {
    id: 'sp_police_central',
    name: 'Police Station (Emergency 112)',
    type: 'Police Station',
    distanceKm: 0.8,
    openHours: 'Open 24/7 • National Emergency Police & Patrol Hub',
    x: 35,
    y: 45,
    contactNumber: '112'
  },
  {
    id: 'sp_hospital_general',
    name: 'Emergency Hospital & Trauma Center (108)',
    type: 'Hospital',
    distanceKm: 1.4,
    openHours: 'Open 24/7 • Emergency Medical & Trauma Care',
    x: 65,
    y: 38,
    contactNumber: '108'
  },
  {
    id: 'sp_women_helpline_hub',
    name: 'Women Safety & Crisis Assistance Hub (1091)',
    type: 'Security Point',
    distanceKm: 0.5,
    openHours: 'Open 24 Hours • Women In Distress Helpline',
    x: 48,
    y: 62,
    contactNumber: '1091'
  },
  {
    id: 'sp_metro_security',
    name: 'Transit Police & Security Kiosk (112)',
    type: 'Security Point',
    distanceKm: 0.9,
    openHours: 'Active Continuous Surveillance & Guard Post',
    x: 24,
    y: 72,
    contactNumber: '112'
  }
];

export const DEMO_SAFE_POINTS = VERIFIED_SAFE_HAVENS;
export const DEMO_ROUTES: RouteOption[] = [];

export const routeService = {
  getAvailableRoutes(_destination?: string): RouteOption[] {
    return storageService.getItem<RouteOption[]>(StorageKeys.LAST_CALCULATED_ROUTES, []);
  },

  async calculateRealRoutes(
    originLat: number,
    originLng: number,
    destination: string
  ): Promise<{ routes: RouteOption[]; destination: { lat: number; lng: number; name: string } }> {
    const response = await fetch(apiUrl('/api/routes/calculate'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        originLat,
        originLng,
        destination,
      }),
    });

    if (!response.ok) {
      let errMsg = 'Destination could not be found. Please check spelling or specify a known landmark.';
      try {
        const errJson = await response.json();
        if (errJson.error) errMsg = errJson.error;
      } catch (e) {}
      throw new Error(errMsg);
    }

    const data = await response.json();
    if (!data.routes || data.routes.length === 0) {
      throw new Error('No safe driving or walking corridor found to this location.');
    }

    const mappedRoutes: RouteOption[] = data.routes.map((r: any) => ({
      id: r.id,
      name: r.name,
      type: r.type,
      durationMin: r.durationMin,
      distanceKm: r.distanceKm,
      riskScore: r.riskScore,
      badge: r.badge,
      reasons: r.reasons,
      lightingQuality: r.riskScore < 25 ? 'Good' : r.riskScore < 40 ? 'Fair' : 'Poor',
      pedestrianDensity: r.type === 'fastest' ? 'Low' : 'High',
      safePointsNearby: r.safePointsCount || 3,
      geometry: r.geometry,
    }));

    storageService.setItem(StorageKeys.LAST_CALCULATED_ROUTES, mappedRoutes);

    return {
      routes: mappedRoutes,
      destination: data.destination || { lat: originLat + 0.02, lng: originLng + 0.02, name: destination },
    };
  },

  getSelectedRoute(): RouteOption | null {
    return storageService.getItem<RouteOption | null>(StorageKeys.SELECTED_ROUTE, null);
  },

  saveSelectedRoute(route: RouteOption): void {
    storageService.setItem(StorageKeys.SELECTED_ROUTE, route);
  },

  getSafePoints(): SafePoint[] {
    return VERIFIED_SAFE_HAVENS;
  }
};
