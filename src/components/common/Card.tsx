import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: 'glass' | 'subtle' | 'emergency' | 'active';
  interactive?: boolean;
  className?: string;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'glass',
  interactive = false,
  className = '',
  ...props
}) => {
  const base = 'rounded-2xl border transition-all duration-250 relative overflow-hidden';

  const variants = {
    glass: 'bg-navy-800/60 backdrop-blur-xl border-white/[0.08] shadow-glass',
    subtle: 'bg-navy-850/40 backdrop-blur-md border-white/[0.04]',
    emergency: 'bg-gradient-to-b from-red-950/40 to-navy-900/90 border-red-500/30 shadow-glow-red',
    active: 'bg-navy-800/80 border-purple-500/30 shadow-glow-violet',
  };

  const hoverStyle = interactive ? 'hover:-translate-y-0.5 hover:border-purple-500/40 hover:shadow-glow-violet cursor-pointer' : '';

  return (
    <div className={`${base} ${variants[variant]} ${hoverStyle} ${className}`} {...props}>
      {children}
    </div>
  );
};
