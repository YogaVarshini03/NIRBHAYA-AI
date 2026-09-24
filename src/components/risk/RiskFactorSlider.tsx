import React from 'react';
import { RiskFactors } from '../../types';

interface RiskFactorSliderProps {
  factors: RiskFactors;
  onChange: (newFactors: RiskFactors) => void;
  onReset: () => void;
}

export const RiskFactorSlider: React.FC<RiskFactorSliderProps> = ({
  factors,
  onChange,
  onReset,
}) => {
  const updateField = (field: keyof RiskFactors, value: number) => {
    onChange({
      ...factors,
      [field]: value,
    });
  };

  const factorConfigs = [
    {
      key: 'locationRisk' as const,
      label: 'Location Risk',
      weight: '30%',
      desc: 'Proximity to isolated zones & transit vulnerabilities',
      value: factors.locationRisk,
    },
    {
      key: 'timeRisk' as const,
      label: 'Time-of-Night Risk',
      weight: '15%',
      desc: 'Circadian environmental hazard correlation',
      value: factors.timeRisk,
    },
    {
      key: 'crowdDensity' as const,
      label: 'Crowd Scarcity',
      weight: '15%',
      desc: 'Lack of pedestrian bystanders / public eyes on the street',
      value: factors.crowdDensity,
    },
    {
      key: 'lighting' as const,
      label: 'Inadequate Lighting',
      weight: '15%',
      desc: 'Poor lux level / high proportion of unlit road segments',
      value: factors.lighting,
    },
    {
      key: 'historicalDensity' as const,
      label: 'Historical Incident Density',
      weight: '25%',
      desc: 'Past 12-month verified emergency report frequency',
      value: factors.historicalDensity,
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold text-slate-200">Interactive Risk Weighting Telemetry</h4>
          <p className="text-xs text-slate-400">Adjust simulation inputs to dynamically recalculate aggregate threat level</p>
        </div>
        <button
          onClick={onReset}
          className="text-xs text-purple-400 hover:text-purple-300 font-medium underline underline-offset-4"
        >
          Reset to Baseline (23)
        </button>
      </div>

      <div className="space-y-4">
        {factorConfigs.map((cfg) => (
          <div key={cfg.key} className="p-3 rounded-xl bg-navy-900/60 border border-white/5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-200">{cfg.label}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono">
                  Weight: {cfg.weight}
                </span>
              </div>
              <div className="font-mono font-bold text-slate-300">
                {cfg.value} / 100
              </div>
            </div>

            <input
              type="range"
              min="0"
              max="100"
              value={cfg.value}
              onChange={(e) => updateField(cfg.key, parseInt(e.target.value, 10))}
              className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
            />

            <p className="text-[11px] text-slate-400">{cfg.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
