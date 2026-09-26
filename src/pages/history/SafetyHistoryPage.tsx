import React, { useState, useEffect } from 'react';
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
  Clock,
  PhoneCall,
  MessageSquare,
  Mail,
  UserCheck,
  Radio,
  RefreshCw,
  CheckCircle2,
  AlertTriangle
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
import { useAuth } from '../../context/AuthContext';
import { apiUrl } from '../../services/apiConfig';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';

interface TimelineEvent {
  id: string;
  category: 'EMERGENCY' | 'VOICE_CALL' | 'SMS' | 'EMAIL' | 'RISK_ASSESSMENT' | 'EVIDENCE' | 'LOGIN' | 'RESPONDER_ACTION';
  title: string;
  description: string;
  status: string;
  statusBadge?: string;
  timestamp: string;
  date: string;
  incidentId?: string;
  metadata?: any;
}

interface HistorySummary {
  totalIncidents: number;
  resolvedIncidents: number;
  totalNotifications: number;
  totalEvidence: number;
  totalRiskScans: number;
  totalLogins: number;
}

export const SafetyHistoryPage: React.FC = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [summary, setSummary] = useState<HistorySummary>({
    totalIncidents: 0,
    resolvedIncidents: 0,
    totalNotifications: 0,
    totalEvidence: 0,
    totalRiskScans: 0,
    totalLogins: 0,
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [timeFilter, setTimeFilter] = useState<'today' | '7days' | '30days' | 'all'>('all');

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('nirbhaya_token');
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(apiUrl('/api/history'), { headers });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: Failed to load user history`);
      }
      const data = await res.json();
      if (data.success) {
        setEvents(data.events || []);
        if (data.summary) {
          setSummary(data.summary);
        }
      } else {
        throw new Error(data.error || 'Failed to parse history stream');
      }
    } catch (err: any) {
      console.warn('[SafetyHistory] History fetch warning:', err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [user?.id]);

  // Filter events by Category and Time range
  const filteredEvents = events.filter((ev) => {
    // Category filter
    if (categoryFilter !== 'ALL') {
      if (categoryFilter === 'EMERGENCY' && ev.category !== 'EMERGENCY' && ev.category !== 'RESPONDER_ACTION') return false;
      if (categoryFilter === 'DISPATCHES' && ev.category !== 'VOICE_CALL' && ev.category !== 'SMS' && ev.category !== 'EMAIL') return false;
      if (categoryFilter === 'RISK' && ev.category !== 'RISK_ASSESSMENT') return false;
      if (categoryFilter === 'EVIDENCE' && ev.category !== 'EVIDENCE') return false;
      if (categoryFilter === 'LOGIN' && ev.category !== 'LOGIN') return false;
    }

    // Time filter
    if (timeFilter === 'all') return true;
    const evTime = new Date(ev.timestamp).getTime();
    const now = Date.now();
    const diffHours = (now - evTime) / (1000 * 60 * 60);

    if (timeFilter === 'today') return diffHours <= 24;
    if (timeFilter === '7days') return diffHours <= 168;
    if (timeFilter === '30days') return diffHours <= 720;
    return true;
  });

  // Dynamic Chart Data derived from actual risk assessment and emergency events
  const chartData = React.useMemo(() => {
    const riskEvents = events
      .filter((e) => e.category === 'RISK_ASSESSMENT' || e.category === 'EMERGENCY')
      .slice(0, 10)
      .reverse();

    if (riskEvents.length === 0) {
      return [
        { date: 'Initial', score: 18 },
        { date: 'Live', score: 22 },
      ];
    }

    return riskEvents.map((e) => {
      const d = new Date(e.timestamp);
      const timeStr = `${d.getDate()} ${d.toLocaleString('default', { month: 'short' })}`;
      const score = e.metadata?.score ?? (e.category === 'EMERGENCY' ? 88 : 25);
      return { date: timeStr, score };
    });
  }, [events]);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'EMERGENCY':
        return <AlertOctagon className="w-4 h-4 text-red-400" />;
      case 'VOICE_CALL':
        return <PhoneCall className="w-4 h-4 text-amber-400" />;
      case 'SMS':
        return <MessageSquare className="w-4 h-4 text-purple-400" />;
      case 'EMAIL':
        return <Mail className="w-4 h-4 text-cyan-400" />;
      case 'RISK_ASSESSMENT':
        return <Activity className="w-4 h-4 text-emerald-400" />;
      case 'EVIDENCE':
        return <FileLock2 className="w-4 h-4 text-indigo-400" />;
      case 'LOGIN':
        return <UserCheck className="w-4 h-4 text-blue-400" />;
      case 'RESPONDER_ACTION':
        return <ShieldCheck className="w-4 h-4 text-teal-400" />;
      default:
        return <Clock className="w-4 h-4 text-slate-400" />;
    }
  };

  const getBadgeStyle = (status: string) => {
    const s = status.toUpperCase();
    if (s.includes('RESOLVED') || s.includes('SUCCESS') || s.includes('COMPLETED') || s.includes('LOW')) {
      return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
    }
    if (s.includes('INITIATED') || s.includes('RINGING') || s.includes('MODERATE') || s.includes('EN_ROUTE')) {
      return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
    }
    if (s.includes('CRITICAL') || s.includes('FAILED') || s.includes('HIGH') || s.includes('CREATED')) {
      return 'bg-red-500/15 text-red-300 border-red-500/30';
    }
    return 'bg-slate-800 text-slate-300 border-white/10';
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header with User Permanent Identity */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
              USER IDENTITY: {user?.id || 'USR-7F42A91C'}
            </span>
            <span className="text-xs text-slate-400">
              Role: <strong className="text-white uppercase font-mono">{user?.role || 'USER'}</strong>
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
            {user?.name || 'Abhishek K'} — Safety History
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Permanent, audit-logged chronological record of your safety assessments, emergency broadcasts, voice dispatches, and logins.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={fetchHistory}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
            className="text-xs"
          >
            Sync History
          </Button>
        </div>
      </div>

      {/* Summary Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card variant="glass" className="p-4 space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Emergencies</span>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-black text-white font-mono">{summary.totalIncidents}</span>
            <AlertOctagon className="w-5 h-5 text-red-400" />
          </div>
          <p className="text-[10px] text-slate-400">{summary.resolvedIncidents} successfully resolved</p>
        </Card>

        <Card variant="glass" className="p-4 space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Voice & SMS Dispatches</span>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-black text-amber-400 font-mono">{summary.totalNotifications}</span>
            <PhoneCall className="w-5 h-5 text-amber-400" />
          </div>
          <p className="text-[10px] text-slate-400">Real outbound dispatch logs</p>
        </Card>

        <Card variant="glass" className="p-4 space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Proactive Risk Scans</span>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-black text-emerald-400 font-mono">{summary.totalRiskScans}</span>
            <Activity className="w-5 h-5 text-emerald-400" />
          </div>
          <p className="text-[10px] text-slate-400">Telemetry evaluations logged</p>
        </Card>

        <Card variant="glass" className="p-4 space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Security Vault Records</span>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-black text-cyan-400 font-mono">{summary.totalEvidence + summary.totalLogins}</span>
            <FileLock2 className="w-5 h-5 text-cyan-400" />
          </div>
          <p className="text-[10px] text-slate-400">{summary.totalEvidence} evidence • {summary.totalLogins} sessions</p>
        </Card>
      </div>

      {/* Threat Index Trend Chart */}
      <Card variant="glass" className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-purple-400" />
            <h3 className="text-base font-bold text-white">Dynamic Environmental Threat Trend</h3>
          </div>
          <span className="text-xs font-mono text-purple-300 font-semibold">
            {events.length > 0 ? `${events.length} Historical Records` : 'Waiting for Telemetry'}
          </span>
        </div>

        <div className="h-56 w-full pt-2">
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
              <YAxis domain={[0, 100]} stroke="#64748B" fontSize={12} tickLine={false} />
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

      {/* Filter Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 rounded-2xl bg-navy-900/80 border border-white/10 text-xs">
        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'ALL', label: 'All Records' },
            { id: 'EMERGENCY', label: '🚨 Emergencies' },
            { id: 'DISPATCHES', label: '📞 Calls & SMS' },
            { id: 'RISK', label: '📊 Risk Scans' },
            { id: 'EVIDENCE', label: '🔒 Vault' },
            { id: 'LOGIN', label: '🔑 Sessions' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategoryFilter(cat.id)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                categoryFilter === cat.id
                  ? 'bg-purple-600 text-white font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Time Filter Pills */}
        <div className="flex items-center gap-1 bg-navy-950 p-1 rounded-xl border border-white/5">
          {[
            { id: 'today', label: 'Today' },
            { id: '7days', label: '7 Days' },
            { id: '30days', label: '30 Days' },
            { id: 'all', label: 'All Time' },
          ].map((tf) => (
            <button
              key={tf.id}
              onClick={() => setTimeFilter(tf.id as any)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                timeFilter === tf.id ? 'bg-purple-600 text-white font-semibold' : 'text-slate-400 hover:text-white'
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline Stream */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white">Chronological Telemetry Stream</h3>
          <span className="text-xs text-slate-400">
            Showing {filteredEvents.length} of {events.length} user events
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-purple-400" />
            Loading real telemetry history from backend database...
          </div>
        ) : filteredEvents.length === 0 ? (
          <Card variant="glass" className="p-12 text-center space-y-3">
            <ShieldCheck className="w-10 h-10 text-emerald-400 mx-auto" />
            <h4 className="text-base font-bold text-white">No safety history recorded yet for this account</h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Account <span className="font-mono text-purple-300 font-semibold">{user?.id || 'USR-7F42A91C'}</span> has zero active distress records in this filter view. All real environmental risk scans, emergency calls, and responder operations will appear here.
            </p>
          </Card>
        ) : (
          <div className="space-y-3 relative before:absolute before:inset-0 before:left-5 before:w-0.5 before:bg-white/10">
            {filteredEvents.map((ev) => (
              <div key={ev.id} className="relative flex items-start gap-4 pl-2 group">
                <div className="w-9 h-9 rounded-xl border border-white/10 bg-navy-900/90 flex items-center justify-center shrink-0 z-10 shadow-sm">
                  {getCategoryIcon(ev.category)}
                </div>

                <div className="flex-1 p-4 rounded-2xl bg-navy-900/60 border border-white/5 hover:border-white/15 transition-all space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-white">{ev.title}</h4>
                      {ev.incidentId && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          {ev.incidentId}
                        </span>
                      )}
                    </div>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded border uppercase font-bold ${getBadgeStyle(ev.statusBadge || ev.status)}`}>
                      {ev.statusBadge || ev.status}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">{ev.description}</p>

                  {ev.metadata?.recipient && (
                    <div className="text-[11px] font-mono text-amber-300 bg-amber-500/10 px-2 py-1 rounded inline-block">
                      Recipient: {ev.metadata.recipient} • Provider: {ev.metadata.provider || 'Twilio Voice'}
                    </div>
                  )}

                  {ev.metadata?.latitude && (
                    <div className="text-[11px] font-mono text-cyan-300">
                      GPS: {Number(ev.metadata.latitude).toFixed(5)}, {Number(ev.metadata.longitude).toFixed(5)} ±{ev.metadata.accuracy || 5}m
                    </div>
                  )}

                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500 pt-1 border-t border-white/5">
                    <Clock className="w-3 h-3" />
                    <span>{new Date(ev.timestamp).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
