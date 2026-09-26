import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Shield,
  Eye,
  EyeOff,
  Lock,
  Mail,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  AlertCircle,
  KeyRound
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/common/Button';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { loginAsDemoUser, loginWithCredentials } = useAuth();

  const [email, setEmail] = useState('demo@nirbhaya.ai');
  const [password, setPassword] = useState('demo1234');
  const [accessKey, setAccessKey] = useState('NIR-7F42-SAFE-2026');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleDemoLogin = async () => {
    setIsLoading(true);
    await loginAsDemoUser();
    setIsLoading(false);
    navigate('/dashboard');
  };

  const setRoleCredentials = (roleType: 'USER' | 'RESPONDER' | 'ADMIN') => {
    if (roleType === 'USER') {
      setEmail('demo@nirbhaya.ai');
      setPassword('demo1234');
      setAccessKey('NIR-7F42-SAFE-2026');
    } else if (roleType === 'RESPONDER') {
      setEmail('arjun@police.gov.in');
      setPassword('responder1234');
      setAccessKey('NIR-1042-RESP-2026');
    } else if (roleType === 'ADMIN') {
      setEmail('admin@nirbhaya.ai');
      setPassword('admin1234');
      setAccessKey('NIR-9001-ADMN-2026');
    }
    setErrorMessage('');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!email.trim()) {
      setErrorMessage('Please enter your email address.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }
    if (!password.trim()) {
      setErrorMessage('Please enter your password.');
      return;
    }
    if (!accessKey.trim()) {
      setErrorMessage('NIRBHAYA Access Key is required for safety platform access.');
      return;
    }

    setIsLoading(true);
    const res = await loginWithCredentials(email, password, accessKey);
    setIsLoading(false);

    if (res.success && res.user) {
      if (res.user.role === 'RESPONDER') {
        navigate('/responder');
      } else if (res.user.role === 'ADMIN') {
        navigate('/analytics');
      } else {
        navigate('/dashboard');
      }
    } else {
      setErrorMessage(res.error || 'Authentication failed. Please verify credentials.');
    }
  };

  return (
    <div className="min-h-screen bg-[#070A11] flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-5xl rounded-3xl bg-navy-900/90 border border-white/10 shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-2 backdrop-blur-2xl">
        {/* Left Column: Branding and Security Visualization */}
        <div className="hidden lg:flex flex-col justify-between p-10 bg-gradient-to-br from-navy-950 via-purple-950/20 to-navy-900 border-r border-white/10 relative overflow-hidden">
          {/* Ambient Glows */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-purple-600/10 rounded-full filter blur-[100px] pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-cyan-600/10 rounded-full filter blur-[80px] pointer-events-none" />

          {/* Top Logo */}
          <div className="relative z-10">
            <Link to="/" className="inline-flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-electric-violet to-electric-blue flex items-center justify-center text-white shadow-glow-violet">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-xl tracking-wider text-white">NIRBHAYA</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40">
                    AI
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-medium">Predict Risk. Prevent Danger. Protect Lives.</p>
              </div>
            </Link>
          </div>

          {/* Middle Visualization */}
          <div className="relative z-10 py-8 space-y-6">
            <div className="p-5 rounded-2xl bg-navy-850/60 border border-white/10 backdrop-blur-md space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-semibold text-white flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  Live Safety Telemetry
                </span>
                <span className="text-emerald-400 font-bold">SYSTEM ACTIVE</span>
              </div>
              <p className="text-xs text-slate-300">
                Safe route vector analysis, live GPS breadcrumb tracking, and verified responder network integration.
              </p>
            </div>

            <div className="space-y-2.5">
              <div className="flex items-center gap-2.5 text-xs text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Zero latency silent distress broadcast</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Dynamic lighting & crowd sensor rerouting</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Rapid verified emergency responder dispatch</span>
              </div>
            </div>
          </div>

          {/* Security Badges */}
          <div className="relative z-10 pt-6 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
              Authenticated Session
            </span>
            <span>Privacy Protected</span>
            <span className="text-purple-400">Live Safety Network</span>
          </div>
        </div>

        {/* Right Column: Login Form */}
        <div className="p-8 sm:p-10 flex flex-col justify-center space-y-6">
          <div className="space-y-1.5">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Welcome back.
            </h2>
            <p className="text-sm text-slate-400">
              Access your personal safety network.
            </p>
          </div>

          {/* Multi-User Role Access (Section 2 & 28) */}
          <div className="p-4 rounded-2xl bg-navy-950/70 border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                Select Role Account
              </span>
              <span className="text-[10px] text-slate-400 font-mono">Backend Verified</span>
            </div>
            <p className="text-xs text-slate-300">
              Select an account identity to test multi-role separation (User, Responder, Admin):
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setRoleCredentials('USER')}
                className={`px-2.5 py-2 rounded-xl text-xs font-semibold border transition-all text-center ${
                  email === 'demo@nirbhaya.ai'
                    ? 'bg-purple-600/30 border-purple-500 text-white shadow-glow-violet'
                    : 'bg-navy-900 border-white/10 text-slate-300 hover:border-white/30'
                }`}
              >
                👤 User
                <span className="block text-[10px] font-normal text-slate-400">Abhishek K</span>
              </button>
              <button
                type="button"
                onClick={() => setRoleCredentials('RESPONDER')}
                className={`px-2.5 py-2 rounded-xl text-xs font-semibold border transition-all text-center ${
                  email === 'arjun@police.gov.in'
                    ? 'bg-blue-600/30 border-blue-500 text-white'
                    : 'bg-navy-900 border-white/10 text-slate-300 hover:border-white/30'
                }`}
              >
                🛡️ Responder
                <span className="block text-[10px] font-normal text-slate-400">Officer Arjun</span>
              </button>
              <button
                type="button"
                onClick={() => setRoleCredentials('ADMIN')}
                className={`px-2.5 py-2 rounded-xl text-xs font-semibold border transition-all text-center ${
                  email === 'admin@nirbhaya.ai'
                    ? 'bg-emerald-600/30 border-emerald-500 text-white'
                    : 'bg-navy-900 border-white/10 text-slate-300 hover:border-white/30'
                }`}
              >
                ⚙️ Admin
                <span className="block text-[10px] font-normal text-slate-400">Safety Ops</span>
              </button>
            </div>
          </div>

          <div className="relative flex items-center justify-center">
            <div className="border-t border-white/10 w-full" />
            <span className="bg-navy-900 px-3 text-xs text-slate-400 uppercase tracking-wider font-mono">
              Account Credentials
            </span>
          </div>

          {errorMessage && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="demo@nirbhaya.ai"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-navy-950/80 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-navy-950/80 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-white"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  NIRBHAYA Access Key
                </label>
                <span className="text-[10px] text-cyan-400 font-mono font-medium">Access Key Verification</span>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <KeyRound className="w-4 h-4 text-cyan-400" />
                </div>
                <input
                  type="text"
                  value={accessKey}
                  onChange={(e) => setAccessKey(e.target.value.toUpperCase())}
                  placeholder="NIR-XXXX-XXXX-XXXX"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-navy-950/80 border border-white/10 text-cyan-300 font-mono placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors uppercase tracking-wider"
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded bg-navy-950 border-white/10 text-purple-600 focus:ring-purple-500 focus:ring-offset-0"
                />
                <span>Remember this terminal</span>
              </label>
            </div>

            <Button
              type="submit"
              variant="secondary"
              size="lg"
              isLoading={isLoading}
              className="w-full font-semibold"
            >
              Sign In to Network
            </Button>
          </form>

          <p className="text-center text-xs text-slate-400">
            Don't have a profile yet?{' '}
            <Link to="/register" className="text-purple-400 hover:text-purple-300 font-semibold">
              Create Safety Profile
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
