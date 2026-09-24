import { SystemServiceStatus } from '../types';

export interface HeatmapZone {
  id: string;
  name: string;
  riskLevel: 'LOW' | 'MODERATE' | 'HIGH';
  score: number;
  incidentCount: number;
  patrolFrequency: string;
  lightingQuality: string;
  lastUpdated: string;
  x: number; // percentage in map
  y: number;
  radius: number;
}

export const HEATMAP_ZONES: HeatmapZone[] = [
  {
    id: 'zone_1',
    name: 'Connaught Central & Commercial Mall',
    riskLevel: 'LOW',
    score: 18,
    incidentCount: 1,
    patrolFrequency: 'Every 8 mins',
    lightingQuality: 'Ultra-bright High Mast LED',
    lastUpdated: '12 mins ago',
    x: 45,
    y: 40,
    radius: 75
  },
  {
    id: 'zone_2',
    name: 'University Campus & Transit Quad',
    riskLevel: 'LOW',
    score: 22,
    incidentCount: 2,
    patrolFrequency: 'Every 15 mins',
    lightingQuality: 'Good Pedestrian Illumination',
    lastUpdated: '25 mins ago',
    x: 25,
    y: 30,
    radius: 65
  },
  {
    id: 'zone_3',
    name: 'City Tech Park & Metro Hub',
    riskLevel: 'LOW',
    score: 15,
    incidentCount: 0,
    patrolFrequency: 'Continuous 24/7 Security Kiosk',
    lightingQuality: 'Continuous Smart Lighting',
    lastUpdated: '5 mins ago',
    x: 75,
    y: 65,
    radius: 80
  },
  {
    id: 'zone_4',
    name: 'Old Railway Quarter Bypass',
    riskLevel: 'MODERATE',
    score: 52,
    incidentCount: 8,
    patrolFrequency: 'Every 45 mins',
    lightingQuality: 'Intermittent Sodium Vapor',
    lastUpdated: '18 mins ago',
    x: 28,
    y: 72,
    radius: 60
  },
  {
    id: 'zone_5',
    name: 'East Cargo Terminal Outskirts',
    riskLevel: 'MODERATE',
    score: 58,
    incidentCount: 11,
    patrolFrequency: 'Hourly Patrol',
    lightingQuality: 'Low Illumination / Blind Spots',
    lastUpdated: '34 mins ago',
    x: 78,
    y: 28,
    radius: 65
  },
  {
    id: 'zone_6',
    name: 'Industrial Warehouse Underpass',
    riskLevel: 'HIGH',
    score: 82,
    incidentCount: 24,
    patrolFrequency: 'Infrequent / On-Demand',
    lightingQuality: 'Damaged Fixtures / 40% Dark',
    lastUpdated: '8 mins ago',
    x: 52,
    y: 82,
    radius: 70
  }
];

export const SYSTEM_SERVICES: SystemServiceStatus[] = [
  {
    name: 'AI Environmental Risk Inference Engine',
    status: 'ONLINE',
    latencyMs: 14,
    uptime: '99.98%',
    subtext: 'Real-time telemetry tensor evaluation (v2.4)'
  },
  {
    name: 'Interactive Geospatial Map Simulation Engine',
    status: 'ONLINE',
    latencyMs: 2,
    uptime: '100%',
    subtext: 'High-frequency vector street grid rendering'
  },
  {
    name: 'Multi-Channel Notification Dispatcher',
    status: 'ONLINE — DEMO',
    latencyMs: 42,
    uptime: '99.95%',
    subtext: 'Simulated SMS, App push & WebSocket broadcast'
  },
  {
    name: 'Decentralized Responder Coordination Network',
    status: 'ONLINE',
    latencyMs: 18,
    uptime: '98.8%',
    subtext: '12 active patrol nodes in immediate radius'
  },
  {
    name: 'Tamper-Evident Evidence Vault (Simulation)',
    status: 'ONLINE — DEMO',
    latencyMs: 28,
    uptime: '100%',
    subtext: 'SHA-256 cryptographic chain of custody'
  },
  {
    name: 'Local Browser State Database Engine',
    status: 'ONLINE',
    latencyMs: 1,
    uptime: '100%',
    subtext: 'Persistent HTML5 Web Storage active'
  }
];

import { apiUrl } from './apiConfig';

export const analyticsService = {
  async fetchLiveAnalytics(): Promise<any> {
    try {
      const res = await fetch(apiUrl('/api/analytics'));
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('[analyticsService] Failed fetching live database analytics:', err);
    }
    return null;
  },

  getSystemMetrics() {
    return {
      totalSafetyChecks: 1284,
      emergencyDrills: 47,
      avgResponseSimulation: '04:32',
      safeRoutesGenerated: 892,
      activeRespondersCount: 12,
      networkReadiness: '98%'
    };
  },

  getHeatmapZones(): HeatmapZone[] {
    return HEATMAP_ZONES;
  },

  getSystemStatus(): SystemServiceStatus[] {
    return SYSTEM_SERVICES;
  },

  getIncidentsByTimeOfDay() {
    return [
      { time: '00:00 - 04:00', incidents: 19, riskAvg: 64 },
      { time: '04:00 - 08:00', incidents: 6, riskAvg: 28 },
      { time: '08:00 - 12:00', incidents: 4, riskAvg: 18 },
      { time: '12:00 - 16:00', incidents: 5, riskAvg: 22 },
      { time: '16:00 - 20:00', incidents: 14, riskAvg: 38 },
      { time: '20:00 - 24:00', incidents: 27, riskAvg: 71 },
    ];
  },

  getRiskDistribution() {
    return [
      { name: 'Low Risk', value: 68, color: '#10B981' },
      { name: 'Moderate Risk', value: 24, color: '#F59E0B' },
      { name: 'High Risk', value: 6, color: '#F97316' },
      { name: 'Critical Risk', value: 2, color: '#EF4444' },
    ];
  },

  getRoutePreferenceDistribution() {
    return [
      { name: 'AI Safer Route', value: 67, color: '#8B5CF6' },
      { name: 'Fastest Route', value: 18, color: '#3B82F6' },
      { name: 'Public Corridor', value: 15, color: '#06B6D4' },
    ];
  }
};
