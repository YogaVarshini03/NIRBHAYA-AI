import { RouteOption, RouteDeviationState, DeviationLevel } from '../types';
import { locationService, GPSLocation } from './locationService';
import { storageService, StorageKeys } from './storageService';
import { AppSettings } from '../types';

export type DeviationListener = (state: RouteDeviationState) => void;
export type DeviationEmergencyCallback = (reason: string) => void;

function haversineDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Minimum distance from a point to a line segment
function distanceToSegmentMeters(
  pLat: number,
  pLng: number,
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number
): number {
  const l2 = Math.pow(bLat - aLat, 2) + Math.pow(bLng - aLng, 2);
  if (l2 === 0) return haversineDistanceMeters(pLat, pLng, aLat, aLng);

  let t = ((pLat - aLat) * (bLat - aLat) + (pLng - aLng) * (bLng - aLng)) / l2;
  t = Math.max(0, Math.min(1, t));

  const projLat = aLat + t * (bLat - aLat);
  const projLng = aLng + t * (bLng - aLng);
  return haversineDistanceMeters(pLat, pLng, projLat, projLng);
}

class RouteDeviationService {
  private state: RouteDeviationState = {
    isMonitoring: false,
    plannedRoute: null,
    destination: null,
    deviationDistanceMeters: 0,
    deviationLevel: 'NORMAL',
    consecutiveDeviations: 0,
    isDestinationReached: false,
    lastCheckedTime: Date.now(),
  };

  private listeners: Set<DeviationListener> = new Set();
  private emergencyCallbacks: Set<DeviationEmergencyCallback> = new Set();
  private locationUnsub: (() => void) | null = null;
  private isSilencedForSegment: boolean = false;

  public subscribe(listener: DeviationListener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public onDeviationEmergency(callback: DeviationEmergencyCallback): () => void {
    this.emergencyCallbacks.add(callback);
    return () => {
      this.emergencyCallbacks.delete(callback);
    };
  }

  public startNavigation(
    route: RouteOption,
    destination: { lat: number; lng: number; name: string }
  ): void {
    this.state = {
      isMonitoring: true,
      plannedRoute: route,
      destination,
      deviationDistanceMeters: 0,
      deviationLevel: 'NORMAL',
      consecutiveDeviations: 0,
      isDestinationReached: false,
      lastCheckedTime: Date.now(),
    };
    this.isSilencedForSegment = false;
    this.notify();

    if (this.locationUnsub) {
      this.locationUnsub();
    }

    this.locationUnsub = locationService.subscribe((gps) => {
      if (gps) {
        this.checkDeviation(gps);
      }
    });
  }

  public stopNavigation(): void {
    this.state.isMonitoring = false;
    if (this.locationUnsub) {
      this.locationUnsub();
      this.locationUnsub = null;
    }
    this.notify();
  }

  public acknowledgeSafety(): void {
    this.isSilencedForSegment = true;
    this.state.deviationLevel = 'NORMAL';
    this.state.consecutiveDeviations = 0;
    this.notify();
  }

  public checkDeviation(gps: GPSLocation): void {
    if (!this.state.isMonitoring || !this.state.plannedRoute || this.state.isDestinationReached) return;

    // Check Destination Arrival (Rule 9: within 60 meters of destination)
    if (this.state.destination) {
      const distToDest = haversineDistanceMeters(
        gps.latitude,
        gps.longitude,
        this.state.destination.lat,
        this.state.destination.lng
      );
      if (distToDest <= 60) {
        this.state.isDestinationReached = true;
        this.state.deviationLevel = 'NORMAL';
        this.stopNavigation();
        this.notify();
        return;
      }
    }

    // Ignore noisy GPS fixes (> 65m accuracy) to reduce false alarms (Rule 8)
    if (gps.accuracy > 65) {
      return;
    }

    const geometry = this.state.plannedRoute.geometry;
    if (!geometry || geometry.length < 2) return;

    // Calculate minimum cross-track distance to any segment of planned route
    let minDistance = Infinity;
    for (let i = 0; i < geometry.length - 1; i++) {
      const dist = distanceToSegmentMeters(
        gps.latitude,
        gps.longitude,
        geometry[i][0],
        geometry[i][1],
        geometry[i + 1][0],
        geometry[i + 1][1]
      );
      if (dist < minDistance) {
        minDistance = dist;
      }
    }

    this.state.deviationDistanceMeters = Math.round(minDistance);
    this.state.lastCheckedTime = Date.now();

    // Check if user is on route (< 100 meters)
    if (minDistance <= 100) {
      this.state.consecutiveDeviations = 0;
      this.state.deviationLevel = 'NORMAL';
      this.isSilencedForSegment = false;
      this.notify();
      return;
    }

    // User is deviated > 100 meters
    if (this.isSilencedForSegment) {
      this.notify();
      return;
    }

    this.state.consecutiveDeviations += 1;

    // Level escalation
    let level: DeviationLevel = 'MINOR_DEVIATION'; // Level 1
    if (this.state.consecutiveDeviations >= 5 && minDistance >= 150) {
      level = 'CRITICAL_DEVIATION'; // Level 3: triggers countdown
    } else if (this.state.consecutiveDeviations >= 3) {
      level = 'PERSISTENT_DEVIATION'; // Level 2: alert modal
    }

    this.state.deviationLevel = level;
    this.notify();

    // If Level 3 is reached, trigger emergency callback if setting is ON
    if (level === 'CRITICAL_DEVIATION') {
      const settings = storageService.getItem<AppSettings>(StorageKeys.APP_SETTINGS, {
        routeDeviationProtection: true,
      } as any);

      if (settings.routeDeviationProtection) {
        this.emergencyCallbacks.forEach((cb) =>
          cb(`Critical persistent deviation detected: ${Math.round(minDistance)}m off designated safe corridor.`)
        );
      }
    }
  }

  // Developer simulation helper for testing
  public simulateDeviation(level: DeviationLevel): void {
    this.state.deviationDistanceMeters = level === 'CRITICAL_DEVIATION' ? 185 : level === 'PERSISTENT_DEVIATION' ? 125 : 65;
    this.state.deviationLevel = level;
    this.state.consecutiveDeviations = level === 'CRITICAL_DEVIATION' ? 5 : level === 'PERSISTENT_DEVIATION' ? 3 : 1;
    this.notify();

    if (level === 'CRITICAL_DEVIATION') {
      this.emergencyCallbacks.forEach((cb) =>
        cb(`Simulated Route Deviation Escalation: 185m away from planned corridor.`)
      );
    }
  }

  private notify(): void {
    this.listeners.forEach((listener) => {
      try {
        listener({ ...this.state });
      } catch (err) {
        console.warn('[RouteDeviationService] Listener error:', err);
      }
    });
  }

  public getState(): RouteDeviationState {
    return { ...this.state };
  }
}

export const routeDeviationService = new RouteDeviationService();
