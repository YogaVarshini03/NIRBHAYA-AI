import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield,
  Activity,
  Navigation,
  AlertOctagon,
  Radio,
  FileLock2,
  Users,
  Eye,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Zap,
  Lock,
  Cpu,
  Layers,
  ChevronRight,
  ShieldCheck,
  Building,
  Car
} from 'lucide-react';
import { Button } from '../../components/common/Button';
import { useAuth } from '../../context/AuthContext';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { loginAsDemoUser } = useAuth();

  const handleEnterDashboard = () => {
    loginAsDemoUser();
    navigate('/dashboard');
  };

  const howItWorks = [
    { title: 'Detect Risk', desc: 'Real-time telemetry continuously evaluates ambient lighting, crowd density, and historical incident patterns.' },
    { title: 'Predict Danger', desc: 'Predictive neural models forecast vulnerability spikes before entering high-risk alleys or transit points.' },
    { title: 'Choose Safer Route', desc: 'AI routing directs you via certified well-lit corridors, active storefronts, and emergency kiosks.' },
    { title: 'Trigger Silent SOS', desc: 'Activate instant distress beacon via discreet 3s hold, triple tap, shake, or secret voice passphrase.' },
    { title: 'Connect Responders', desc: 'Coordinates immediate triage with nearby community responders and law enforcement dispatch.' },
    { title: 'Preserve Evidence', desc: 'Tamper-evident vault cryptographically locks multi-angle camera snapshots, audio clips, and GPS logs.' },
  ];

  const coreTech = [
    {
      icon: Activity,
      title: 'AI Risk Prediction',
      desc: 'Multivariate environmental inference scoring weighted by lighting, time, crowds, and past security telemetry.',
    },
    {
      icon: Navigation,
      title: 'Safe Route Intelligence',
      desc: 'Vector pathfinding prioritizing well-lit public thoroughfares and verified emergency sanctuaries over bare distance.',
    },
    {
      icon: AlertOctagon,
      title: 'Silent SOS',
      desc: 'Immediate emergency broadcast with zero-screen feedback to safeguard user confidentiality in hostage situations.',
    },
    {
      icon: Zap,
      title: 'Voice Trigger Detection',
      desc: 'Background keyword neural classifier detects whispered distress phrases like "Help" or customizable passcodes.',
    },
    {
      icon: Radio,
      title: 'Live Telemetry & Tracking',
      desc: 'Millisecond-accurate vector triangulation with continuous responder ETA vector countdowns.',
    },
    {
      icon: FileLock2,
      title: 'Evidence Vault',
      desc: 'Cryptographic SHA-256 chain of custody ensuring admissibility of incident media for legal protection.',
    },
    {
      icon: Users,
      title: 'Trusted Responders',
      desc: 'Automated simultaneous broadcast to prioritized family guardians and patrol officers.',
    },
    {
      icon: Layers,
      title: 'Offline Emergency Fallback',
      desc: 'Autonomous mesh communication and cached offline safety telemetry when cell towers lose connectivity.',
    },
  ];

  const workflowSteps = [
    { label: 'Risk Detected', sub: 'Environmental sensor spike' },
    { label: 'SOS Triggered', sub: 'Discreet silent beacon' },
    { label: 'Location Acquired', sub: '4-meter precision GPS' },
    { label: 'Contacts Notified', sub: 'Simulated alert dispatched' },
    { label: 'Responder Assigned', sub: 'Unit RSP-1042 en route' },
    { label: 'Live Tracking', sub: 'Real-time telemetry stream' },
    { label: 'Incident Resolved', sub: 'Safe arrival verified' },
  ];

  return (
    <div className="min-h-screen bg-[#070A11] text-slate-100 selection:bg-purple-600 selection:text-white">
      {/* Top Navigation Bar */}
      <nav className="border-b border-white/[0.08] bg-navy-950/70 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-electric-violet to-electric-blue flex items-center justify-center text-white shadow-glow-violet">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-lg tracking-wider text-white">NIRBHAYA</span>
                <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40">
                  AI
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium">Predict. Prevent. Protect.</p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a>
            <a href="#technology" className="hover:text-white transition-colors">Core Technology</a>
            <a href="#workflow" className="hover:text-white transition-colors">Emergency Protocol</a>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/login')}
              className="hidden sm:inline-flex"
            >
              Sign In
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleEnterDashboard}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Explore Demo
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-16 pb-24 overflow-hidden">
        {/* Background glow effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-600/15 rounded-full filter blur-[140px] pointer-events-none" />
        <div className="absolute top-1/3 right-10 w-[400px] h-[400px] bg-blue-600/15 rounded-full filter blur-[120px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-semibold shadow-glow-violet animate-in fade-in">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>National Hackathon Showcase Prototype</span>
            </div>

            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold text-white tracking-tight leading-[1.1]">
              Predict Risk. <br className="hidden sm:inline" />
              <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
                Prevent Danger.
              </span> <br />
              Protect Lives.
            </h1>

            <p className="text-base sm:text-lg text-slate-300 leading-relaxed font-normal">
              An AI-powered proactive safety network that analyzes environmental risk, recommends safer routes, detects distress silently, and coordinates rapid emergency response.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Button
                variant="primary"
                size="lg"
                onClick={() => navigate('/register')}
                className="w-full sm:w-auto font-bold shadow-glow-violet"
                rightIcon={<ChevronRight className="w-5 h-5" />}
              >
                Get Started
              </Button>
              <Button
                variant="secondary"
                size="lg"
                onClick={() => navigate('/login')}
                className="w-full sm:w-auto"
              >
                Explore Demo
              </Button>
              <Button
                variant="glass"
                size="lg"
                onClick={handleEnterDashboard}
                className="w-full sm:w-auto text-cyan-300 border-cyan-500/30 hover:bg-cyan-500/10"
              >
                Enter Safety Dashboard
              </Button>
            </div>
          </div>

          {/* Hero Visual: Realistic Simulated Safety Network Map */}
          <div className="mt-14 max-w-5xl mx-auto rounded-3xl bg-navy-900/90 border border-white/10 p-3 sm:p-5 shadow-2xl backdrop-blur-2xl relative overflow-hidden group">
            {/* Top Bar of the Visual */}
            <div className="flex items-center justify-between pb-3 px-2 border-b border-white/10 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-semibold text-white">AI Safety Network Online</span>
              </div>
              <div className="flex items-center gap-3 font-mono text-[11px]">
                <span className="text-purple-400">4 Safe Zones Active</span>
                <span className="text-cyan-400">12 Responder Nodes</span>
                <span className="text-emerald-400">Low Risk Area (23/100)</span>
              </div>
            </div>

            {/* Interactive SVG Network Simulation Map */}
            <div className="relative h-[340px] sm:h-[420px] w-full bg-[#080B14] rounded-2xl overflow-hidden mt-3">
              <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                {/* Street grid */}
                <defs>
                  <pattern id="hero-grid" width="50" height="50" patternUnits="userSpaceOnUse">
                    <path d="M 50 0 L 0 0 0 50" fill="none" stroke="rgba(255, 255, 255, 0.03)" strokeWidth="1" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#hero-grid)" />

                {/* Road Network Lines */}
                <g stroke="rgba(255, 255, 255, 0.1)" strokeWidth="12" fill="none">
                  <line x1="10%" y1="20%" x2="90%" y2="20%" />
                  <line x1="10%" y1="50%" x2="90%" y2="50%" />
                  <line x1="10%" y1="80%" x2="90%" y2="80%" />
                  <line x1="30%" y1="10%" x2="30%" y2="90%" />
                  <line x1="70%" y1="10%" x2="70%" y2="90%" />
                </g>

                {/* Animated Connection Lines */}
                <path
                  d="M 300 210 L 450 120 L 700 120 L 700 250"
                  stroke="#8B5CF6"
                  strokeWidth="3"
                  strokeDasharray="6 4"
                  fill="none"
                  className="animate-pulse"
                />
                <path
                  d="M 300 210 L 300 336 L 550 336 L 680 250"
                  stroke="#06B6D4"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                  fill="none"
                />

                {/* Safe Zones Glow */}
                <circle cx="70%" cy="30%" r="60" fill="rgba(16, 185, 129, 0.15)" stroke="#10B981" strokeWidth="1.5" />
                <circle cx="30%" cy="75%" r="50" fill="rgba(59, 130, 246, 0.12)" stroke="#3B82F6" strokeWidth="1" />

                {/* Risk Warning Zone */}
                <circle cx="85%" cy="75%" r="45" fill="rgba(239, 68, 68, 0.15)" stroke="#EF4444" strokeWidth="1.5" strokeDasharray="4 2" />
              </svg>

              {/* User Location Node */}
              <div className="absolute top-[50%] left-[30%] -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
                <span className="w-12 h-12 rounded-full bg-purple-500/25 animate-ping absolute" />
                <div className="w-5 h-5 rounded-full bg-purple-500 border-2 border-white shadow-glow-violet z-10" />
                <div className="absolute top-6 px-2 py-0.5 rounded bg-navy-950/90 border border-purple-500/40 text-[10px] font-bold text-purple-300 whitespace-nowrap">
                  You (Ananya)
                </div>
              </div>

              {/* Responder Node */}
              <div className="absolute top-[28%] left-[70%] -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
                <span className="w-10 h-10 rounded-full bg-blue-500/30 animate-ping absolute" />
                <div className="w-7 h-7 rounded-full bg-blue-600 border border-white flex items-center justify-center text-white shadow-glow-blue z-10">
                  <Car className="w-3.5 h-3.5" />
                </div>
                <div className="absolute top-8 px-2 py-0.5 rounded bg-navy-950/90 border border-blue-500/40 text-[10px] font-bold text-blue-300 whitespace-nowrap">
                  Responder RSP-1042 (1.8 km)
                </div>
              </div>

              {/* Police Haven Node */}
              <div className="absolute top-[20%] left-[45%] -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
                <div className="w-6 h-6 rounded-full bg-emerald-600 border border-emerald-300 flex items-center justify-center text-white shadow-glow-emerald">
                  <ShieldCheck className="w-3.5 h-3.5" />
                </div>
                <div className="absolute top-7 px-2 py-0.5 rounded bg-navy-950/90 border border-emerald-500/40 text-[10px] font-bold text-emerald-300 whitespace-nowrap">
                  Safe Haven: Central Police
                </div>
              </div>

              {/* Hospital Safe Node */}
              <div className="absolute top-[80%] left-[30%] -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
                <div className="w-6 h-6 rounded-full bg-cyan-600 border border-cyan-300 flex items-center justify-center text-white shadow-glow-cyan">
                  <Building className="w-3.5 h-3.5" />
                </div>
                <div className="absolute top-7 px-2 py-0.5 rounded bg-navy-950/90 border border-cyan-500/40 text-[10px] font-bold text-cyan-300 whitespace-nowrap">
                  Metro City Hospital
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-24 border-t border-white/[0.08] relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-400">
              System Architecture
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
              How NIRBHAYA AI Works
            </h2>
            <p className="text-sm text-slate-400">
              A comprehensive 6-stage lifecycle anticipating threats and mobilizing protection in seconds.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {howItWorks.map((item, idx) => (
              <div
                key={idx}
                className="p-6 rounded-2xl bg-navy-900/60 border border-white/[0.08] hover:border-purple-500/40 hover:-translate-y-1 transition-all duration-200 group"
              >
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 font-bold text-sm mb-4 group-hover:bg-purple-500 group-hover:text-white transition-colors">
                  0{idx + 1}
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{item.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Core Technology Section */}
      <section id="technology" className="py-24 border-t border-white/[0.08] bg-navy-950/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
              Autonomous Safety Tech
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
              Core Engineering Stack
            </h2>
            <p className="text-sm text-slate-400">
              Built with privacy-first neural evaluation, low-latency telemetry, and fault-tolerant mesh fallback.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {coreTech.map((tech, idx) => {
              const Icon = tech.icon;
              return (
                <div
                  key={idx}
                  className="p-6 rounded-2xl bg-navy-900/40 border border-white/[0.06] hover:border-cyan-500/40 hover:-translate-y-1 transition-all duration-200"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-purple-500/10 to-cyan-500/10 border border-white/10 flex items-center justify-center text-cyan-400 mb-4">
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-white mb-2">{tech.title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">{tech.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Why Nirbhaya AI Section */}
      <section className="py-24 border-t border-white/[0.08]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              The Paradigm Shift
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
              Why NIRBHAYA AI is Different
            </h2>
            <p className="text-sm text-slate-400">
              Legacy apps wait for danger to strike. NIRBHAYA AI predicts and prevents before harm occurs.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 rounded-3xl bg-navy-900/80 border border-white/10 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-300">
                <Activity className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white">Proactive Protection</h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                Rather than acting as a simple panic buzzer, our environmental inference continuously flags dark or deserted segments, steering users away from risk proactively.
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-navy-900/80 border border-white/10 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-300">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white">Rapid Emergency Workflow</h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                One-touch 3-second hold silently coordinates high-precision GPS locks, alerts trusted family circles, starts encrypted evidence recordings, and routes patrol units.
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-navy-900/80 border border-white/10 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-300">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white">Privacy-Aware Design</h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                Telemetry processing is localized. Location beacons activate only during active travel or verified distress, ensuring total autonomy and dignity.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Emergency Workflow Section */}
      <section id="workflow" className="py-24 border-t border-white/[0.08] bg-[#0A0E1A]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-red-400">
              Rapid Response Protocol
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
              End-to-End Emergency Workflow
            </h2>
            <p className="text-sm text-slate-400">
              Autonomous orchestration when seconds make the difference between safety and danger.
            </p>
          </div>

          <div className="flex flex-col lg:flex-row items-center justify-between gap-4 relative">
            {workflowSteps.map((step, idx) => (
              <React.Fragment key={idx}>
                <div className="flex-1 w-full p-4 rounded-2xl bg-navy-900 border border-white/10 text-center relative group hover:border-red-500/40 transition-colors">
                  <div className="text-[10px] font-mono text-slate-400 uppercase">Step 0{idx + 1}</div>
                  <h4 className="text-sm font-bold text-white mt-1">{step.label}</h4>
                  <p className="text-[11px] text-slate-400 mt-1">{step.sub}</p>
                </div>
                {idx < workflowSteps.length - 1 && (
                  <div className="hidden lg:block text-slate-600 font-bold">
                    <ArrowRight className="w-4 h-4 text-purple-400" />
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-24 border-t border-white/[0.08] relative overflow-hidden text-center">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-purple-950/20" />
        <div className="max-w-4xl mx-auto px-4 relative z-10 space-y-6">
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            “Your safety should never depend on luck.”
          </h2>
          <p className="text-base text-slate-300 max-w-xl mx-auto">
            Experience the live interactive prototype right now. Explore the predictive risk engine, calculate safer routes, and trigger simulated rapid response.
          </p>
          <div className="pt-4">
            <Button
              variant="primary"
              size="xl"
              onClick={handleEnterDashboard}
              rightIcon={<ArrowRight className="w-5 h-5" />}
              className="font-extrabold px-10 py-4 shadow-glow-violet text-lg"
            >
              ENTER SAFETY DASHBOARD
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.08] py-8 bg-navy-950 text-xs text-slate-500 text-center">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-purple-400" />
            <span className="font-semibold text-slate-300">NIRBHAYA AI</span>
            <span>• Real-Time Autonomous Safety Platform</span>
          </div>
          <p>© 2026 NIRBHAYA AI Network. Active telemetry, geolocation, and rapid responder dispatch.</p>
        </div>
      </footer>
    </div>
  );
};
