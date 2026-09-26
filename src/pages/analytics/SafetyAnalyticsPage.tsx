import React from 'react';
import {
  BarChart3,
  ShieldCheck,
  Activity,
  Navigation,
  Clock,
  PieChart as PieIcon,
  TrendingDown,
  Calendar,
  Sparkles
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { analyticsService } from '../../services/analyticsService';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';

export const SafetyAnalyticsPage: React.FC = () => {
  const [liveData, setLiveData] = React.useState<any>(null);
  const timeDist = analyticsService.getIncidentsByTimeOfDay();
  const routeDist = analyticsService.getRoutePreferenceDistribution();

  React.useEffect(() => {
    analyticsService.fetchLiveAnalytics().then((res) => {
      if (res && res.success) {
        setLiveData(res);
      }
    });
  }, []);

  const totalChecks = liveData?.metrics?.totalSafetyChecks ?? 0;
  const totalIncidents = liveData?.metrics?.totalEmergencyIncidents ?? 0;
  const avgResponse = liveData?.metrics?.avgResponseTimeDisplay ?? 'Insufficient data';
  const resolvedCount = liveData?.metrics?.resolvedIncidents ?? 0;
  const dispatchedAlerts = liveData?.metrics?.dispatchedAlerts ?? 0;
  const sampleCount = totalChecks + totalIncidents;

  const riskDist = React.useMemo(() => {
    if (liveData?.riskDistribution) {
      return [
        { name: 'Low Risk', value: liveData.riskDistribution.LOW || 0, color: '#10B981' },
        { name: 'Moderate Risk', value: liveData.riskDistribution.MODERATE || 0, color: '#F59E0B' },
        { name: 'High Risk', value: liveData.riskDistribution.HIGH || 0, color: '#F97316' },
        { name: 'Critical Risk', value: liveData.riskDistribution.CRITICAL || 0, color: '#EF4444' },
      ];
    }
    return [
      { name: 'Low Risk', value: 1, color: '#10B981' },
      { name: 'Moderate Risk', value: 0, color: '#F59E0B' },
      { name: 'High Risk', value: 0, color: '#F97316' },
      { name: 'Critical Risk', value: 0, color: '#EF4444' },
    ];
  }, [liveData]);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/[0.08]">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-purple-400">
            Operations Telemetry & Machine Learning
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
            Safety Analytics & Intelligence
          </h2>
          <p className="text-sm text-slate-400">
            {liveData ? liveData.statusMessage : 'Metropolitan risk trends, transit corridor preferences, and rapid response benchmarks.'}
          </p>
        </div>
        {liveData && (
          <Badge variant="low" size="sm" dot>
            Database Connected (SQLite WAL)
          </Badge>
        )}
      </div>

      {/* Top 4 Metrics Cards (Rule 19 & 34) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card variant="glass" className="p-6">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="font-semibold uppercase tracking-wider">Total Safety Checks</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-black text-white font-mono">{totalChecks.toLocaleString()}</div>
          <p className="text-xs text-emerald-400 mt-1">Real-time GPS pings recorded</p>
        </Card>

        <Card variant="glass" className="p-6">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="font-semibold uppercase tracking-wider">Emergency Incidents</span>
            <Activity className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-3xl font-black text-purple-300 font-mono">{totalIncidents}</div>
          <p className="text-xs text-slate-400 mt-1">{resolvedCount} incidents resolved</p>
        </Card>

        <Card variant="glass" className="p-6">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="font-semibold uppercase tracking-wider">Avg Response Time</span>
            <Clock className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-3xl font-black text-cyan-300 font-mono">{avgResponse}</div>
          <p className="text-xs text-cyan-400 mt-1">Calculated from event logs</p>
        </Card>

        <Card variant="glass" className="p-6">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="font-semibold uppercase tracking-wider">Dispatched Alerts</span>
            <Navigation className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-3xl font-black text-blue-300 font-mono">
            {dispatchedAlerts}
          </div>
          <p className="text-xs text-slate-400 mt-1">SMS & Email gateway alerts</p>
        </Card>
      </div>


      {/* Charts Grid: Risk Distribution + Incidents by Time (Rule 34) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Risk Distribution Chart */}
        <Card variant="glass" className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white">Aggregated Risk Distribution</h3>
            <span className="text-xs text-slate-400 font-mono">
              {sampleCount > 0 ? `${sampleCount} Stored Samples` : 'Insufficient Data'}
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={riskDist}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {riskDist.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    color: '#F8FAFC',
                    fontSize: '12px',
                  }}
                  formatter={(val: number) => [`${val}%`, 'Proportion']}
                />
                <Legend
                  formatter={(val) => <span className="text-xs text-slate-300">{val}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Incidents by Time Chart */}
        <Card variant="glass" className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white">Incident Frequency by Circadian Window</h3>
            <span className="text-xs text-slate-400 font-mono">24-Hour Telemetry</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={timeDist}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="time" stroke="#64748B" fontSize={10} tickLine={false} />
                <YAxis stroke="#64748B" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    color: '#F8FAFC',
                    fontSize: '12px',
                  }}
                  formatter={(val: number, name: string) => [
                    name === 'incidents' ? `${val} alerts` : `${val}/100`,
                    name === 'incidents' ? 'Alerts' : 'Avg Risk Score'
                  ]}
                />
                <Bar dataKey="incidents" fill="#8B5CF6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Route Usage & Preference Card */}
      <Card variant="glass" className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white">Transit Corridor Selection Breakdown</h3>
          <span className="text-xs text-purple-400 font-semibold font-mono">AI Recommended Route Dominance</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          {routeDist.map((item, idx) => (
            <div key={idx} className="p-4 rounded-xl bg-navy-950/60 border border-white/5 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-200">{item.name}</span>
                <span className="font-mono font-bold" style={{ color: item.color }}>{item.value}%</span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${item.value}%`, backgroundColor: item.color }}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
