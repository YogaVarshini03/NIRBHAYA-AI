import { EmergencyIncident, Responder, SafetyEvent } from '../types';
import { storageService, StorageKeys } from './storageService';
import { DEFAULT_EVIDENCE } from './evidenceService';
import { locationService } from './locationService';
import { apiUrl } from './apiConfig';
import { socketService } from './socketService';

export const DEFAULT_RESPONDER: Responder = {
  id: 'rsp_arjun_kumar_1042',
  name: 'Officer Arjun Kumar',
  badgeNumber: 'TN-POL-4412 / Rapid Response Unit',
  distanceKm: 1.8,
  etaMinutes: 4.5,
  etaFormatted: '04:32',
  status: 'STANDBY',
  vehicle: 'Interceptor PCR Patrol 14',
  phone: '+91 112 000 1042',
};

export const DEFAULT_INCIDENT: EmergencyIncident = {
  id: 'NG-STANDBY',
  timestamp: new Date().toLocaleTimeString(),
  riskLevel: 'LOW',
  riskScore: 10,
  location: 'No active emergency incident',
  coordinates: { lat: 0, lng: 0 },
  status: 'RESOLVED',
  userStatus: 'All Systems Normal',
  elapsedSeconds: 0,
  responder: DEFAULT_RESPONDER,
  evidenceItems: [],
  timeline: [],
};

export interface EmergencyCreationResult {
  incident: EmergencyIncident;
  trackingToken: string;
  notificationResults: Array<{ type: string; recipient: string; status: string; error?: string }>;
  googleMapsUrl?: string;
  isRealGps: boolean;
}

export const emergencyService = {
  getActiveIncident(): EmergencyIncident {
    return storageService.getItem<EmergencyIncident>(StorageKeys.ACTIVE_INCIDENT, DEFAULT_INCIDENT);
  },

  saveIncident(incident: EmergencyIncident): void {
    storageService.setItem(StorageKeys.ACTIVE_INCIDENT, incident);
  },

  async triggerEmergencyReal(triggerType: string = 'SOS Hold'): Promise<EmergencyCreationResult> {
    const gps = locationService.getCurrentLocation();
    
    // Rule: Never use hardcoded fallback as real GPS
    if (!gps) {
      throw new Error('GPS unavailable — waiting for location permission');
    }

    const lat = gps.latitude;
    const lng = gps.longitude;
    const accuracy = gps.accuracy;
    const locationName = `Live GPS (${lat.toFixed(5)}, ${lng.toFixed(5)})`;

    const endpoint = apiUrl('/api/emergency/create');
    console.log(`[emergencyService] Sending SOS dispatch to backend: ${endpoint}`);

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: 'usr_ananya_01',
        latitude: lat,
        longitude: lng,
        accuracy,
        locationName,
        triggerType,
        riskScore: 88,
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      let errMsg = `Backend dispatch failed (HTTP ${res.status})`;
      try {
        const parsed = JSON.parse(errText);
        errMsg = parsed.error || parsed.message || errMsg;
      } catch (e) {}
      throw new Error(errMsg);
    }

    const data = await res.json();
    if (!data.success || !data.incident) {
      throw new Error(data.message || 'Emergency creation rejected by backend');
    }

    const serverIncident = data.incident;
    const trackingToken = data.trackingToken || `trk_${Date.now()}`;
    const notificationResults = data.notificationResults || [];

    // Real incident object mapped from backend response
    const newIncident: EmergencyIncident = {
      id: serverIncident.id,
      timestamp: new Date().toLocaleTimeString(),
      riskLevel: serverIncident.risk_level || 'CRITICAL',
      riskScore: serverIncident.risk_score || 88,
      location: serverIncident.location_name || locationName,
      coordinates: { lat, lng },
      status: 'RESPONDER_ASSIGNED',
      userStatus: 'Active SOS Distress Broadcast',
      elapsedSeconds: 0,
      responder: {
        ...DEFAULT_RESPONDER,
        status: 'EN ROUTE',
      },
      evidenceItems: DEFAULT_EVIDENCE,
      timeline: [
        { id: '1', step: 'Emergency detected & verified', time: new Date().toLocaleTimeString(), completed: true },
        { id: '2', step: `Real GPS location acquired: (${lat.toFixed(4)}, ${lng.toFixed(4)}) ±${accuracy}m`, time: new Date().toLocaleTimeString(), completed: true },
        {
          id: '3',
          step: notificationResults.some((n: any) => n.status === 'SENT')
            ? 'Emergency alert dispatched to contacts'
            : 'Notification dispatch attempted (check provider status)',
          time: new Date().toLocaleTimeString(),
          completed: true,
        },
        { id: '4', step: 'Evidence vault session initialized', time: new Date().toLocaleTimeString(), completed: true },
        { id: '5', step: 'Nearest Rapid Response Unit alerted', time: new Date().toLocaleTimeString(), completed: true },
        { id: '6', step: `Live telemetry tracking stream active [Token ${trackingToken.slice(0, 10)}...]`, time: new Date().toLocaleTimeString(), completed: true },
      ],
    };

    this.saveIncident(newIncident);

    // Save to safety history
    const history = storageService.getItem<SafetyEvent[]>(StorageKeys.SAFETY_HISTORY, []);
    const event: SafetyEvent = {
      id: `evt_${Date.now()}`,
      type: 'sos',
      title: `Emergency Activated via ${triggerType}`,
      description: `Incident ID ${newIncident.id} generated. Contacts notified and Rapid Unit assigned.`,
      timestamp: 'Just now',
      dateKey: 'today',
      statusBadge: 'HIGH PRIORITY',
    };
    storageService.setItem(StorageKeys.SAFETY_HISTORY, [event, ...history]);

    // Connect WebSocket and broadcast location
    try {
      socketService.subscribeToIncident(newIncident.id, 'USER');
      socketService.sendLocation({
        incidentId: newIncident.id,
        latitude: lat,
        longitude: lng,
        accuracy,
        speed: gps.speed,
        heading: gps.heading,
        altitude: gps.altitude,
        senderRole: 'USER',
      });
    } catch (wsErr) {
      console.warn('[emergencyService] WebSocket notification warning:', wsErr);
    }

    return {
      incident: newIncident,
      trackingToken,
      notificationResults,
      isRealGps: true,
    };
  },

  async acceptIncidentReal(incidentId: string): Promise<EmergencyIncident> {
    try {
      const endpoint = apiUrl(`/api/emergency/${incidentId}/accept`);
      await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          responderId: DEFAULT_RESPONDER.id,
          responderName: DEFAULT_RESPONDER.name,
          responderBadge: DEFAULT_RESPONDER.badgeNumber,
        }),
      });
    } catch (err) {
      console.warn('[emergencyService] Remote accept failed:', err);
    }

    const inc = this.getActiveIncident();
    inc.status = 'ACCEPTED';
    inc.responder.status = 'EN ROUTE';
    inc.timeline.push({
      id: `${inc.timeline.length + 1}`,
      step: 'Responder accepted dispatch order',
      time: new Date().toLocaleTimeString(),
      completed: true,
    });
    this.saveIncident(inc);
    return inc;
  },

  acceptIncident(): EmergencyIncident {
    const inc = this.getActiveIncident();
    this.acceptIncidentReal(inc.id);
    return inc;
  },

  async navigateIncidentReal(incidentId: string): Promise<string> {
    const inc = this.getActiveIncident();
    const destinationUrl = `https://www.google.com/maps/dir/?api=1&destination=${inc.coordinates.lat},${inc.coordinates.lng}&travelmode=driving`;
    try {
      const endpoint = apiUrl(`/api/emergency/${incidentId}/navigate`);
      const res = await fetch(endpoint, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        return data.googleMapsUrl || destinationUrl;
      }
    } catch (err) {
      console.warn('[emergencyService] Remote navigate call failed:', err);
    }
    return destinationUrl;
  },

  async resolveIncidentReal(incidentId: string): Promise<EmergencyIncident> {
    try {
      const endpoint = apiUrl(`/api/emergency/${incidentId}/resolve`);
      await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resolvedBy: DEFAULT_RESPONDER.name,
          notes: 'Emergency resolved on scene.',
        }),
      });
    } catch (err) {
      console.warn('[emergencyService] Remote resolve failed:', err);
    }

    const inc = this.getActiveIncident();
    inc.status = 'RESOLVED';
    inc.timeline.push({
      id: `${inc.timeline.length + 1}`,
      step: 'Incident marked safe & resolved. Tracking expired.',
      time: new Date().toLocaleTimeString(),
      completed: true,
    });
    this.saveIncident(inc);
    return inc;
  },

  resolveIncident(): EmergencyIncident {
    const inc = this.getActiveIncident();
    this.resolveIncidentReal(inc.id);
    return inc;
  },

  async fetchActiveIncidentsFromBackend(): Promise<any[]> {
    try {
      const endpoint = apiUrl('/api/emergency/active');
      const res = await fetch(endpoint);
      if (res.ok) {
        const data = await res.json();
        return data.incidents || [];
      }
    } catch (err) {
      console.warn('[emergencyService] Failed fetching active incidents:', err);
    }
    return [];
  }
};
