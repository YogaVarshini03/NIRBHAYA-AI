import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldAlert,
  MapPin,
  Users,
  Mic,
  Car,
  Radio,
  CheckCircle2,
  Clock,
  ExternalLink,
  XCircle,
  AlertTriangle,
  Mail,
  MessageSquare
} from 'lucide-react';
import { useEmergency } from '../../context/EmergencyContext';
import { Button } from '../common/Button';

export const EmergencyWorkflowModal: React.FC = () => {
  const {
    isEmergencyModalOpen,
    closeEmergencyModal,
    activeIncident,
    workflowSteps,
    notificationResults,
    workflowError,
  } = useEmergency();
  const navigate = useNavigate();

  if (!isEmergencyModalOpen) return null;

  const handleOpenTracking = () => {
    closeEmergencyModal();
    navigate('/live-tracking');
  };

  const handleViewIncident = () => {
    closeEmergencyModal();
    navigate('/responder/active');
  };

  const stepIcons = [ShieldAlert, MapPin, Radio, Users, Mic, Car];

  const smsResult = notificationResults.find((n: any) => n.type === 'SMS');
  const emailResult = notificationResults.find((n: any) => n.type === 'EMAIL');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-black/90 backdrop-blur-xl animate-in fade-in">
      <div className="relative w-full max-w-2xl bg-navy-900 border-2 border-red-500/50 rounded-3xl p-6 sm:p-8 shadow-glow-red z-10 text-white space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-red-500/20 gap-3">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-600/20 border border-red-500 rounded-2xl animate-pulse">
              <ShieldAlert className="w-8 h-8 text-red-400" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/40">
                ACTIVE SOS DISPATCH
              </span>
              <h2 className="text-xl sm:text-2xl font-extrabold text-white mt-1">
                EMERGENCY TELEMETRY NETWORK
              </h2>
            </div>
          </div>
          <div className="text-right sm:text-right font-mono text-xs text-red-300 bg-red-950/60 p-2.5 rounded-xl border border-red-500/30">
            <div>Incident ID: {activeIncident.id}</div>
            <div className="text-slate-400">
              Duration: {Math.floor(activeIncident.elapsedSeconds / 60)}m {activeIncident.elapsedSeconds % 60}s
            </div>
          </div>
        </div>

        {/* Global Error Banner if any step failed */}
        {workflowError && (
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-red-500/10 border border-red-500/40 text-red-300 text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
            <div>
              <strong className="block font-semibold">Workflow Notice:</strong>
              <span>{workflowError}</span>
            </div>
          </div>
        )}

        {/* Step Progress List Driven by Real States */}
        <div className="space-y-3">
          {workflowSteps.map((step, idx) => {
            const Icon = stepIcons[idx] || ShieldAlert;

            let borderStyle = 'border-white/5 bg-navy-850/40 text-slate-400';
            let iconBox = 'bg-slate-800 text-slate-400';
            let badgeIcon = <Clock className="w-4 h-4 text-slate-500" />;

            if (step.status === 'SUCCESS') {
              borderStyle = 'border-emerald-500/30 bg-emerald-950/20 text-slate-200';
              iconBox = 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40';
              badgeIcon = <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
            } else if (step.status === 'RUNNING') {
              borderStyle = 'border-amber-500/50 bg-amber-950/20 text-white shadow-glow-amber';
              iconBox = 'bg-amber-500/30 text-amber-300 border border-amber-500/50 animate-pulse';
              badgeIcon = <Clock className="w-4 h-4 text-amber-400 animate-spin" />;
            } else if (step.status === 'FAILED') {
              borderStyle = 'border-red-500/50 bg-red-950/30 text-white shadow-glow-red';
              iconBox = 'bg-red-500/30 text-red-300 border border-red-500/50';
              badgeIcon = <XCircle className="w-4 h-4 text-red-400" />;
            }

            return (
              <div
                key={step.number}
                className={`flex items-start gap-4 p-3.5 sm:p-4 rounded-2xl border transition-all duration-300 ${borderStyle}`}
              >
                <div className={`p-2.5 rounded-xl shrink-0 ${iconBox}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>Step {step.number}: {step.title}</span>
                    </h4>
                    {badgeIcon}
                  </div>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed break-words">
                    {step.detail}
                  </p>

                  {/* Independent SMS / Email Status Badges for Step 4 */}
                  {step.number === 4 && (
                    <div className="mt-2.5 flex flex-wrap gap-2 pt-2 border-t border-white/10">
                      {smsResult && (
                        <div
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono font-medium border ${
                            smsResult.status === 'SENT'
                              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                              : 'bg-red-500/10 text-red-300 border-red-500/30'
                          }`}
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>
                            SMS: {smsResult.status === 'SENT' ? 'SENT' : `FAILED (${smsResult.error || 'Trial restriction'})`}
                          </span>
                        </div>
                      )}

                      {emailResult && (
                        <div
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono font-medium border ${
                            emailResult.status === 'SENT'
                              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                              : 'bg-red-500/10 text-red-300 border-red-500/30'
                          }`}
                        >
                          <Mail className="w-3.5 h-3.5" />
                          <span>
                            Email: {emailResult.status === 'SENT' ? 'SENT' : `FAILED (${emailResult.error})`}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
          <Button
            variant="ghost"
            onClick={closeEmergencyModal}
            className="w-full sm:w-auto text-slate-400 hover:text-white"
          >
            Close Dialog
          </Button>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Button
              variant="outline"
              onClick={handleViewIncident}
              className="flex-1 sm:flex-none border-slate-700 hover:border-slate-500 text-xs sm:text-sm"
            >
              Responder View
            </Button>
            <Button
              variant="danger"
              onClick={handleOpenTracking}
              className="flex-1 sm:flex-none shadow-glow-red flex items-center justify-center gap-2 text-xs sm:text-sm"
            >
              <span>Live GPS Tracking</span>
              <ExternalLink className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
