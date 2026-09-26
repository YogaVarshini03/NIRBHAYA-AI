export type RiskLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';

export type UserRole = 'USER' | 'RESPONDER' | 'ADMIN';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  emergencyContact?: string;
  avatarUrl?: string;
  demoMode?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface Contact {
  id: string;
  name: string;
  relationship: 'Mother' | 'Father' | 'Friend' | 'Guardian' | 'Sibling' | 'Partner' | 'Other';
  phone: string;
  online: boolean;
  notificationPreference: 'SMS & App' | 'Push Only' | 'Call Priority' | 'All Channels';
}

export interface RiskFactors {
  locationRisk: number; // 0-100 (weight: 30%)
  timeRisk: number;     // 0-100 (weight: 15%)
  crowdDensity: number; // 0-100 (weight: 15%)
  lighting: number;     // 0-100 (weight: 15%, higher means poorer lighting/more risk)
  historicalDensity: number; // 0-100 (weight: 25%)
}

export interface RiskAssessment {
  score: number;
  level: RiskLevel;
  factors: RiskFactors;
  nearbySafePlacesCount: number;
  lastUpdated: string;
  locationName: string;
  explanation: string;
  confidence?: number; // 0-100% data confidence
  factorDescriptions?: {
    location?: string;
    time?: string;
    crowd?: string;
    lighting?: string;
    historical?: string;
  };
}

export interface RouteOption {
  id: string;
  name: string;
  type: 'fastest' | 'safer' | 'public';
  durationMin: number;
  distanceKm: number;
  riskScore: number;
  badge?: string;
  reasons: string[];
  lightingQuality: 'Good' | 'Fair' | 'Poor';
  pedestrianDensity: 'High' | 'Medium' | 'Low';
  safePointsNearby: number;
  geometry?: [number, number][];
  path?: [number, number][];
}

export interface SafePoint {
  id: string;
  name: string;
  type: 'Police Station' | 'Hospital' | 'Pharmacy' | 'Public Place' | 'Security Point';
  distanceKm: number;
  openHours: string;
  x: number; // % in simulated map
  y: number;
  contactNumber: string;
}

export interface EvidenceItem {
  id: string;
  type: 'audio' | 'video' | 'snapshot';
  title: string;
  timestamp: string;
  location: string;
  duration: string;
  fileType: string;
  size: string;
  isLocked: boolean;
  sha256Hash: string;
  userId?: string;
  userName?: string;
  incidentId?: string;
  latitude?: number | null;
  longitude?: number | null;
  gpsAccuracy?: number | null;
  capturedAt?: string;
  fileUrl?: string;
  chainOfCustody: {
    stage: string;
    timestamp: string;
    verified: boolean;
  }[];
  downloadUrl?: string;
}

export interface Responder {
  id: string;
  name: string;
  badgeNumber: string;
  distanceKm: number;
  etaMinutes: number;
  etaFormatted: string;
  status: 'DISPATCHED' | 'EN ROUTE' | 'EN ROUTE — DEMO' | 'ON SCENE' | 'STANDBY';
  vehicle: string;
  phone: string;
}

export type IncidentStatus = 
  | 'CREATED'
  | 'ACKNOWLEDGED'
  | 'RESPONDER_ACCEPTED'
  | 'EN_ROUTE'
  | 'ON_SCENE'
  | 'RESOLVED'
  | 'CANCELLED'
  | 'TRIGGERED'
  | 'LOCATION_ACQUIRED'
  | 'CONTACTS_NOTIFIED'
  | 'RESPONDER_ASSIGNED'
  | 'ACCEPTED'
  | 'ACCEPTED — DEMO'
  | 'IN_PROGRESS'
  | 'LIVE_TRACKING'
  | 'RESOLVED — DEMO';

export interface EmergencyIncident {
  id: string;
  timestamp: string;
  riskLevel: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';
  riskScore: number;
  location: string;
  coordinates: { lat: number; lng: number };
  status: IncidentStatus;
  userStatus: string;
  elapsedSeconds: number;
  responder?: Responder;
  evidenceItems: EvidenceItem[];
  timeline: {
    id: string;
    step: string;
    time: string;
    completed: boolean;
  }[];
}

export interface SafetyEvent {
  id: string;
  type: 'analysis' | 'route' | 'drill' | 'sos' | 'responder' | 'evidence';
  title: string;
  description: string;
  timestamp: string;
  dateKey: 'today' | '7days' | '30days';
  scoreImpact?: number;
  statusBadge?: string;
}

export interface SystemServiceStatus {
  name: string;
  status: 'ONLINE' | 'ONLINE — DEMO' | 'ACTIVE' | 'CALIBRATING';
  latencyMs: number;
  uptime: string;
  subtext: string;
}

export type DeviationLevel = 'NORMAL' | 'MINOR_DEVIATION' | 'PERSISTENT_DEVIATION' | 'CRITICAL_DEVIATION';

export interface RouteDeviationState {
  isMonitoring: boolean;
  plannedRoute: RouteOption | null;
  destination: { lat: number; lng: number; name: string } | null;
  deviationDistanceMeters: number;
  deviationLevel: DeviationLevel;
  consecutiveDeviations: number;
  isDestinationReached: boolean;
  lastCheckedTime: number;
}

export interface AppSettings {
  pushNotifications: boolean;
  soundAlerts: boolean;
  autoRiskChecks: boolean;
  locationServices: boolean;
  emergencyAudioCapture: boolean;
  secretShakeDetection: boolean;
  triplePressTrigger: boolean;
  autoEmergencyProtection: boolean; // Automatic SOS when critical risk countdown expires
  routeDeviationProtection: boolean; // Route deviation alert & escalation
  emergencyCountdownSeconds: number; // Duration of countdown (10s default)
  demoMode?: boolean;
  theme: 'dark' | 'light';
}
