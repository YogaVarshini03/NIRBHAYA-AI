import React, { useState } from 'react';
import {
  History,
  Activity,
  Navigation,
  AlertOctagon,
  ShieldCheck,
  FileLock2,
  Calendar,
  Filter,
  TrendingDown,
  Clock
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from 'recharts';
import { storageService, StorageKeys } from '../../services/storageService';
import { SafetyEvent } from '../../types';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';

export const DEFAULT_SAFETY_EVENTS: SafetyEvent[] = [
  {
    id: 'evt_1',
    type: 'analysis',
    title: 'Automated Environmental Risk Scan',
    description: 'Score calculated: 23/100 (Low Risk). Ambient lighting verified safe.',
    timestamp: 'Today, 18:02',
    dateKey: 'today',
    statusBadge: 'LOW RISK',
  },
  {
    id: 'evt_2',
    type: 'route',
    title: 'AI Safer Route Generated',
    description: 'Computed 6.8 km corridor to Demo Central Mall passing 4 certified safe points.',
    timestamp: 'Today, 17:45',
    dateKey: 'today',
    statusBadge: 'OPTIMAL ROUTE',
  },
  {
    id: 'evt_3',
    type: 'drill',
    title: 'Silent SOS Response Simulation Drill',
    description: 'Drill executed successfully. 4 contacts notified and unit RSP-1042 dispatched in 4.5s.',
    timestamp: 'Yesterday, 21:15',
    dateKey: '7days',
    statusBadge: 'SIMULATION PASSED',
  },
  {
    id: 'evt_4',
    type: 'evidence',
    title: 'Tamper-Evident Evidence Vault Snapshot Created',
    description: 'Multi-sensor audio and GPS telemetry hash linked to Incident NG-2048.',
    timestamp: '3 days ago, 19:30',
    dateKey: '7days',
    statusBadge: 'ENCRYPTED DEMO',
  },
  {
    id: 'evt_5',
    type: 'responder',
    title: 'Rapid Patrol Node Synchronized',
    description: 'Handshake completed with Officer Arjun Kumar unit on West Outer Ring.',
    timestamp: '5 days ago, 22:10',
    dateKey: '7days',
    statusBadge: 'VERIFIED',
  },
  {
    id: 'evt_6',
    type: 'analysis',
    title: 'High-Risk Alley Rerouting Triggered',
    description: 'Low-light industrial corridor avoided. User safely steered along Metro line.',
    timestamp: '12 days ago, 23:40',
    dateKey: '30days',
    statusBadge: 'AVOIDED DANGER',
  }
];

export const SafetyHistoryPage: React.FC = () => {
  const [filter, setFilter] = useState<'today' | '7days' | '30days'>('7days');
  const storedEvents = storageService.getItem<SafetyEvent[]>(StorageKeys.SAFETY_HISTORY, DEFAULT_SAFETY_EVENTS);

  // Filter events based on selected tab
  const filteredEvents = storedEvents.filter((ev) => {
    if (filter === 'today') return ev.dateKey === 'today';
    if (filter === '7days') return ev.dateKey === 'today' || ev.dateKey === '7days';
    return true;
  });

  const chartData = [
    { date: 'Sep 18', score: 32 },
    { date: 'Sep 19', score: 28 },
    { date: 'Sep 20', score: 25 },
    { date: 'Sep 21', score: 35 },
    { date: 'Sep 22', score: 29 },
    { date: 'Sep 23', score: 26 },
    { date: 'Sep 24', score: 23 },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/[0.08]">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Historical Incident & Transit Logs
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
            Safety History
          </h2>
          <p className="text-sm text-slate-400">
            Audit-logged timeline of automated safety checks, route generations, and response drills.
          </p>
        </div>

        {/* Filter Pills (Rule 30) */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-navy-900 border border-white/10 text-xs">
          <button
            onClick={() => setFilter('today')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              filter === 'today' ? 'bg-purple-600 text-white font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Today
          </button>
          <button
            onClick={() => setFilter('7days')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              filter === '7days' ? 'bg-purple-600 text-white font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Past 7 Days
          </button>
          <button
            onClick={() => setFilter('30days')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              filter === '30days' ? 'bg-purple-600 text-white font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Past 30 Days
          </button>
        </div>
      </div>

      {/* Safety Score Trend Chart (Rule 30) */}
      <Card variant="glass" className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold text-white">Daily Threat Index History</h3>
          </div>
          <span className="text-xs font-mono text-emerald-400 font-semibold">Trend: Steady Decline (-28%)</span>
        </div>

        <div className="h-60 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="scoreArea" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="date" stroke="#64748B" fontSize={12} tickLine={false} />
              <YAxis domain={[0, 60]} stroke="#64748B" fontSize={12} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0F172A',
                  borderColor: 'rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  color: '#F8FAFC',
                  fontSize: '12px',
                }}
              />
              <Area type="monotone" dataKey="score" stroke="#8B5CF6" strokeWidth={3} fill="url(#scoreArea)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Timeline Events List (Rule 30) */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-white">Chronological Telemetry Stream</h3>

        <div className="space-y-3 relative before:absolute before:inset-0 before:left-5 before:w-0.5 before:bg-white/10">
          {filteredEvents.map((ev) => {
            let Icon = ShieldCheck;
            let iconColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
            if (ev.type === 'route') {
              Icon = Navigation;
              iconColor = 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30';
            } else if (ev.type === 'sos' || ev.type === 'drill') {
              Icon = AlertOctagon;
              iconColor = 'text-red-400 bg-red-500/10 border-red-500/30';
            } else if (ev.type === 'evidence') {
              Icon = FileLock2;
              iconColor = 'text-amber-400 bg-amber-500/10 border-amber-500/30';
            }

            return (
              <div key={ev.id} className="relative flex items-start gap-4 pl-2 group">
                <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 z-10 ${iconColor}`}>
                  <Icon className="w-4 h-4" />
                </div>

                <div className="flex-1 p-4 rounded-2xl bg-navy-900/60 border border-white/5 hover:border-white/15 transition-all space-y-1.5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-white">{ev.title}</h4>
                    {ev.statusBadge && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-slate-300 border border-white/10">
                        {ev.statusBadge}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">{ev.description}</p>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500 pt-1">
                    <Clock className="w-3 h-3" />
                    <span>{ev.timestamp}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
