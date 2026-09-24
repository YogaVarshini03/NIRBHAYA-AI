import { RiskAssessment, RiskFactors, RiskLevel } from '../types';
import { storageService, StorageKeys } from './storageService';

export const DEFAULT_RISK_FACTORS: RiskFactors = {
  locationRisk: 20,       // 20 * 0.30 = 6.0
  timeRisk: 25,           // 25 * 0.15 = 3.75
  crowdDensity: 20,       // 20 * 0.15 = 3.0
  lighting: 30,           // 30 * 0.15 = 4.5
  historicalDensity: 22,  // 22 * 0.25 = 5.5
  // Total = 6.0 + 3.75 + 3.0 + 4.5 + 5.5 = 22.75 -> rounded to 23
};

import { apiUrl } from './apiConfig';

export const riskService = {
  calculateScore(factors: RiskFactors): number {
    const rawScore =
      factors.locationRisk * 0.30 +
      factors.timeRisk * 0.15 +
      factors.crowdDensity * 0.15 +
      factors.lighting * 0.15 +
      factors.historicalDensity * 0.25;

    return Math.min(100, Math.max(0, Math.round(rawScore)));
  },

  async calculateScoreRemote(factors: RiskFactors): Promise<{ score: number; riskLevel: RiskLevel; factors: any[] } | null> {
    try {
      const res = await fetch(apiUrl('/api/risk/analyze'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          crowdLevel: 100 - factors.crowdDensity,
          lightingLevel: 100 - factors.lighting,
          historicalIncidentDensity: factors.historicalDensity,
        }),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('[riskService] Backend risk calculation fallback:', err);
    }
    return null;
  },

  getRiskLevel(score: number): RiskLevel {
    if (score <= 30) return 'LOW';
    if (score <= 60) return 'MODERATE';
    if (score <= 80) return 'HIGH';
    return 'CRITICAL';
  },

  getStoredFactors(): RiskFactors {
    return storageService.getItem<RiskFactors>(StorageKeys.RISK_FACTORS, DEFAULT_RISK_FACTORS);
  },

  saveFactors(factors: RiskFactors): void {
    storageService.setItem(StorageKeys.RISK_FACTORS, factors);
  },

  getAssessment(customFactors?: RiskFactors): RiskAssessment {
    const factors = customFactors || this.getStoredFactors();
    const score = this.calculateScore(factors);
    const level = this.getRiskLevel(score);

    let explanation = 'Environmental telemetry indicates low risk. High ambient illumination, active commercial pedestrian activity, and proximity to certified safe shelters are suppressing incident likelihood.';
    if (level === 'MODERATE') {
      explanation = 'Moderate risk detected due to thinning evening crowd density and decreased street lighting variance in peripheral sectors.';
    } else if (level === 'HIGH') {
      explanation = 'High risk telemetry: sparse pedestrian traffic, low-light corridor, and increased historical alert frequency within 500m.';
    } else if (level === 'CRITICAL') {
      explanation = 'Critical safety threshold exceeded. Immediate rerouting or emergency escort activation is strongly advised.';
    }

    return {
      score,
      level,
      factors,
      nearbySafePlacesCount: 4,
      lastUpdated: 'Just now',
      locationName: 'Connaught Place Sector 4, Demo City',
      explanation,
    };
  },

  getSevenDayTrend() {
    return [
      { day: 'Mon', score: 28, label: 'Monday 28' },
      { day: 'Tue', score: 31, label: 'Tuesday 31' },
      { day: 'Wed', score: 24, label: 'Wednesday 24' },
      { day: 'Thu', score: 35, label: 'Thursday 35' },
      { day: 'Fri', score: 29, label: 'Friday 29' },
      { day: 'Sat', score: 26, label: 'Saturday 26' },
      { day: 'Sun', score: 23, label: 'Sunday 23' },
    ];
  }
};
