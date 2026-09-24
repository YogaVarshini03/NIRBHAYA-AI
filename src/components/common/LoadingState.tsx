import React from 'react';
import { Loader2, ShieldCheck } from 'lucide-react';

interface LoadingStateProps {
  message?: string;
  submessage?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Analyzing safety conditions…',
  submessage = 'Connecting to real-time environmental telemetry node',
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl bg-navy-850/40 border border-white/5 backdrop-blur-md">
      <div className="relative mb-4">
        <div className="w-12 h-12 rounded-full border-2 border-electric-violet/20 border-t-electric-violet animate-spin" />
        <ShieldCheck className="w-5 h-5 text-electric-cyan absolute inset-0 m-auto" />
      </div>
      <p className="text-base font-medium text-slate-200">{message}</p>
      {submessage && <p className="text-xs text-slate-400 mt-1">{submessage}</p>}
    </div>
  );
};
