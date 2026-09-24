// NIRBHAYA AI - Production Location Service using navigator.geolocation
export interface GPSLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude: number | null;
  altitudeAccuracy: number | null;
  heading: number | null;
  speed: number | null;
  timestamp: number;
}

export type LocationStatus = 
  | 'ACQUIRING'
  | 'LIVE_GPS'
  | 'PERMISSION_DENIED'
  | 'POSITION_UNAVAILABLE'
  | 'TIMEOUT'
  | 'UNSUPPORTED'
  | 'OFFLINE';

export type LocationListener = (location: GPSLocation | null, status: LocationStatus, error?: string) => void;

class LocationService {
  private watchId: number | null = null;
  private currentLocation: GPSLocation | null = null;
  private hasRealFix: boolean = false;
  private currentStatus: LocationStatus = 'ACQUIRING';
  private lastErrorMessage: string | null = null;
  private listeners: Set<LocationListener> = new Set();
  private lastUpdatedTime: number = 0;

  constructor() {
    this.currentLocation = null;
    this.hasRealFix = false;
    this.currentStatus = 'ACQUIRING';
    
    // Automatically start tracking in browser environments
    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      this.startContinuousTracking();
    }
  }

  public subscribe(listener: LocationListener): () => void {
    this.listeners.add(listener);
    listener(this.currentLocation, this.currentStatus, this.lastErrorMessage || undefined);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public startContinuousTracking(): void {
    if (this.watchId !== null) return; // already active

    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      this.currentStatus = 'UNSUPPORTED';
      this.lastErrorMessage = 'Browser does not support the Geolocation API.';
      this.notifyListeners();
      return;
    }

    this.currentStatus = 'ACQUIRING';
    this.notifyListeners();

    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    };

    try {
      this.watchId = navigator.geolocation.watchPosition(
        (position: GeolocationPosition) => {
          this.hasRealFix = true;
          this.currentLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: Math.round(position.coords.accuracy),
            altitude: position.coords.altitude,
            altitudeAccuracy: position.coords.altitudeAccuracy,
            heading: position.coords.heading,
            speed: position.coords.speed,
            timestamp: position.timestamp,
          };
          this.currentStatus = 'LIVE_GPS';
          this.lastErrorMessage = null;
          this.lastUpdatedTime = Date.now();
          this.notifyListeners();
        },
        (error: GeolocationPositionError) => {
          console.warn('[LocationService] Geolocation error:', error.message);
          switch (error.code) {
            case error.PERMISSION_DENIED:
              this.currentStatus = 'PERMISSION_DENIED';
              this.lastErrorMessage = 'Location permission denied. Please allow GPS access in your browser settings.';
              break;
            case error.POSITION_UNAVAILABLE:
              this.currentStatus = 'POSITION_UNAVAILABLE';
              this.lastErrorMessage = 'GPS signal unavailable. Ensure location services are enabled on device.';
              break;
            case error.TIMEOUT:
              this.currentStatus = 'TIMEOUT';
              this.lastErrorMessage = 'Location acquisition timed out. Retrying high-accuracy fix...';
              break;
            default:
              this.currentStatus = 'POSITION_UNAVAILABLE';
              this.lastErrorMessage = error.message;
          }
          this.notifyListeners();
        },
        options
      );
    } catch (err: any) {
      this.currentStatus = 'POSITION_UNAVAILABLE';
      this.lastErrorMessage = err.message || 'Failed to initialize geolocation tracking.';
      this.notifyListeners();
    }
  }

  public stopContinuousTracking(): void {
    if (this.watchId !== null && typeof navigator !== 'undefined') {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }

  public getCurrentLocation(): GPSLocation | null {
    return this.currentLocation;
  }

  public hasRealFixAcquired(): boolean {
    return this.hasRealFix && this.currentLocation !== null;
  }

  public getStatus(): LocationStatus {
    return this.currentStatus;
  }

  public getErrorMessage(): string | null {
    return this.lastErrorMessage;
  }

  public getLastUpdatedSecondsAgo(): number {
    if (this.lastUpdatedTime === 0) return 0;
    return Math.floor((Date.now() - this.lastUpdatedTime) / 1000);
  }

  public getFormattedAccuracy(): string {
    if (!this.currentLocation) return 'GPS unavailable';
    return `±${this.currentLocation.accuracy} m`;
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) =>
      listener(this.currentLocation, this.currentStatus, this.lastErrorMessage || undefined)
    );
  }
}

export const locationService = new LocationService();
