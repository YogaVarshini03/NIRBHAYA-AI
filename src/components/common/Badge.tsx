import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'low' | 'moderate' | 'high' | 'critical' | 'violet' | 'cyan' | 'blue' | 'neutral';
  size?: 'sm' | 'md';
  dot?: boolean;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
  dot = false,
  className = '',
}) => {
  const sizeStyles = {
    sm: 'text-[11px] px-2 py-0.5 font-medium rounded-md gap-1.5',
    md: 'text-xs px-2.5 py-1 font-semibold rounded-lg gap-1.5',
  };

  const variantStyles = {
    low: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30',
    moderate: 'bg-amber-500/10 text-amber-400 border border-amber-500/30',
    high: 'bg-orange-500/15 text-orange-400 border border-orange-500/30',
    critical: 'bg-red-500/20 text-red-400 border border-red-500/40 shadow-sm animate-pulse',
    violet: 'bg-purple-500/10 text-purple-300 border border-purple-500/30',
    cyan: 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/30',
    blue: 'bg-blue-500/10 text-blue-300 border border-blue-500/30',
    neutral: 'bg-slate-800 text-slate-300 border border-slate-700/50',
  };

  const dotColors = {
    low: 'bg-emerald-400',
    moderate: 'bg-amber-400',
    high: 'bg-orange-400',
    critical: 'bg-red-400',
    violet: 'bg-purple-400',
    cyan: 'bg-cyan-400',
    blue: 'bg-blue-400',
    neutral: 'bg-slate-400',
  };

  return (
    <span className={`inline-flex items-center tracking-wide uppercase ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]} shrink-0`} />}
      <span>{children}</span>
    </span>
  );
};
