import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ShieldCheck, Lock, AlertTriangle, ArrowRight } from 'lucide-react';
import { Button } from '../common/Button';

export const ForceSetPinModal: React.FC = () => {
  const { user, isAuthenticated, setSafetyPin } = useAuth();
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Only display if user is logged in and does not have a PIN set
  if (!isAuthenticated || !user || user.hasPin !== false) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanPin = pin.trim();
    if (!/^\d{4}$/.test(cleanPin)) {
      setError('Please enter a 4-digit numeric PIN (e.g. 5821).');
      return;
    }

    if (cleanPin !== confirmPin.trim()) {
      setError('PINs do not match. Please re-enter.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await setSafetyPin(cleanPin);
      if (!res.success) {
        setError(res.error || 'Failed to save PIN.');
      }
    } catch (err: any) {
      setError(err?.message || 'Error configuring security PIN.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-slate-900/95 border border-amber-500/30 rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6 text-white relative">
        <div className="flex items-center gap-3 pb-4 border-b border-white/10">
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Action Required</h3>
            <p className="text-xs text-amber-300 font-semibold tracking-wide uppercase">Set Personal Safety PIN</p>
          </div>
        </div>

        <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-200/90 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <span>
            To prevent unauthorized de-escalation of active SOS alerts, your account requires a 4-digit personal safety PIN before continuing.
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              New 4-Digit Safety PIN
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                className="w-full pl-10 pr-4 py-3 bg-slate-800/80 border border-white/10 rounded-xl text-center text-2xl tracking-[0.4em] font-mono text-white focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition"
                autoFocus
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Confirm 4-Digit PIN
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                maxLength={4}
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                className="w-full pl-10 pr-4 py-3 bg-slate-800/80 border border-white/10 rounded-xl text-center text-2xl tracking-[0.4em] font-mono text-white focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition"
              />
            </div>
          </div>

          {error && (
            <p className="text-xs text-rose-400 font-medium bg-rose-500/10 border border-rose-500/20 rounded-lg p-2.5">
              {error}
            </p>
          )}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold justify-center"
            disabled={isSubmitting || pin.length !== 4 || confirmPin.length !== 4}
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            {isSubmitting ? 'Securing Account...' : 'Set Safety PIN & Continue'}
          </Button>
        </form>
      </div>
    </div>
  );
};
