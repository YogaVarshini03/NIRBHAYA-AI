import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost' | 'glass';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#070A11] disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.98]';

  const sizeStyles = {
    sm: 'text-xs px-3 py-1.5 gap-1.5',
    md: 'text-sm px-4 py-2.5 gap-2',
    lg: 'text-base px-5 py-3 gap-2.5',
    xl: 'text-lg px-7 py-4 gap-3 font-semibold rounded-2xl',
  };

  const variantStyles = {
    primary: 'bg-gradient-to-r from-electric-violet to-electric-blue text-white shadow-glow-violet hover:from-electric-violet-dark hover:to-electric-blue-dark focus:ring-electric-violet border border-white/10',
    secondary: 'bg-navy-800 text-slate-200 hover:bg-navy-700 border border-white/10 focus:ring-slate-500 shadow-sm',
    danger: 'bg-gradient-to-r from-safety-red to-safety-red-crimson text-white shadow-glow-red hover:brightness-110 focus:ring-safety-red border border-red-500/30',
    outline: 'border border-white/20 text-slate-200 hover:bg-white/5 hover:border-white/40 focus:ring-electric-violet',
    ghost: 'text-slate-300 hover:text-white hover:bg-white/5 focus:ring-slate-500',
    glass: 'bg-white/10 backdrop-blur-md text-white border border-white/15 hover:bg-white/20 shadow-glass focus:ring-electric-cyan',
  };

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin text-current" />
      ) : (
        leftIcon
      )}
      <span>{children}</span>
      {!isLoading && rightIcon}
    </button>
  );
};
