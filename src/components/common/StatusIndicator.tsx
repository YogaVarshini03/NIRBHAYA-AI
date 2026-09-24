import React from 'react';

interface StatusIndicatorProps {
  status?: 'safe' | 'warning' | 'danger' | 'info' | 'offline';
  pulse?: boolean;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  className?: string;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status = 'safe',
  pulse = true,
  size = 'md',
  label,
  className = '',
}) => {
  const sizeMap = {
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
    lg: 'w-3.5 h-3.5',
  };

  const colorMap = {
    safe: 'bg-emerald-400 shadow-[0_0_8px_#10B981]',
    warning: 'bg-amber-400 shadow-[0_0_8px_#F59E0B]',
    danger: 'bg-red-500 shadow-[0_0_10px_#EF4444]',
    info: 'bg-cyan-400 shadow-[0_0_8px_#06B6D4]',
    offline: 'bg-slate-500',
  };

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <span className="relative flex items-center justify-center shrink-0">
        {pulse && status !== 'offline' && (
          <span
            className={`absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping ${colorMap[status]}`}
          />
        )}
        <span className={`relative inline-flex rounded-full ${sizeMap[size]} ${colorMap[status]}`} />
      </span>
      {label && <span className="text-xs font-medium text-slate-300">{label}</span>}
    </div>
  );
};
