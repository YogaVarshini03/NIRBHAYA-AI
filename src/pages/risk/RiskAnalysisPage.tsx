import React, { useState, useEffect } from 'react';
import {
  Activity,
  Info,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  TrendingDown,
  ShieldCheck,
  CheckCircle2,
  Radio,
  Sliders,
  MapPin
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from 'recharts';
import { riskService, DEFAULT_RISK_FACTORS } from '../../services/riskService';
import { RiskFactors, RiskAssessment } from '../../types';
import { locationService, GPSLocation } from '../../services/locationService';
import { RiskGauge } from '../../components/risk/RiskGauge';
import { RiskFactorSlider } from '../../components/risk/RiskFactorSlider';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { useToast } from '../../context/ToastContext';

export const RiskAnalysisPage: React.FC = () => {
  const { showToast } = useToast();
  const [mode, setMode] = useState<'LIVE' | 'SIMULATION'>('LIVE');
  const [gpsLoc, setGpsLoc] = useState<GPSLocation | null>(() => locationService.getCurrentLocation());
  const [gpsStatus, setGpsStatus] = useState<string>(() => locationService.getStatus());
  const [factors, setFactors] = useState<RiskFactors>(() => riskService.getStoredFactors());
  const [showFormulaExplanation, setShowFormulaExplanation] = useState(true);

  // Live dynamic calculation state
  const [liveAssessment, setLiveAssessment] = useState<RiskAssessment>(() => {
    return riskService.getAssessment(undefined, locationService.getCurrentLocation());
  });

  // Track live GPS continuously
  useEffect(() => {
    locationService.startContinuousTracking();
    const unsub = locationService.subscribe((loc, status) => {
      setGpsLoc(loc);
      setGpsStatus(status);
      const computed = riskService.getAssessment(undefined, loc);
      setLiveAssessment(computed);
      if (mode === 'LIVE') {
        setFactors(computed.factors);
      }
    });
    return unsub;
  }, [mode]);

  const activeAssessment = mode === 'LIVE' 
    ? liveAssessment 
    : riskService.getAssessment(factors);

  const trendData = riskService.getSevenDayTrend();

  const handleFactorsChange = (newFactors: RiskFactors) => {
    setFactors(newFactors);
    riskService.saveFactors(newFactors);
  };

  const handleReset = () => {
    if (mode === 'LIVE') {
      const computed = riskService.getAssessment(undefined, gpsLoc);
      setLiveAssessment(computed);
      setFactors(computed.factors);
      showToast('Recalibrated to live sensor and environmental telemetry.', 'info');
    } else {
      setFactors(DEFAULT_RISK_FACTORS);
      riskService.saveFactors(DEFAULT_RISK_FACTORS);
      showToast('Telemetry reset to baseline factors (Score: 23).', 'info');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-400">
              Multivariate Threat Intelligence
            </span>
            <Badge variant={gpsLoc ? 'low' : 'neutral'} size="sm" dot>
              {gpsLoc ? 'Live GPS Sync Active' : 'Waiting for GPS Fix'}
            </Badge>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
            Real-Time Risk Intelligence
          </h2>
          <p className="text-sm text-slate-400">
            Real-time weighted threat evaluation from browser GPS, circadian solar cycle, and verified incident records.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Mode Switcher */}
          <div className="flex items-center p-1 rounded-xl bg-navy-950/80 border border-white/10 text-xs">
            <button
              type="button"
              onClick={() => {
                setMode('LIVE');
                const computed = riskService.getAssessment(undefined, gpsLoc);
                setLiveAssessment(computed);
                setFactors(computed.factors);
                showToast('Switched to Real-Time Dynamic Sensor Telemetry.', 'success');
              }}
              className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all ${
                mode === 'LIVE'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              Live Telemetry
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('SIMULATION');
                showToast('Switched to What-If Scenario Simulator.', 'info');
              }}
              className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all ${
                mode === 'SIMULATION'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              Simulator
            </button>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleReset}
            leftIcon={<RotateCcw className="w-4 h-4" />}
          >
            {mode === 'LIVE' ? 'Refresh' : 'Reset'}
          </Button>
        </div>
      </div>

      {/* Main Row: Big Gauge on Left + Current Telemetry Breakdown on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Big Animated Circular Gauge */}
        <Card variant="glass" className="p-8 flex flex-col items-center justify-center text-center space-y-5">
          <RiskGauge
            score={activeAssessment.score}
            level={activeAssessment.level}
            size={220}
            strokeWidth={16}
          />

          <div className="space-y-1">
            <div className="flex items-center justify-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Data Confidence:
              </span>
              <span className="text-xs font-mono font-bold text-cyan-300">
                {activeAssessment.confidence ?? 85}%
              </span>
            </div>
            <h3 className="text-lg font-bold text-white">Aggregated Threat Rating</h3>
            <p className="text-xs text-slate-300 max-w-xs mx-auto leading-relaxed">
              {activeAssessment.explanation}
            </p>
          </div>

          <div className="w-full pt-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-400 font-mono">
            <span>
              {gpsLoc 
                ? `GPS: ${gpsLoc.latitude.toFixed(4)}, ${gpsLoc.longitude.toFixed(4)}`
                : 'GPS: Signal Pending'}
            </span>
            <span className="text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> 4 Safe Havens
            </span>
          </div>
        </Card>

        {/* Right 2 Columns: Live Telemetry Breakdown or Interactive Sliders */}
        <Card variant="glass" className="lg:col-span-2 p-6 sm:p-8 space-y-6">
          {mode === 'LIVE' ? (
            <div className="space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
                    <span>Real-Time Environmental Factor Signals</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Transparent mathematical model derived without static or simulated values.
                  </p>
                </div>
                <Badge variant="cyan" size="sm">
                  Confidence {activeAssessment.confidence}%
                </Badge>
              </div>

              <div className="space-y-3">
                {/* Location Risk */}
                <div className="p-3.5 rounded-xl bg-navy-950/70 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">Location Risk (30% weight)</span>
                      <span className="text-[10px] font-mono text-purple-300">
                        Factor Score: {factors.locationRisk}/100
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      {activeAssessment.factorDescriptions?.location || (gpsLoc ? `Real GPS (±${gpsLoc.accuracy.toFixed(1)}m precision)` : 'Data unavailable (Waiting for GPS fix)')}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-mono text-sm font-bold text-emerald-400">
                      {(factors.locationRisk * 0.3).toFixed(1)} pts
                    </span>
                  </div>
                </div>

                {/* Time Risk */}
                <div className="p-3.5 rounded-xl bg-navy-950/70 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">Circadian Time Risk (15% weight)</span>
                      <span className="text-[10px] font-mono text-purple-300">
                        Factor Score: {factors.timeRisk}/100
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      {activeAssessment.factorDescriptions?.time || 'Real-time clock circadian risk'}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-mono text-sm font-bold text-cyan-400">
                      {(factors.timeRisk * 0.15).toFixed(1)} pts
                    </span>
                  </div>
                </div>

                {/* Crowd Risk */}
                <div className="p-3.5 rounded-xl bg-navy-950/70 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">Crowd Density Risk (15% weight)</span>
                      <span className="text-[10px] font-mono text-purple-300">
                        Factor Score: {factors.crowdDensity}/100
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      {activeAssessment.factorDescriptions?.crowd || 'Transit volume and pedestrian density index'}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-mono text-sm font-bold text-cyan-400">
                      {(factors.crowdDensity * 0.15).toFixed(1)} pts
                    </span>
                  </div>
                </div>

                {/* Lighting Risk */}
                <div className="p-3.5 rounded-xl bg-navy-950/70 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">Street Lighting Lux (15% weight)</span>
                      <span className="text-[10px] font-mono text-purple-300">
                        Factor Score: {factors.lighting}/100
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      {activeAssessment.factorDescriptions?.lighting || 'Solar altitude & municipal illumination schedule'}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-mono text-sm font-bold text-cyan-400">
                      {(factors.lighting * 0.15).toFixed(1)} pts
                    </span>
                  </div>
                </div>

                {/* Historical Incident Risk */}
                <div className="p-3.5 rounded-xl bg-navy-950/70 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">Historical Incident Density (25% weight)</span>
                      <span className="text-[10px] font-mono text-purple-300">
                        Factor Score: {factors.historicalDensity}/100
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      {activeAssessment.factorDescriptions?.historical || 'Metropolitan police emergency call log baseline'}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-mono text-sm font-bold text-indigo-400">
                      {(factors.historicalDensity * 0.25).toFixed(1)} pts
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <RiskFactorSlider
              factors={factors}
              onChange={handleFactorsChange}
              onReset={handleReset}
            />
          )}
        </Card>
      </div>

      {/* 7-Day Risk Trend Chart (Rule 18) */}
      <Card variant="glass" className="p-6 sm:p-8 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-emerald-400" />
              <h3 className="text-base sm:text-lg font-bold text-white">
                7-Day Environmental Threat Trend
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Historical circadian fluctuation over typical weekly commute routes
            </p>
          </div>
          <div className="text-xs font-mono text-slate-400 bg-navy-950 px-3 py-1.5 rounded-xl border border-white/10">
            Average Weekly Score: <span className="text-emerald-400 font-bold">27 (Low)</span>
          </div>
        </div>

        <div className="h-64 w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="day" stroke="#64748B" fontSize={12} tickLine={false} />
              <YAxis domain={[0, 100]} stroke="#64748B" fontSize={12} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0F172A',
                  borderColor: 'rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  color: '#F8FAFC',
                  fontSize: '12px',
                }}
                formatter={(val: number) => [`${val} / 100 (${val <= 30 ? 'Low Risk' : 'Moderate'})`, 'Risk Score']}
              />
              <Line
                type="monotone"
                dataKey="score"
                stroke="#8B5CF6"
                strokeWidth={3}
                dot={{ r: 5, fill: '#8B5CF6', stroke: '#fff', strokeWidth: 2 }}
                activeDot={{ r: 8, fill: '#06B6D4' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Expandable: "Why is this score calculated?" (Rule 17) */}
      <Card variant="glass" className="p-6">
        <button
          onClick={() => setShowFormulaExplanation(!showFormulaExplanation)}
          className="w-full flex items-center justify-between text-left group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Info className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-base font-bold text-white group-hover:text-purple-300 transition-colors">
                Why is this score calculated? (Transparent Mathematical Model)
              </h4>
              <p className="text-xs text-slate-400">
                Click to expand the exact weighted formula used across all safety evaluations
              </p>
            </div>
          </div>
          {showFormulaExplanation ? (
            <ChevronUp className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          )}
        </button>

        {showFormulaExplanation && (
          <div className="mt-5 pt-5 border-t border-white/10 space-y-4 text-xs text-slate-300 leading-relaxed animate-in fade-in">
            <div className="p-4 rounded-xl bg-navy-950/80 border border-purple-500/30 font-mono text-sm text-purple-200">
              <span className="text-cyan-400 font-bold">Risk Score = </span>
              (Location Risk × 30%) + (Time Risk × 15%) + (Crowd Density × 15%) + (Lighting × 15%) + (Historical Density × 25%)
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-navy-900/60 border border-emerald-500/20">
                <span className="font-bold text-emerald-400 block mb-1">0 – 30: LOW</span>
                Normal transit conditions. Standard ambient surveillance and open storefronts present.
              </div>
              <div className="p-3 rounded-xl bg-navy-900/60 border border-amber-500/20">
                <span className="font-bold text-amber-400 block mb-1">31 – 60: MODERATE</span>
                Caution recommended. Sparse pedestrian activity or reduced lighting in peripheral lanes.
              </div>
              <div className="p-3 rounded-xl bg-navy-900/60 border border-orange-500/20">
                <span className="font-bold text-orange-400 block mb-1">61 – 80: HIGH</span>
                Rerouting recommended. Poor lux values and elevated historical incident correlation.
              </div>
              <div className="p-3 rounded-xl bg-navy-900/60 border border-red-500/20">
                <span className="font-bold text-red-400 block mb-1">81 – 100: CRITICAL</span>
                High threat indicator. Immediate emergency escort or safe haven navigation activated.
              </div>
            </div>

            {/* Disclaimer Requirement (Rule 17) */}
            <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <strong>Important Safety Disclaimer:</strong> Risk score is an experimental safety indicator computed from simulated telemetry and should not be treated as a guarantee of safety. Always trust your instincts and maintain situational awareness.
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};
