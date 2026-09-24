import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { CheckCircle2, AlertTriangle, Info, XCircle, ShieldAlert, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning' | 'emergency';

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastContextType {
  toasts: ToastItem[];
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'info', duration: number = 4000) => {
    const id = `toast_${Date.now()}_${Math.random()}`;
    const newToast: ToastItem = { id, type, message, duration };

    setToasts((prev) => [...prev, newToast]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ toasts, showToast, removeToast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2.5 max-w-md w-full pointer-events-none px-4 sm:px-0">
        {toasts.map((toast) => {
          let icon = <Info className="w-5 h-5 text-electric-cyan flex-shrink-0" />;
          let borderClass = 'border-electric-cyan/30';
          let bgClass = 'bg-navy-900/95';

          if (toast.type === 'success') {
            icon = <CheckCircle2 className="w-5 h-5 text-safety-emerald flex-shrink-0" />;
            borderClass = 'border-safety-emerald/40';
          } else if (toast.type === 'error') {
            icon = <XCircle className="w-5 h-5 text-safety-red flex-shrink-0" />;
            borderClass = 'border-safety-red/40';
          } else if (toast.type === 'warning') {
            icon = <AlertTriangle className="w-5 h-5 text-safety-amber flex-shrink-0" />;
            borderClass = 'border-safety-amber/40';
          } else if (toast.type === 'emergency') {
            icon = <ShieldAlert className="w-5 h-5 text-safety-red-crimson flex-shrink-0 animate-pulse" />;
            borderClass = 'border-safety-red shadow-glow-red';
            bgClass = 'bg-red-950/95';
          }

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-center justify-between gap-3 p-4 rounded-xl border backdrop-blur-xl shadow-2xl transition-all duration-300 animate-in slide-in-from-bottom-3 ${bgClass} ${borderClass}`}
            >
              <div className="flex items-center gap-3">
                {icon}
                <p className="text-sm font-medium text-slate-100">{toast.message}</p>
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
                aria-label="Dismiss toast"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
