import React from 'react';
import {
  Shield,
  Info,
  PhoneCall,
  MessageSquare,
  AlertTriangle,
  Server,
  Zap,
  Radio,
  Lock,
  ExternalLink,
  Cpu,
  CheckCircle2,
  Clock,
  KeyRound
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';

export const AboutLimitsPage: React.FC = () => {
  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-400">
              System Transparency & Architecture
            </span>
            <Badge variant="cyan" size="sm">
              Prototype v2.4
            </Badge>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
            About & System Limits
          </h2>
          <p className="text-sm text-slate-400">
            Operational capabilities, telemetry boundaries, and third-party gateway limitations of NIRBHAYA AI.
          </p>
        </div>
      </div>

      {/* Critical Twilio Trial Notice Banner */}
      <Card variant="glass" className="p-6 border-amber-500/40 bg-gradient-to-br from-amber-950/40 to-neutral-900">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
            <AlertTriangle className="w-6 h-6 animate-pulse" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white">Twilio Gateway & Voice Call Operating Limit</h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold uppercase">
                Trial Environment
              </span>
            </div>
            <p className="text-sm text-amber-200/90 font-medium leading-relaxed">
              Automated voice calls need a paid Twilio account; the prototype runs on a trial account.
            </p>
            <p className="text-xs text-slate-300 leading-relaxed">
              On Twilio trial accounts, outbound automated voice calls to un-paired numbers are blocked by Twilio with error <code className="px-1.5 py-0.5 rounded bg-black/40 text-amber-300 font-mono">573003</code>. NIRBHAYA AI automatically handles this gracefully by isolating channels: SMS dispatches, live GPS WebSocket telemetry, and direct manual emergency call buttons (<code className="px-1.5 py-0.5 rounded bg-black/40 text-red-300">Call 112</code> and <code className="px-1.5 py-0.5 rounded bg-black/40 text-amber-300">Call Guardian</code>) remain 100% operational in parallel.
            </p>
          </div>
        </div>
      </Card>

      {/* Grid of System Capabilities & Constraints */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Capability 1: Multi-Channel Dispatch */}
        <Card variant="glass" className="p-6 space-y-4">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-300">
            <PhoneCall className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-base font-bold text-white">Voice & SMS Telemetry</h4>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Automated outbound voice calls with bilingual TTS (Tamil & English) and concurrent SMS broadcasts to verified emergency contacts.
            </p>
          </div>
          <div className="p-3 rounded-xl bg-navy-950/60 border border-white/5 space-y-1 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Voice Calls:</span>
              <span className="text-amber-300 font-semibold">Twilio Trial (Paired IDs)</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>SMS Gateway:</span>
              <span className="text-emerald-400 font-semibold">Real-Time Twilio SMS</span>
            </div>
          </div>
        </Card>

        {/* Capability 2: Live GPS Telemetry */}
        <Card variant="glass" className="p-6 space-y-4">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-300">
            <Radio className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-base font-bold text-white">Live GPS & Public Tracking</h4>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Real-time browser geolocation stream with 6-hour time-limited cryptographic tracking URLs for trusted responders.
            </p>
          </div>
          <div className="p-3 rounded-xl bg-navy-950/60 border border-white/5 space-y-1 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Token Expiry:</span>
              <span className="text-cyan-300 font-mono">6 Hours Standard</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>WebSocket Stream:</span>
              <span className="text-emerald-400 font-semibold">Active & Live</span>
            </div>
          </div>
        </Card>

        {/* Capability 3: Tamper-Evident Locker */}
        <Card variant="glass" className="p-6 space-y-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-300">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-base font-bold text-white">Cryptographic Evidence Vault</h4>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Client-side audio buffering and sensor snapshots locked with SHA-256 hashes and verifiable chain of custody logs.
            </p>
          </div>
          <div className="p-3 rounded-xl bg-navy-950/60 border border-white/5 space-y-1 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Integrity Hash:</span>
              <span className="text-emerald-300 font-mono">SHA-256 Verified</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Storage Mode:</span>
              <span className="text-slate-300">Local Encrypted Vault</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Operating FAQ & Limitations Table */}
      <Card variant="glass" className="p-6 sm:p-8 space-y-6">
        <div className="flex items-center gap-2">
          <Info className="w-5 h-5 text-purple-400" />
          <h3 className="text-base font-bold text-white">Production Readiness & Deployment Matrix</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-slate-400 font-mono">
                <th className="py-2.5 px-3">Subsystem</th>
                <th className="py-2.5 px-3">Prototype Status</th>
                <th className="py-2.5 px-3">Production Requirement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-slate-300">
              <tr>
                <td className="py-3 px-3 font-semibold text-white">Automated Voice Calls</td>
                <td className="py-3 px-3 text-amber-300">Trial Paired Numbers (573003 handled gracefully)</td>
                <td className="py-3 px-3">Upgraded Twilio Account with Voice Trunking</td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-semibold text-white">SMS Gateway</td>
                <td className="py-3 px-3 text-emerald-400">Live Twilio REST Dispatch</td>
                <td className="py-3 px-3">DLT registration / A2P 10DLC compliance in India</td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-semibold text-white">Police 112 Dispatch</td>
                <td className="py-3 px-3 text-cyan-300">Demo Police Redirection / Instant tel:112</td>
                <td className="py-3 px-3">State ERSS (Emergency Response Support System) API Integration</td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-semibold text-white">AI Environmental Risk</td>
                <td className="py-3 px-3 text-emerald-400">Client Edge Neural Matrix</td>
                <td className="py-3 px-3">City GIS OpenData + Live IoT Streetlight Telemetry</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
export default AboutLimitsPage;
