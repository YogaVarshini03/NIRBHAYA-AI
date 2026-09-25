import React, { useState } from 'react';
import {
  Settings,
  Bell,
  Volume2,
  Shield,
  MapPin,
  Mic,
  Smartphone,
  Sparkles,
  RotateCcw,
  Sun,
  Moon,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { storageService, StorageKeys } from '../../services/storageService';
import { DEFAULT_RISK_FACTORS } from '../../services/riskService';
import { DEFAULT_CONTACTS } from '../../services/contactService';
import { DEFAULT_EVIDENCE } from '../../services/evidenceService';
import { DEFAULT_INCIDENT } from '../../services/emergencyService';
import { AppSettings } from '../../types';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { useToast } from '../../context/ToastContext';

export const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const { showToast } = useToast();

  const [settings, setSettings] = useState<AppSettings>(() => {
    return storageService.getItem<AppSettings>(StorageKeys.APP_SETTINGS, {
      pushNotifications: true,
      soundAlerts: true,
      autoRiskChecks: true,
      locationServices: true,
      emergencyAudioCapture: true,
      secretShakeDetection: true,
      triplePressTrigger: true,
      demoMode: true,
      theme: 'dark',
      autoEmergencyProtection: true,
      routeDeviationProtection: true,
      emergencyCountdownSeconds: 10,
    });
  });

  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);

  const toggleSetting = (key: keyof AppSettings) => {
    const updated = {
      ...settings,
      [key]: !settings[key],
    };
    setSettings(updated);
    storageService.setItem(StorageKeys.APP_SETTINGS, updated);
    showToast('Settings saved successfully.', 'info');
  };

  const handleResetDemoData = () => {
    storageService.setItem(StorageKeys.RISK_FACTORS, DEFAULT_RISK_FACTORS);
    storageService.setItem(StorageKeys.CONTACTS, DEFAULT_CONTACTS);
    storageService.setItem(StorageKeys.EVIDENCE_LIST, DEFAULT_EVIDENCE);
    storageService.setItem(StorageKeys.ACTIVE_INCIDENT, DEFAULT_INCIDENT);

    showToast('Demo data restored to initial baseline state.', 'success');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/[0.08]">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            System Preferences
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
            Settings & Telemetry Controls
          </h2>
          <p className="text-sm text-slate-400">
            Configure privacy boundaries, emergency hardware triggers, and demo simulation parameters.
          </p>
        </div>

        <Button
          variant="danger"
          size="sm"
          onClick={() => setIsResetDialogOpen(true)}
          leftIcon={<RotateCcw className="w-4 h-4" />}
        >
          Reset Demo Data
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Account & Profile Summary */}
        <Card variant="glass" className="p-6 space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <Shield className="w-4 h-4 text-purple-400" />
            <span>Profile & Security Profile</span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-2 border-b border-white/5">
              <span className="text-slate-400">Full Name:</span>
              <span className="font-semibold text-slate-200">{user?.name || 'Ananya Sharma'}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-white/5">
              <span className="text-slate-400">Authenticated Email:</span>
              <span className="font-mono text-purple-300">{user?.email || 'demo@nirbhaya.ai'}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-white/5">
              <span className="text-slate-400">Registered Phone:</span>
              <span className="font-mono text-slate-200">{user?.phone || '+91 98765 43210'}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-slate-400">Demo Session Status:</span>
              <span className="text-emerald-400 font-semibold">Active & Persistent</span>
            </div>
          </div>
        </Card>

        {/* Theme Settings (Rule 38) */}
        <Card variant="glass" className="p-6 space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <Sun className="w-4 h-4 text-amber-400" />
            <span>Appearance & Theme</span>
          </div>

          <p className="text-xs text-slate-400">
            Select your preferred display theme. Default is Dark Premium Operations Center.
          </p>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={() => setTheme('dark')}
              className={`p-3.5 rounded-xl border flex items-center justify-center gap-2 text-xs font-semibold transition-all ${
                theme === 'dark'
                  ? 'bg-purple-600/20 border-purple-500 text-purple-200 shadow-glow-violet'
                  : 'bg-navy-950 border-white/10 text-slate-400 hover:text-white'
              }`}
            >
              <Moon className="w-4 h-4 text-purple-400" />
              <span>Dark Premium (Default)</span>
            </button>

            <button
              onClick={() => setTheme('light')}
              className={`p-3.5 rounded-xl border flex items-center justify-center gap-2 text-xs font-semibold transition-all ${
                theme === 'light'
                  ? 'bg-purple-600/20 border-purple-500 text-purple-200 shadow-glow-violet'
                  : 'bg-navy-950 border-white/10 text-slate-400 hover:text-white'
              }`}
            >
              <Sun className="w-4 h-4 text-amber-400" />
              <span>Light Mode</span>
            </button>
          </div>
        </Card>

        {/* Notifications & Sound (Rule 37) */}
        <Card variant="glass" className="p-6 space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <Bell className="w-4 h-4 text-cyan-400" />
            <span>Notification Telemetry</span>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-xl bg-navy-950/60 border border-white/5">
              <div>
                <span className="text-xs font-semibold text-white block">Push Notifications</span>
                <span className="text-[11px] text-slate-400 block">Receive instant hazard alerts on lock screen</span>
              </div>
              <input
                type="checkbox"
                checked={settings.pushNotifications}
                onChange={() => toggleSetting('pushNotifications')}
                className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-navy-950/60 border border-white/5">
              <div>
                <span className="text-xs font-semibold text-white block">Audible Siren & Alerts</span>
                <span className="text-[11px] text-slate-400 block">Audible tone during verified emergency escalation</span>
              </div>
              <input
                type="checkbox"
                checked={settings.soundAlerts}
                onChange={() => toggleSetting('soundAlerts')}
                className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
              />
            </div>
          </div>
        </Card>

        {/* Emergency Hardware Triggers (Rule 37) */}
        <Card variant="glass" className="p-6 space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <Smartphone className="w-4 h-4 text-red-400" />
            <span>Emergency Hardware Triggers</span>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-xl bg-navy-950/60 border border-white/5">
              <div>
                <span className="text-xs font-semibold text-white block">Emergency Audio Recording</span>
                <span className="text-[11px] text-slate-400 block">Buffer 30s audio securely during distress</span>
              </div>
              <input
                type="checkbox"
                checked={settings.emergencyAudioCapture}
                onChange={() => toggleSetting('emergencyAudioCapture')}
                className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-navy-950/60 border border-white/5">
              <div>
                <span className="text-xs font-semibold text-white block">High-G Shake Detection</span>
                <span className="text-[11px] text-slate-400 block">Trigger silent SOS on 3 rapid shakes</span>
              </div>
              <input
                type="checkbox"
                checked={settings.secretShakeDetection}
                onChange={() => toggleSetting('secretShakeDetection')}
                className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-navy-950/60 border border-white/5">
              <div>
                <span className="text-xs font-semibold text-white block">Power Button Triple-Press</span>
                <span className="text-[11px] text-slate-400 block">Mechanical button cadence trigger</span>
              </div>
              <input
                type="checkbox"
                checked={settings.triplePressTrigger}
                onChange={() => toggleSetting('triplePressTrigger')}
                className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
              />
            </div>
          </div>
        </Card>

        {/* Proactive AI Safety & Auto-Protection (Requirement 9 & 26) */}
        <Card variant="glass" className="p-6 space-y-4 lg:col-span-2 border-purple-500/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-bold text-white">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span>Proactive AI Safety & Auto-Protection</span>
            </div>
            <Badge variant="violet" size="sm">
              Neural Guardian
            </Badge>
          </div>

          <p className="text-xs text-slate-400">
            Configure automated threat evaluation and autonomous safety intervention parameters.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3.5 rounded-xl bg-navy-950/60 border border-white/5 flex items-start justify-between gap-3">
              <div>
                <span className="text-xs font-semibold text-white block">Automatic Emergency Protection</span>
                <span className="text-[11px] text-slate-400 block mt-0.5 leading-relaxed">
                  When enabled, NIRBHAYA AI warns you when critical risk is detected and automatically activates SOS if you do not cancel the 10-second countdown.
                </span>
              </div>
              <input
                type="checkbox"
                checked={settings.autoEmergencyProtection ?? true}
                onChange={() => toggleSetting('autoEmergencyProtection')}
                className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 mt-1"
              />
            </div>

            <div className="p-3.5 rounded-xl bg-navy-950/60 border border-white/5 flex items-start justify-between gap-3">
              <div>
                <span className="text-xs font-semibold text-white block">Route Deviation Protection</span>
                <span className="text-[11px] text-slate-400 block mt-0.5 leading-relaxed">
                  Alerts you if your movement drifts &gt;100m away from your selected safe corridor and initiates emergency countdown on persistent departure.
                </span>
              </div>
              <input
                type="checkbox"
                checked={settings.routeDeviationProtection ?? true}
                onChange={() => toggleSetting('routeDeviationProtection')}
                className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 mt-1"
              />
            </div>
          </div>
        </Card>
      </div>

      {/* Reset Confirmation Dialog (Rule 56) */}
      <ConfirmDialog
        isOpen={isResetDialogOpen}
        onClose={() => setIsResetDialogOpen(false)}
        onConfirm={handleResetDemoData}
        title="Reset All Demo Data?"
        message="This will restore all contacts, evidence files, risk parameters, and emergency logs back to initial factory demo state. Real browser files will never be touched."
        confirmText="Reset Demo Data"
        isDestructive
      />
    </div>
  );
};
