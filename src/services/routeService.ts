import { RouteOption, SafePoint } from '../types';
import { storageService, StorageKeys } from './storageService';

export const DEMO_SAFE_POINTS: SafePoint[] = [
  {
    id: 'sp_1',
    name: 'Demo City Police Station',
    type: 'Police Station',
    distanceKm: 1.2,
    openHours: 'Open 24/7 — Demo Data',
    x: 32,
    y: 42,
    contactNumber: '112 (Simulation)'
  },
  {
    id: 'sp_2',
    name: 'Metro City Hospital',
    type: 'Hospital',
    distanceKm: 1.9,
    openHours: '24/7 Trauma Care — Demo Data',
    x: 68,
    y: 35,
    contactNumber: '108 (Simulation)'
  },
  {
    id: 'sp_3',
    name: 'Apollo 24/7 Pharmacy & Hub',
    type: 'Pharmacy',
    distanceKm: 0.6,
    openHours: 'Open 24 Hours — CCTV Verified',
    x: 48,
    y: 65,
    contactNumber: '+91 1800 200 4545'
  },
  {
    id: 'sp_4',
    name: 'Central Metro Security Kiosk',
    type: 'Security Point',
    distanceKm: 0.9,
    openHours: 'Active Armed Patrol — Demo Data',
    x: 22,
    y: 75,
    contactNumber: 'Internal Guard Node 4'
  }
];

export const DEMO_ROUTES: RouteOption[] = [
  {
    id: 'route_fastest',
    name: 'Fastest Route (Direct Arterial)',
    type: 'fastest',
    durationMin: 18,
    distanceKm: 6.2,
    riskScore: 42,
    reasons: [
      'Shortest travel time via Western Expressway',
      'Moderate street illumination in service lanes',
      'Fewer public surveillance checkpoints after 8 PM'
    ],
    lightingQuality: 'Fair',
    pedestrianDensity: 'Low',
    safePointsNearby: 2
  },
  {
    id: 'route_safer',
    name: 'AI Recommended Safer Route',
    type: 'safer',
    durationMin: 21,
    distanceKm: 6.8,
    riskScore: 23,
    badge: 'AI RECOMMENDED FOR SAFETY',
    reasons: [
      'Better continuous LED street lighting (+85% coverage)',
      'Higher active pedestrian activity & open storefronts',
      'Passes 4 certified emergency safe havens & police kiosk',
      'Historically lowest alert density in the metropolitan sector'
    ],
    lightingQuality: 'Good',
    pedestrianDensity: 'High',
    safePointsNearby: 4
  },
  {
    id: 'route_public',
    name: 'Public Transit Corridor',
    type: 'public',
    durationMin: 24,
    distanceKm: 7.1,
    riskScore: 18,
    badge: 'MAXIMUM SURVEILLANCE',
    reasons: [
      'Direct line along Metro Blue Line corridor',
      'Continuous CCTV coverage and live security guards',
      'Highest crowd density and transit frequency'
    ],
    lightingQuality: 'Good',
    pedestrianDensity: 'High',
    safePointsNearby: 5
  }
];

import { apiUrl } from './apiConfig';

export const routeService = {
  getAvailableRoutes(_destination?: string): RouteOption[] {
    return DEMO_ROUTES;
  },

  async calculateRealRoutes(originLat: number, originLng: number, destination: string): Promise<RouteOption[]> {
    try {
      const response = await fetch(apiUrl('/api/routes/calculate'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originLat,
          originLng,
          destination,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.routes && data.routes.length > 0) {
          return data.routes.map((r: any) => ({
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
        }
      }
    } catch (err) {
      console.warn('[routeService] Backend route calculation offline, returning fallback routes:', err);
    }
    return DEMO_ROUTES;
  },

  getSelectedRoute(): RouteOption {
    return storageService.getItem<RouteOption>(StorageKeys.SELECTED_ROUTE, DEMO_ROUTES[1]);
  },

  saveSelectedRoute(route: RouteOption): void {
    storageService.setItem(StorageKeys.SELECTED_ROUTE, route);
  },

  getSafePoints(): SafePoint[] {
    return DEMO_SAFE_POINTS;
  }
};

