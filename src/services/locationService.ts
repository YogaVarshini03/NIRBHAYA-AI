// NIRBHAYA AI - Production Location Service with Real High-Accuracy Geolocation & Reverse Geocoding
export interface GPSLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude: number | null;
  altitudeAccuracy: number | null;
  heading: number | null;
  speed: number | null;
  timestamp: number;
  address?: string;
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

// In-memory cache for reverse geocoding results
const geocodeCache = new Map<string, string>();

class LocationService {
  private watchId: number | null = null;
  private currentLocation: GPSLocation | null = null;
  private hasRealFix: boolean = false;
  private currentStatus: LocationStatus = 'ACQUIRING';
  private lastErrorMessage: string | null = null;
  private listeners: Set<LocationListener> = new Set();
  private lastUpdatedTime: number = 0;
  private cachedAddress: string = 'Locating current street...';
  private isResolvingAddress: boolean = false;

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
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;

          this.currentLocation = {
            latitude: lat,
            longitude: lng,
            accuracy: Math.round(position.coords.accuracy),
            altitude: position.coords.altitude,
            altitudeAccuracy: position.coords.altitudeAccuracy,
            heading: position.coords.heading,
            speed: position.coords.speed,
            timestamp: position.timestamp,
            address: this.cachedAddress,
          };
          this.currentStatus = 'LIVE_GPS';
          this.lastErrorMessage = null;
          this.lastUpdatedTime = Date.now();
          this.notifyListeners();

          // Non-blocking reverse geocode update
          this.resolveAddressForCoords(lat, lng);
        },
        (error: GeolocationPositionError) => {
          console.warn('[LocationService] Geolocation error:', error.message);
          switch (error.code) {
            case error.PERMISSION_DENIED:
              this.currentStatus = 'PERMISSION_DENIED';
              this.lastErrorMessage = 'Location permission denied. Please allow GPS access in browser settings.';
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

  /**
   * Reverse geocodes coordinates to a human-readable street name using OpenStreetMap Nominatim / BigDataCloud.
   */
  public async reverseGeocode(lat: number, lng: number): Promise<string> {
    const cacheKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;
    if (geocodeCache.has(cacheKey)) {
      return geocodeCache.get(cacheKey)!;
    }

    try {
      // 1. Try free OpenStreetMap Nominatim
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        {
          headers: {
            'Accept-Language': 'en',
          },
        }
      );

      if (res.ok) {
        const data = await res.json();
        if (data && data.address) {
          const a = data.address;
          const road = a.road || a.street || a.pedestrian || a.suburb || a.neighbourhood || '';
          const locality = a.city_district || a.suburb || a.city || a.town || a.village || a.county || '';
          const state = a.state || a.country || '';
          
          const parts = [road, locality, state].filter(Boolean);
          const fullAddress = parts.length > 0 ? parts.join(', ') : data.display_name?.split(',').slice(0, 3).join(',') || `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;

          geocodeCache.set(cacheKey, fullAddress);
          return fullAddress;
        }
      }
    } catch (e) {
      // Fallback below
    }

    try {
      // 2. Fast Fallback: BigDataCloud Reverse Geocoding API (free client endpoint)
      const res2 = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
      );
      if (res2.ok) {
        const d = await res2.json();
        const parts = [d.locality || d.localityInfo?.administrative?.[3]?.name, d.city || d.principalSubdivision, d.countryName].filter(Boolean);
        if (parts.length > 0) {
          const addr = parts.join(', ');
          geocodeCache.set(cacheKey, addr);
          return addr;
        }
      }
    } catch (e) {}

    const fallback = `GPS (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
    geocodeCache.set(cacheKey, fallback);
    return fallback;
  }

  private async resolveAddressForCoords(lat: number, lng: number): Promise<void> {
    if (this.isResolvingAddress) return;
    this.isResolvingAddress = true;

    try {
      const address = await this.reverseGeocode(lat, lng);
      this.cachedAddress = address;
      if (this.currentLocation) {
        this.currentLocation = {
          ...this.currentLocation,
          address,
        };
        this.notifyListeners();
      }
    } catch (err) {
      console.warn('[LocationService] Reverse geocode error:', err);
    } finally {
      this.isResolvingAddress = false;
    }
  }

  public getCurrentLocation(): GPSLocation | null {
    return this.currentLocation;
  }

  public getCachedAddress(): string {
    return this.cachedAddress;
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
