import React from 'react';
import { RiskLevel } from '../../types';

interface RiskGaugeProps {
  score: number;
  level: RiskLevel;
  size?: number;
  strokeWidth?: number;
  showDetails?: boolean;
}

export const RiskGauge: React.FC<RiskGaugeProps> = ({
  score,
  level,
  size = 200,
  strokeWidth = 14,
  showDetails = true,
}) => {
  const center = size / 2;
  const radius = center - strokeWidth;
  const circumference = 2 * Math.PI * radius;
  // Score clamped between 0 and 100
  const clampedScore = Math.min(100, Math.max(0, score));
  const strokeDashoffset = circumference - (clampedScore / 100) * circumference;

  const getColorConfig = () => {
    switch (level) {
      case 'LOW':
        return {
          stroke: '#10B981', // emerald
          shadow: 'rgba(16, 185, 129, 0.4)',
          text: 'text-emerald-400',
          bgGlow: 'bg-emerald-500/10',
          badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
        };
      case 'MODERATE':
        return {
          stroke: '#F59E0B', // amber
          shadow: 'rgba(245, 158, 11, 0.4)',
          text: 'text-amber-400',
          bgGlow: 'bg-amber-500/10',
          badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
        };
      case 'HIGH':
        return {
          stroke: '#F97316', // orange
          shadow: 'rgba(249, 115, 22, 0.4)',
          text: 'text-orange-400',
          bgGlow: 'bg-orange-500/15',
          badgeBg: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
        };
      case 'CRITICAL':
        return {
          stroke: '#EF4444', // red
          shadow: 'rgba(239, 68, 68, 0.6)',
          text: 'text-red-400',
          bgGlow: 'bg-red-500/20',
          badgeBg: 'bg-red-500/20 text-red-300 border-red-500/40',
        };
    }
  };

  const colors = getColorConfig();

  return (
    <div className="flex flex-col items-center justify-center relative">
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        {/* Ambient subtle glow background */}
        <div
          className={`absolute rounded-full filter blur-2xl opacity-40 transition-colors duration-500 ${colors.bgGlow}`}
          style={{ width: size * 0.75, height: size * 0.75 }}
        />

        <svg width={size} height={size} className="transform -rotate-90">
          {/* Background circle */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="transparent"
            stroke="rgba(255, 255, 255, 0.08)"
            strokeWidth={strokeWidth}
          />
          {/* Value Progress circle */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="transparent"
            stroke={colors.stroke}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
            style={{
              filter: `drop-shadow(0 0 8px ${colors.shadow})`,
            }}
          />
        </svg>

        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none">
          <div className="flex items-baseline justify-center">
            <span className="text-4xl md:text-5xl font-extrabold tracking-tight text-white font-sans">
              {clampedScore}
            </span>
            <span className="text-sm font-medium text-slate-400 ml-1">/ 100</span>
          </div>
          <div className={`mt-1 text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${colors.badgeBg}`}>
            {level} RISK
          </div>
        </div>
      </div>

      {showDetails && (
        <div className="mt-2 text-center">
          <p className="text-xs text-slate-400 font-medium tracking-wide">
            Real-time Telemetry Inference
          </p>
        </div>
      )}
    </div>
  );
};
