import { RiskAssessment, RiskLevel } from '../types';
import { riskService } from './riskService';
import { locationService, GPSLocation } from './locationService';
import { storageService, StorageKeys } from './storageService';
import { AppSettings } from '../types';

export interface RiskMonitoringStatus {
  isActive: boolean;
  lastAssessment: RiskAssessment;
  lastTime: number;
  secondsAgo: number;
}
export type RiskMonitoringState = RiskMonitoringStatus;

export type RiskListener = (assessment: RiskAssessment, secondsAgo: number) => void;
export type CriticalAlertCallback = (assessment: RiskAssessment) => void;

class RiskMonitoringService {
  private isMonitoring: boolean = false;
  private checkInterval: any = null;
  private secondsAgoInterval: any = null;
  private lastAssessmentTime: number = Date.now();
  private currentAssessment: RiskAssessment;
  private listeners: Set<RiskListener> = new Set();
  private criticalCallbacks: Set<CriticalAlertCallback> = new Set();
  private lastLocation: GPSLocation | null = null;
  private hasTriggeredCriticalAlert: boolean = false;

  constructor() {
    this.currentAssessment = riskService.getAssessment();
  }

  public init(): void {
    if (typeof window === 'undefined') return;
    this.startMonitoring();
  }

  public subscribe(listener: RiskListener): () => void {
    this.listeners.add(listener);
    const secondsAgo = Math.max(0, Math.floor((Date.now() - this.lastAssessmentTime) / 1000));
    listener(this.currentAssessment, secondsAgo);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public onCriticalRisk(callback: CriticalAlertCallback): () => void {
    this.criticalCallbacks.add(callback);
    return () => {
      this.criticalCallbacks.delete(callback);
    };
  }

  public startMonitoring(): void {
    if (this.isMonitoring) return;
    this.isMonitoring = true;

    // 1. Subscribe to continuous device GPS
    locationService.startContinuousTracking();
    locationService.subscribe((loc) => {
      this.lastLocation = loc;
      // Re-evaluate on substantial movement (> 25 meters)
      this.evaluateRisk();
    });

    // 2. Periodic risk checks every 10 seconds (Rule 2)
    this.checkInterval = setInterval(() => {
      this.evaluateRisk();
    }, 10000);

    // 3. Heartbeat for seconds-ago counter
    this.secondsAgoInterval = setInterval(() => {
      const secondsAgo = Math.max(0, Math.floor((Date.now() - this.lastAssessmentTime) / 1000));
      this.notifyListeners(secondsAgo);
    }, 1000);

    this.evaluateRisk();
  }

  public stopMonitoring(): void {
    this.isMonitoring = false;
    if (this.checkInterval) clearInterval(this.checkInterval);
    if (this.secondsAgoInterval) clearInterval(this.secondsAgoInterval);
    this.checkInterval = null;
    this.secondsAgoInterval = null;
  }

  public evaluateRisk(): void {
    const loc = this.lastLocation || locationService.getCurrentLocation();
    const assessment = riskService.getAssessment(undefined, loc);
    this.currentAssessment = assessment;
    this.lastAssessmentTime = Date.now();

    this.notifyListeners(0);

    // Check if score is CRITICAL (80-100) (Section 12: 80+ threshold)
    const hasValidGps = Boolean(loc && loc.latitude && loc.longitude);
    if (assessment.score >= 80 && !this.hasTriggeredCriticalAlert && hasValidGps) {
      // Check user setting
      const settings = storageService.getItem<AppSettings>(StorageKeys.APP_SETTINGS, {
        autoEmergencyProtection: true,
      } as any);

      if (settings.autoEmergencyProtection) {
        this.hasTriggeredCriticalAlert = true;
        this.criticalCallbacks.forEach((cb) => cb(assessment));
      }
    }
  }

  // Allow resetting critical alert flag once emergency is resolved or cancelled
  public resetCriticalAlert(): void {
    this.hasTriggeredCriticalAlert = false;
  }

  // Developer / Evaluator safe test trigger (Rule 16)
  public simulateCriticalRisk(): void {
    const testAssessment: RiskAssessment = {
      score: 87,
      level: 'CRITICAL',
      factors: {
        locationRisk: 88,
        timeRisk: 85,
        crowdDensity: 82,
        lighting: 90,
        historicalDensity: 88,
      },
      confidence: 88,
      nearbySafePlacesCount: 1,
      lastUpdated: 'Just now (Simulated Test)',
      locationName: this.lastLocation
        ? `Live GPS (${this.lastLocation.latitude.toFixed(4)}, ${this.lastLocation.longitude.toFixed(4)})`
        : 'Current Device Position',
      explanation:
        'Test Environment: Simulated elevated threat factors. Late-night corridor, minimal lighting, and reduced crowd presence triggered critical threshold.',
      factorDescriptions: {
        location: 'Elevated Hazard Sector (Test Mode)',
        time: 'Night Vulnerability Window (23:00+)',
        crowd: 'Sparse Pedestrian Activity (<10%)',
        lighting: 'Dim / Broken Streetlight Zone',
        historical: 'Historical Incident Cluster (Sample Data)',
      },
    };

    this.currentAssessment = testAssessment;
    this.notifyListeners(0);
    this.criticalCallbacks.forEach((cb) => cb(testAssessment));
  }

  private notifyListeners(secondsAgo: number): void {
    this.listeners.forEach((listener) => {
      try {
        listener(this.currentAssessment, secondsAgo);
      } catch (err) {
        console.warn('[RiskMonitoringService] Listener error:', err);
      }
    });
  }

  public getStatus(): RiskMonitoringStatus {
    return {
      isActive: this.isMonitoring,
      lastAssessment: this.currentAssessment,
      lastTime: this.lastAssessmentTime,
      secondsAgo: Math.max(0, Math.floor((Date.now() - this.lastAssessmentTime) / 1000)),
    };
  }

  public getState(): RiskMonitoringStatus {
    return this.getStatus();
  }
}

export const riskMonitoringService = new RiskMonitoringService();
