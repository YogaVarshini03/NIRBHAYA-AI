import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Shield,
  User,
  Mail,
  Phone,
  Lock,
  HeartHandshake,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  KeyRound,
  Copy,
  Download,
  Check
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/common/Button';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { registerUser } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    emergencyContact: '',
    locationPermission: true,
    terms: false,
  });

  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [generatedKey, setGeneratedKey] = useState('');
  const [hasCopiedKey, setHasCopiedKey] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Compute password strength
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { label: 'Empty', color: 'bg-slate-700', width: '0%' };
    if (pass.length < 6) return { label: 'Weak', color: 'bg-red-500', width: '33%' };
    if (pass.length < 10 || !/\d/.test(pass)) return { label: 'Medium', color: 'bg-amber-500', width: '66%' };
    return { label: 'Strong', color: 'bg-emerald-500', width: '100%' };
  };

  const strength = getPasswordStrength(formData.password);

  const handleCopyKey = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(generatedKey);
      setHasCopiedKey(true);
      setTimeout(() => setHasCopiedKey(false), 3000);
    }
  };

  const handleDownloadKey = () => {
    const textContent = `NIRBHAYA AI — EMERGENCY SAFETY NETWORK
USER ACCESS KEY FILE
========================================
User Name: ${formData.name}
Email: ${formData.email}
NIRBHAYA Access Key: ${generatedKey}
Created: ${new Date().toISOString()}

IMPORTANT: Keep this key secure. You need it along with your password to log in.
`;
    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `nirbhaya-access-key-${formData.name.replace(/\s+/g, '_')}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('Please enter your full name.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }
    const phoneClean = formData.phone.replace(/\D/g, '');
    if (phoneClean.length < 10) {
      setError('Please enter a valid 10-digit phone number.');
      return;
    }
    if (formData.password.length < 6) {
      setError('Password must contain at least 6 characters.');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (!formData.emergencyContact.trim()) {
      setError('Please specify at least one primary emergency contact number.');
      return;
    }
    if (!formData.terms) {
      setError('You must accept the safety privacy terms and simulation disclaimers.');
      return;
    }

    setIsLoading(true);
    registerUser({
      name: formData.name,
      email: formData.email,
      password: formData.password,
      phone: formData.phone,
      emergencyContact: formData.emergencyContact,
      role: 'USER',
    }).then((res) => {
      setIsLoading(false);
      if (res.success) {
        setGeneratedKey(res.accessKey || 'NIR-7F42-SAFE-2026');
        setIsSuccess(true);
      } else {
        setError(res.error || 'Failed to create safety account.');
      }
    }).catch((err) => {
      setIsLoading(false);
      setError(err?.message || 'Server connection error.');
    });
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-[#070A11] flex items-center justify-center p-4">
        <div className="max-w-md w-full p-8 rounded-3xl bg-navy-900 border border-emerald-500/40 text-center space-y-6 shadow-2xl backdrop-blur-2xl">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mx-auto shadow-glow-emerald">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <h2 className="text-2xl font-black text-white">Account Created!</h2>
            <p className="text-xs text-slate-300">
              Welcome to NIRBHAYA AI. Below is your unique permanent Access Key.
            </p>
          </div>

          {/* Unique Access Key Display Box */}
          <div className="p-4 rounded-2xl bg-navy-950/90 border border-cyan-500/40 text-left space-y-2">
            <div className="flex items-center justify-between text-[11px] text-cyan-300 font-semibold uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5" />
                NIRBHAYA Access Key
              </span>
              <span className="text-[10px] text-amber-400 font-bold">SAVE ONCE</span>
            </div>
            <div className="p-3 rounded-xl bg-black/60 border border-white/10 font-mono text-center text-lg sm:text-xl font-black tracking-widest text-cyan-300 select-all">
              {generatedKey}
            </div>
            <p className="text-[10px] text-slate-400 leading-tight">
              ⚠️ You must present this key along with your password when logging in. This key is displayed once in full.
            </p>
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleCopyKey}
              leftIcon={hasCopiedKey ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              className="w-full text-xs font-semibold"
            >
              {hasCopiedKey ? 'Copied!' : 'Copy Key'}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleDownloadKey}
              leftIcon={<Download className="w-4 h-4 text-cyan-400" />}
              className="w-full text-xs font-semibold"
            >
              Download (.txt)
            </Button>
          </div>

          <Button
            variant="primary"
            size="lg"
            onClick={() => navigate('/dashboard')}
            rightIcon={<ArrowRight className="w-4 h-4" />}
            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold shadow-glow-violet"
          >
            Enter Safety Dashboard
          </Button>

          <Link to="/login" className="block text-xs text-purple-400 hover:text-purple-300 font-medium">
            Or Return to Sign In Screen
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070A11] flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-xl rounded-3xl bg-navy-900/90 border border-white/10 p-6 sm:p-10 shadow-2xl backdrop-blur-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-cyan-500 text-white shadow-glow-violet mb-2">
            <Shield className="w-6 h-6" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Create Safety Profile</h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Join the proactive emergency and safe transit ecosystem.
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ananya Sharma"
                  className="w-full pl-10 pr-3 py-2 rounded-xl bg-navy-950/80 border border-white/10 text-white text-sm focus:border-purple-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="ananya@example.com"
                  className="w-full pl-10 pr-3 py-2 rounded-xl bg-navy-950/80 border border-white/10 text-white text-sm focus:border-purple-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Phone Number</label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+91 98765 43210"
                  className="w-full pl-10 pr-3 py-2 rounded-xl bg-navy-950/80 border border-white/10 text-white text-sm focus:border-purple-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Primary Guardian Phone</label>
              <div className="relative">
                <HeartHandshake className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="tel"
                  required
                  value={formData.emergencyContact}
                  onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
                  placeholder="+91 98765 11223 (Mother)"
                  className="w-full pl-10 pr-3 py-2 rounded-xl bg-navy-950/80 border border-white/10 text-white text-sm focus:border-purple-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-3 py-2 rounded-xl bg-navy-950/80 border border-white/10 text-white text-sm focus:border-purple-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Confirm Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-3 py-2 rounded-xl bg-navy-950/80 border border-white/10 text-white text-sm focus:border-purple-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Password strength indicator */}
          {formData.password && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Password Strength:</span>
                <span className="font-semibold text-slate-200">{strength.label}</span>
              </div>
              <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full ${strength.color} transition-all duration-300`}
                  style={{ width: strength.width }}
                />
              </div>
            </div>
          )}

          {/* Checkboxes */}
          <div className="space-y-2 pt-2 text-xs">
            <label className="flex items-center gap-2.5 text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.locationPermission}
                onChange={(e) => setFormData({ ...formData, locationPermission: e.target.checked })}
                className="rounded bg-navy-950 border-white/10 text-purple-600 focus:ring-purple-500"
              />
              <span>Allow high-precision GPS telemetry for safe route calculation</span>
            </label>

            <label className="flex items-center gap-2.5 text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.terms}
                onChange={(e) => setFormData({ ...formData, terms: e.target.checked })}
                className="rounded bg-navy-950 border-white/10 text-purple-600 focus:ring-purple-500"
              />
              <span>
                I understand this is a hackathon demo environment with simulated emergency dispatches.
              </span>
            </label>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isLoading}
            className="w-full font-bold shadow-glow-violet mt-4"
          >
            Create My Safety Account
          </Button>
        </form>

        <p className="text-center text-xs text-slate-400">
          Already registered?{' '}
          <Link to="/login" className="text-purple-400 hover:text-purple-300 font-semibold">
            Sign In to Network
          </Link>
        </p>
      </div>
    </div>
  );
};
