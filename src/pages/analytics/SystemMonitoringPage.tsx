import React from 'react';
import {
  Cpu,
  Server,
  Activity,
  Radio,
  CheckCircle2,
  Zap,
  Layers,
  Database,
  ShieldCheck,
  Clock
} from 'lucide-react';
import { analyticsService } from '../../services/analyticsService';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';

export const SystemMonitoringPage: React.FC = () => {
  const services = analyticsService.getSystemStatus();

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              Infrastructure Telemetry
            </span>
            <Badge variant="low" size="sm" dot>
              All Systems Operational
            </Badge>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
            System Monitoring & Node Health
          </h2>
          <p className="text-sm text-slate-400">
            Real-time latency metrics, neural inference throughput, and multi-node availability status.
          </p>
        </div>
      </div>

      {/* Services Status Grid (Rule 36) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {services.map((svc, idx) => {
          let isDemo = svc.status.includes('DEMO');

          return (
            <Card key={idx} variant="glass" className="p-6 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                    <Server className="w-5 h-5" />
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>{svc.status}</span>
                  </div>
                </div>

                <div>
                  <h4 className="text-base font-bold text-white">{svc.name}</h4>
                  <p className="text-xs text-slate-400 mt-1">{svc.subtext}</p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-navy-950/60 border border-white/5 flex items-center justify-between text-xs font-mono">
                <div>
                  <span className="text-slate-400 text-[10px] block">LATENCY</span>
                  <span className="text-cyan-300 font-bold">{svc.latencyMs} ms</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">AVAILABILITY</span>
                  <span className="text-emerald-400 font-bold">{svc.uptime}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">MODE</span>
                  <span className="text-purple-300 font-bold">{isDemo ? 'SIMULATION' : 'REAL-TIME'}</span>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Architecture Overview Diagram Card */}
      <Card variant="glass" className="p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-purple-400" />
            <h3 className="text-base font-bold text-white">Distributed Architecture Pipeline</h3>
          </div>
          <span className="text-xs font-mono text-purple-300">Client-First Edge Inference</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-center">
          <div className="p-4 rounded-2xl bg-navy-950/70 border border-white/5 space-y-2">
            <span className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-300 mx-auto flex items-center justify-center font-bold text-xs">
              01
            </span>
            <h5 className="text-sm font-bold text-white">Sensor Ingestion</h5>
            <p className="text-xs text-slate-400">
              Hardware mic, accelerometer, and ambient illumination telemetry stream continuously into local memory.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-navy-950/70 border border-white/5 space-y-2">
            <span className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-300 mx-auto flex items-center justify-center font-bold text-xs">
              02
            </span>
            <h5 className="text-sm font-bold text-white">Neural Inference</h5>
            <p className="text-xs text-slate-400">
              Weighted matrix evaluation (30% Location, 25% History, 15% Lighting, 15% Crowd, 15% Time).
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-navy-950/70 border border-white/5 space-y-2">
            <span className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-300 mx-auto flex items-center justify-center font-bold text-xs">
              03
            </span>
            <h5 className="text-sm font-bold text-white">Vector Routing</h5>
            <p className="text-xs text-slate-400">
              A* graph pathfinding prioritizing verified CCTV coverage, high-lux corridors, and public havens.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-navy-950/70 border border-white/5 space-y-2">
            <span className="w-8 h-8 rounded-xl bg-red-500/20 text-red-300 mx-auto flex items-center justify-center font-bold text-xs">
              04
            </span>
            <h5 className="text-sm font-bold text-white">Simulated Dispatch</h5>
            <p className="text-xs text-slate-400">
              Instantaneous fail-safe coordination alerting guardians, logging evidence, and vectoring rapid patrol.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};
