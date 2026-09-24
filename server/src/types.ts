export interface UserRecord {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  phone: string;
  role: 'USER' | 'RESPONDER' | 'ADMIN';
  created_at: string;
}

export interface TrustedContactRecord {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  email: string;
  relationship: string;
  is_primary: number;
  notification_preference: string;
  created_at: string;
  updated_at: string;
}

export type IncidentStatus = 
  | 'CREATED'
  | 'LOCATION_ACQUIRED'
  | 'CONTACTS_NOTIFIED'
  | 'RESPONDER_NOTIFIED'
  | 'LIVE_TRACKING'
  | 'RESPONDER_ACCEPTED'
  | 'RESPONDER_NAVIGATING'
  | 'RESOLVED'
  | 'CLOSED';

export interface EmergencyIncidentRecord {
  id: string;
  user_id: string;
  status: IncidentStatus;
  risk_level: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  risk_score: number;
  latitude: number;
  longitude: number;
  accuracy: number;
  location_name: string;
  responder_id: string | null;
  responder_name?: string;
  responder_badge?: string;
  responder_latitude?: number | null;
  responder_longitude?: number | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
}

export interface IncidentEventRecord {
  id: string;
  incident_id: string;
  event: string;
  actor: string;
  timestamp: string;
  metadata: string;
}

export interface LocationUpdateRecord {
  id: string;
  incident_id?: string;
  user_id: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  speed: number | null;
  heading: number | null;
  altitude: number | null;
  timestamp: string;
}

export interface TrackingSessionRecord {
  id: string;
  user_id: string;
  incident_id: string;
  token: string;
  status: 'ACTIVE' | 'EXPIRED';
  started_at: string;
  expires_at: string;
}

export interface EvidenceRecord {
  id: string;
  incident_id: string;
  user_id: string;
  type: 'photo' | 'audio' | 'video' | 'snapshot';
  title: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  sha256_hash: string;
  duration_sec: number | null;
  is_locked: number;
  created_at: string;
}

export interface NotificationRecord {
  id: string;
  incident_id: string;
  recipient: string;
  type: 'SMS' | 'EMAIL' | 'PUSH' | 'IN_APP';
  status: 'PENDING' | 'SENT' | 'FAILED';
  provider: string;
  provider_message_id: string | null;
  error_message: string | null;
  created_at: string;
}
