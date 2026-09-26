import React, { useState, useEffect, useRef } from 'react';
import {
  Shield,
  Lock,
  Unlock,
  Play,
  Pause,
  Download,
  Trash2,
  Info,
  Clock,
  MapPin,
  CheckCircle2,
  Volume2,
  Camera,
  X,
  ShieldAlert,
  KeyRound,
  FileCheck,
  Copy,
  Check,
  Eye,
  AlertTriangle,
  RotateCw,
  LogOut
} from 'lucide-react';
import { evidenceService } from '../../services/evidenceService';
import { locationService } from '../../services/locationService';
import { EvidenceItem } from '../../types';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';

export const EvidenceLockerPage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  // Vault Gate State
  const [isAuthorized, setIsAuthorized] = useState<boolean>(() => evidenceService.isVaultAuthorized());
  const [accessKeyInput, setAccessKeyInput] = useState<string>('');
  const [gateError, setGateError] = useState<string>('');
  const [isVerifyingKey, setIsVerifyingKey] = useState<boolean>(false);

  // Evidence Data State
  const [evidenceList, setEvidenceList] = useState<EvidenceItem[]>([]);
  const [isLoadingList, setIsLoadingList] = useState<boolean>(false);
  const [selectedMetadata, setSelectedMetadata] = useState<any | null>(null);
  const [viewingImage, setViewingImage] = useState<EvidenceItem | null>(null);
  const [playingAudio, setPlayingAudio] = useState<EvidenceItem | null>(null);
  const [audioError, setAudioError] = useState<boolean>(false);
  const [itemToDelete, setItemToDelete] = useState<EvidenceItem | null>(null);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  // Real Camera Capture State
  const [isCameraOpen, setIsCameraOpen] = useState<boolean>(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string>('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Real Audio Recording State
  const [isAudioModalOpen, setIsAudioModalOpen] = useState<boolean>(false);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [audioErrorMsg, setAudioErrorMsg] = useState<string>('');
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<number | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement>(null);

  // Load evidence if already authorized
  useEffect(() => {
    if (isAuthorized) {
      loadEvidence();
    }
  }, [isAuthorized]);

  const loadEvidence = async () => {
    setIsLoadingList(true);
    const list = await evidenceService.fetchEvidenceFromBackend();
    setEvidenceList(list);
    setIsLoadingList(false);
  };

  // Verify Access Key Handler
  const handleVerifyAccessKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setGateError('');
    if (!accessKeyInput.trim()) {
      setGateError('Please enter your NIRBHAYA Access Key.');
      return;
    }

    setIsVerifyingKey(true);
    const result = await evidenceService.verifyAccessKey(accessKeyInput.trim().toUpperCase());
    setIsVerifyingKey(false);

    if (result.success) {
      setIsAuthorized(true);
      setAccessKeyInput('');
      showToast('Access Key verified. Forensic Evidence Locker unlocked.', 'success');
      loadEvidence();
    } else {
      setGateError(result.error || 'Invalid NIRBHAYA Access Key.');
    }
  };

  // Lock Vault Handler (Revoke session)
  const handleLockVault = async () => {
    await evidenceService.lockVault();
    setIsAuthorized(false);
    setEvidenceList([]);
    showToast('Evidence vault locked. Authorization session revoked.', 'info');
  };

  // Lock / Unlock Evidence Record
  const handleToggleLock = async (item: EvidenceItem) => {
    const updatedLock = await evidenceService.toggleLock(item.id, item.isLocked);
    setEvidenceList((prev) =>
      prev.map((e) => (e.id === item.id ? { ...e, isLocked: updatedLock } : e))
    );
    showToast(
      updatedLock
        ? `Evidence ${item.id} locked. Tamper-evident integrity freeze enforced.`
        : `Evidence ${item.id} unlocked for authorized modification.`,
      updatedLock ? 'info' : 'warning'
    );
  };

  // Delete Record Handler
  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;
    const res = await evidenceService.deleteEvidence(itemToDelete.id);
    if (res.success) {
      setEvidenceList((prev) => prev.filter((e) => e.id !== itemToDelete.id));
      showToast(`Evidence ${itemToDelete.id} permanently removed.`, 'success');
    } else {
      showToast(res.error || 'Cannot delete locked evidence. Unlock first.', 'error', 4000);
    }
    setItemToDelete(null);
  };

  // Copy SHA-256 Hash
  const handleCopyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    showToast('SHA-256 Hash copied to clipboard', 'info', 2000);
    setTimeout(() => setCopiedHash(null), 2500);
  };

  // Open Real Camera Capture
  const handleStartCamera = async () => {
    setCameraError('');
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('CAMERA PERMISSION REQUIRED: MediaDevices API unsupported.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      setCameraStream(stream);
      setIsCameraOpen(true);

      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 150);
    } catch (err: any) {
      console.error('[Evidence] Camera capture error:', err);
      setIsCameraOpen(true);
      setCameraError('CAMERA PERMISSION REQUIRED. Please enable camera access in your browser settings.');
    }
  };

  const handleCaptureSnapshot = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(async (blob) => {
      if (blob) {
        showToast('Computing SHA-256 hash and uploading snapshot...', 'info');
        const gps = locationService.getCurrentLocation();
        const uploaded = await evidenceService.uploadRealEvidence(
          blob,
          'photo',
          'Live Camera Snapshot',
          {
            latitude: gps?.latitude ?? null,
            longitude: gps?.longitude ?? null,
            accuracy: gps?.accuracy ?? null,
          }
        );

        if (uploaded) {
          setEvidenceList((prev) => [uploaded, ...prev]);
          showToast('✓ Snapshot saved to tamper-evident vault. SHA-256 verified.', 'success');
        } else {
          showToast('Failed to upload snapshot to backend vault.', 'error');
        }
      }
      handleCloseCamera();
    }, 'image/jpeg', 0.92);
  };

  const handleCloseCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    setIsCameraOpen(false);
    setCameraError('');
  };

  // Open Real Microphone Audio Recording
  const handleStartAudioModal = () => {
    setAudioErrorMsg('');
    setIsAudioModalOpen(true);
    startRealAudioRecording();
  };

  const startRealAudioRecording = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setAudioErrorMsg('MICROPHONE PERMISSION REQUIRED: Web Audio Recording unsupported.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setAudioStream(stream);
      audioChunksRef.current = [];

      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        if (audioBlob.size === 0) {
          showToast('Recording was empty. No evidence created.', 'info');
          return;
        }

        showToast('Encrypting audio clip and generating SHA-256 hash...', 'info');
        const gps = locationService.getCurrentLocation();
        const uploaded = await evidenceService.uploadRealEvidence(
          audioBlob,
          'audio',
          'Live Microphone Audio Clip',
          {
            durationSec: recordingSeconds,
            latitude: gps?.latitude ?? null,
            longitude: gps?.longitude ?? null,
            accuracy: gps?.accuracy ?? null,
          }
        );

        if (uploaded) {
          setEvidenceList((prev) => [uploaded, ...prev]);
          showToast('✓ Audio clip stored with immutable SHA-256 hash.', 'success');
        } else {
          showToast('Failed to upload audio recording to vault.', 'error');
        }

        handleCloseAudio();
      };

      setMediaRecorder(recorder);
      recorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);

      const timer = window.setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
      recordingTimerRef.current = timer;
    } catch (err: any) {
      console.error('[Evidence] Mic error:', err);
      setAudioErrorMsg('MICROPHONE PERMISSION REQUIRED. Please grant microphone access to capture forensic audio.');
    }
  };

  const handleStopAudio = () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };

  const handleCloseAudio = () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (audioStream) {
      audioStream.getTracks().forEach((track) => track.stop());
      setAudioStream(null);
    }
    setIsAudioModalOpen(false);
    setIsRecording(false);
    setRecordingSeconds(0);
    setAudioErrorMsg('');
  };

  // Open Real Metadata Modal
  const handleOpenMetadata = async (item: EvidenceItem) => {
    const meta = await evidenceService.fetchMetadata(item.id);
    setSelectedMetadata(meta || item);
  };

  // --------------------------------------------------------------------------
  // GATE VIEW: Rendered when user has NOT verified their NIRBHAYA Access Key
  // --------------------------------------------------------------------------
  if (!isAuthorized) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center p-4">
        <div className="w-full max-w-lg rounded-3xl bg-navy-900/90 border border-white/10 p-8 sm:p-10 shadow-2xl backdrop-blur-2xl text-center space-y-6 animate-in fade-in duration-300">
          {/* Header Icon */}
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-600/30 to-cyan-500/20 border border-purple-500/40 text-purple-300 shadow-glow-violet mx-auto">
            <Lock className="w-8 h-8 text-cyan-300 animate-pulse" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2">
              <span className="text-xs font-bold uppercase tracking-widest text-purple-400">
                NIRBHAYA AI
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-mono">
                VAULT SECURITY
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              SECURE EVIDENCE ACCESS
            </h2>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Your forensic evidence vault is protected by a separate security credential.
              Enter your one-time NIRBHAYA Access Key to unlock records.
            </p>
          </div>

          {gateError && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2.5 text-left">
              <ShieldAlert className="w-4 h-4 shrink-0 text-red-400" />
              <span>{gateError}</span>
            </div>
          )}

          <form onSubmit={handleVerifyAccessKey} className="space-y-4">
            <div className="text-left space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                🔐 NIRBHAYA Access Key Required
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <KeyRound className="w-4 h-4 text-purple-400" />
                </div>
                <input
                  type="text"
                  value={accessKeyInput}
                  onChange={(e) => setAccessKeyInput(e.target.value.toUpperCase())}
                  placeholder="NIR-XXXX-XXXX-XXXX"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-navy-950/90 border border-white/10 text-cyan-300 font-mono text-sm tracking-wider uppercase focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
                  autoFocus
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isVerifyingKey}
              className="w-full font-bold shadow-glow-violet"
              leftIcon={<FileCheck className="w-4 h-4" />}
            >
              VERIFY ACCESS
            </Button>
          </form>

          <div className="pt-4 border-t border-white/5 text-[11px] text-slate-400 space-y-1">
            <p className="flex items-center justify-center gap-1.5 text-slate-400">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span>Protected by cryptographic server-side authorization</span>
            </p>
            <p className="text-slate-400">
              Key is stored as a salted hash and rate-limited against unauthorized attempts.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // EVIDENCE LOCKER VIEW: Shown when user has verified access key
  // --------------------------------------------------------------------------
  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Security Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              SECURE EVIDENCE LOCKER
            </span>
            <Badge variant="cyan" size="sm" dot>
              Access Verified ✓
            </Badge>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
            Forensic Evidence Vault
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Protected by NIRBHAYA Access Key. Cryptographic SHA-256 integrity hashes & server-side locked storage.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleStartAudioModal}
            leftIcon={<Volume2 className="w-4 h-4 text-purple-400" />}
          >
            Record Audio Clip
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleStartCamera}
            leftIcon={<Camera className="w-4 h-4" />}
          >
            Capture Snapshot
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleLockVault}
            className="border border-white/10 hover:border-red-500/40 hover:text-red-400 text-slate-300 text-xs"
            leftIcon={<LogOut className="w-3.5 h-3.5 text-red-400" />}
          >
            LOCK VAULT
          </Button>
        </div>
      </div>

      {/* Protocol Banner: Truthful Wording */}
      <Card variant="glass" className="p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Shield className="w-4 h-4 text-purple-400" />
            <span>Tamper-evident audit trail & chain of custody</span>
          </h3>
          <span className="text-[10px] text-slate-400 font-mono">Backend Verified</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-center">
          {[
            { step: '1. Evidence Created', sub: 'Real sensor capture' },
            { step: '2. Metadata Attached', sub: 'GPS & device logged' },
            { step: '3. SHA-256 Generated', sub: 'Cryptographic seal' },
            { step: '4. Evidence Stored', sub: 'Dedicated user directory' },
            { step: '5. Access Logged', sub: 'Tamper-evident audit trail' },
          ].map((s, idx) => (
            <div key={idx} className="p-3 rounded-xl bg-navy-950/60 border border-white/5 space-y-1">
              <span className="text-xs font-bold text-white block">{s.step}</span>
              <span className="text-[10px] text-slate-400 block">{s.sub}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Evidence Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoadingList ? (
          <div className="col-span-full p-12 text-center rounded-2xl bg-navy-950/40 border border-white/5 space-y-3">
            <RotateCw className="w-8 h-8 text-purple-400 animate-spin mx-auto" />
            <p className="text-xs text-slate-300 font-mono">Loading encrypted evidence records from vault...</p>
          </div>
        ) : evidenceList.length === 0 ? (
          <div className="col-span-full p-12 text-center rounded-2xl bg-navy-950/40 border border-white/5 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-navy-900 border border-white/10 flex items-center justify-center text-slate-400 mx-auto">
              <Shield className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-white">NO EVIDENCE CAPTURED</h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              No audio recordings or camera snapshots have been uploaded yet. Use the "Record Audio Clip" or "Capture Snapshot" buttons above to create tamper-evident SHA-256 forensic evidence.
            </p>
          </div>
        ) : (
          evidenceList.map((item) => {
            const isAudio = item.type === 'audio';
            const isImage = item.type === 'snapshot' || (item.type as string) === 'photo';

            return (
              <Card key={item.id} variant="glass" className="p-5 flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  {/* Top Badge Row */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
                      {isAudio ? <Volume2 className="w-4 h-4 text-purple-400" /> : <Camera className="w-4 h-4 text-cyan-400" />}
                      {isAudio ? 'AUDIO EVIDENCE' : 'IMAGE EVIDENCE'}
                    </span>
                    <Badge variant={item.isLocked ? 'critical' : 'moderate'} size="sm">
                      {item.isLocked ? 'LOCKED' : 'UNLOCKED'}
                    </Badge>
                  </div>

                  {/* Title & Status */}
                  <div>
                    <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold mb-0.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                      <span>{isAudio ? '● RECORDED' : '● CAPTURED'}</span>
                    </div>
                    <h4 className="text-sm sm:text-base font-bold text-white truncate" title={item.title}>
                      {item.title}
                    </h4>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{item.timestamp}</span>
                    </div>
                  </div>

                  {/* Image Preview Thumbnail if snapshot */}
                  {isImage && item.fileUrl && (
                    <div
                      className="relative rounded-xl overflow-hidden bg-black/60 border border-white/10 cursor-pointer group h-36 flex items-center justify-center"
                      onClick={() => setViewingImage(item)}
                    >
                      <img
                        src={item.fileUrl}
                        alt={item.title}
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                        onError={(e) => {
                          (e.target as any).style.display = 'none';
                        }}
                      />
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-xs font-semibold text-white">
                        <Eye className="w-4 h-4" />
                        <span>View Full Image</span>
                      </div>
                    </div>
                  )}

                  {/* Metadata Specs Table */}
                  <div className="p-3 rounded-xl bg-navy-950/60 border border-white/5 space-y-1 text-xs">
                    {isAudio && (
                      <div className="flex justify-between text-slate-300">
                        <span className="text-slate-400">Duration:</span>
                        <span className="font-mono">{item.duration}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-slate-300">
                      <span className="text-slate-400">Format:</span>
                      <span className="font-mono text-[11px]">{item.fileType}</span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span className="text-slate-400">File Size:</span>
                      <span className="font-mono">{item.size}</span>
                    </div>
                    {item.userName && (
                      <div className="flex justify-between text-slate-300">
                        <span className="text-slate-400">Captured By:</span>
                        <span className="font-medium text-white">{item.userName}</span>
                      </div>
                    )}
                  </div>

                  {/* GPS Coordinates */}
                  <div className="text-[11px] text-slate-400 flex items-start gap-1 p-2 rounded-lg bg-navy-950/40 border border-white/5">
                    <MapPin className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
                    <span className="truncate">{item.location}</span>
                  </div>

                  {/* SHA-256 Hash Display with Copy Button */}
                  <div className="p-2.5 rounded-lg bg-navy-950/80 border border-white/10 space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span className="font-mono font-bold text-slate-300">SHA-256 HASH</span>
                      <button
                        onClick={() => handleCopyHash(item.sha256Hash)}
                        className="flex items-center gap-1 text-purple-400 hover:text-purple-300 transition-colors"
                        title="Copy SHA-256 Hash"
                      >
                        {copiedHash === item.sha256Hash ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                    <p className="font-mono text-[10px] text-cyan-300 break-all leading-tight">
                      {item.sha256Hash}
                    </p>
                  </div>
                </div>

                {/* Actions: Play / View, Metadata, Lock/Unlock, Download, Delete */}
                <div className="space-y-2 pt-3 border-t border-white/10">
                  <div className="grid grid-cols-2 gap-2">
                    {isAudio ? (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => {
                          setAudioError(false);
                          setPlayingAudio(item);
                        }}
                        leftIcon={<Play className="w-3.5 h-3.5" />}
                      >
                        Play
                      </Button>
                    ) : (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => setViewingImage(item)}
                        leftIcon={<Eye className="w-3.5 h-3.5" />}
                      >
                        View
                      </Button>
                    )}

                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleOpenMetadata(item)}
                      leftIcon={<Info className="w-3.5 h-3.5" />}
                    >
                      Metadata
                    </Button>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <button
                      onClick={() => handleToggleLock(item)}
                      className="flex-1 py-1.5 px-2 rounded-lg bg-navy-900 border border-white/10 hover:border-white/20 text-xs text-slate-300 flex items-center justify-center gap-1.5 transition-colors"
                      title={item.isLocked ? 'Unlock for modification' : 'Lock evidence'}
                    >
                      {item.isLocked ? (
                        <Unlock className="w-3.5 h-3.5 text-amber-400" />
                      ) : (
                        <Lock className="w-3.5 h-3.5 text-emerald-400" />
                      )}
                      <span>{item.isLocked ? 'Unlock' : 'Lock'}</span>
                    </button>

                    <a
                      href={item.downloadUrl}
                      download={`NIRBHAYA_${item.id}_${item.type.toUpperCase()}.${item.fileType?.includes('webm') ? 'webm' : 'jpg'}`}
                      className="p-1.5 rounded-lg bg-navy-900 border border-white/10 hover:border-white/20 text-slate-300 hover:text-white transition-colors"
                      title="Download Certified Evidence File"
                      aria-label="Download Certified Evidence File"
                    >
                      <Download className="w-4 h-4" />
                    </a>

                    <button
                      onClick={() => setItemToDelete(item)}
                      className="p-1.5 rounded-lg bg-navy-900 border border-white/10 hover:border-red-500/30 text-slate-400 hover:text-red-400 transition-colors"
                      title="Delete Evidence"
                      aria-label="Delete Evidence"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* REAL AUDIO PLAYBACK MODAL */}
      {/* ------------------------------------------------------------------ */}
      {playingAudio && (
        <Modal
          isOpen={!!playingAudio}
          onClose={() => setPlayingAudio(null)}
          title={`Audio Evidence: ${playingAudio.title}`}
          maxWidth="md"
        >
          <div className="space-y-5 text-center py-2">
            <div className="h-28 bg-navy-950 rounded-2xl border border-white/10 flex flex-col items-center justify-center p-4">
              <div className="w-12 h-12 rounded-full bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-2">
                <Volume2 className="w-6 h-6 animate-pulse" />
              </div>
              <span className="text-xs font-mono text-cyan-300">
                Playing actual stored file: {playingAudio.id}
              </span>
            </div>

            {audioError ? (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs">
                EVIDENCE FILE UNAVAILABLE
              </div>
            ) : (
              <div className="flex flex-col items-center space-y-3">
                <audio
                  ref={audioPlayerRef}
                  controls
                  autoPlay
                  src={playingAudio.fileUrl}
                  onError={() => setAudioError(true)}
                  className="w-full"
                />
                <span className="text-[11px] text-slate-400">
                  HTTP 206 Streaming directly from authenticated SQLite backend vault
                </span>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* REAL IMAGE VIEWER MODAL */}
      {/* ------------------------------------------------------------------ */}
      {viewingImage && (
        <Modal
          isOpen={!!viewingImage}
          onClose={() => setViewingImage(null)}
          title={`Image Evidence: ${viewingImage.title}`}
          maxWidth="lg"
        >
          <div className="space-y-4">
            <div className="rounded-2xl overflow-hidden bg-black border border-white/10 max-h-[70vh] flex items-center justify-center">
              <img
                src={viewingImage.fileUrl}
                alt={viewingImage.title}
                className="w-full h-auto max-h-[70vh] object-contain"
                onError={() => {
                  showToast('Evidence file unavailable', 'error');
                }}
              />
            </div>

            <div className="p-3 rounded-xl bg-navy-950 border border-white/10 flex items-center justify-between text-xs font-mono text-slate-300">
              <span>SHA-256: {viewingImage.sha256Hash.substring(0, 24)}...</span>
              <span className="text-cyan-400">Authenticated Storage</span>
            </div>
          </div>
        </Modal>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* REAL METADATA & CHAIN OF CUSTODY MODAL */}
      {/* ------------------------------------------------------------------ */}
      {selectedMetadata && (
        <Modal
          isOpen={!!selectedMetadata}
          onClose={() => setSelectedMetadata(null)}
          title={`Evidence Metadata: ${selectedMetadata.title || selectedMetadata.evidenceId}`}
          maxWidth="lg"
        >
          <div className="space-y-4 text-xs text-slate-300">
            <div className="p-3 rounded-xl bg-navy-950 border border-white/10 space-y-1">
              <span className="text-slate-400 font-mono">SHA-256 Cryptographic Integrity Hash:</span>
              <p className="font-mono text-cyan-300 break-all text-[11px]">
                {selectedMetadata.sha256Hash}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-2.5 rounded-xl bg-navy-950/60 border border-white/5 space-y-0.5">
                <span className="text-slate-400">Evidence ID</span>
                <p className="font-mono font-semibold text-white truncate">{selectedMetadata.evidenceId || selectedMetadata.id}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-navy-950/60 border border-white/5 space-y-0.5">
                <span className="text-slate-400">Captured By</span>
                <p className="font-semibold text-white">{selectedMetadata.userName || user?.name || 'Authenticated User'}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-navy-950/60 border border-white/5 space-y-0.5">
                <span className="text-slate-400">Timestamp</span>
                <p className="font-semibold text-white">{selectedMetadata.createdAt || selectedMetadata.timestamp}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-navy-950/60 border border-white/5 space-y-0.5">
                <span className="text-slate-400">MIME Format & Size</span>
                <p className="font-mono font-semibold text-white">
                  {selectedMetadata.mimeType || selectedMetadata.fileType} ({selectedMetadata.fileSize ? `${Math.round(selectedMetadata.fileSize / 1024)} KB` : selectedMetadata.size})
                </p>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-navy-950/60 border border-white/5 space-y-0.5">
              <span className="text-slate-400">GPS Telemetry Coordinates:</span>
              <p className="font-mono text-slate-200">
                {selectedMetadata.latitude !== null && selectedMetadata.latitude !== undefined && selectedMetadata.longitude !== null && selectedMetadata.longitude !== undefined
                  ? `Latitude: ${selectedMetadata.latitude.toFixed(6)}, Longitude: ${selectedMetadata.longitude.toFixed(6)} (Accuracy ±${Math.round(selectedMetadata.gpsAccuracy || 10)}m)`
                  : 'GPS unavailable — permission not granted'}
              </p>
            </div>

            <div>
              <h5 className="font-bold text-white mb-2 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-purple-400" />
                <span>Tamper-Evident Chain of Custody Audit Trail</span>
              </h5>
              <div className="space-y-1.5">
                {(selectedMetadata.chainOfCustody || []).map((stage: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-navy-950/40 border border-white/5"
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="font-medium text-slate-200">{stage.stage}</span>
                    </div>
                    <span className="font-mono text-[10px] text-slate-400">{stage.timestamp}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* REAL CAMERA CAPTURE MODAL */}
      {/* ------------------------------------------------------------------ */}
      {isCameraOpen && (
        <Modal
          isOpen={isCameraOpen}
          onClose={handleCloseCamera}
          title="Live Camera Evidence Capture"
          maxWidth="md"
        >
          <div className="space-y-4 text-center">
            {cameraError ? (
              <div className="p-6 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs space-y-2">
                <AlertTriangle className="w-8 h-8 text-red-400 mx-auto" />
                <h5 className="font-bold text-sm">CAMERA PERMISSION REQUIRED</h5>
                <p className="text-slate-300">{cameraError}</p>
              </div>
            ) : (
              <div className="relative rounded-2xl overflow-hidden bg-black border border-white/10 shadow-2xl">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-72 object-cover"
                />
                <canvas ref={canvasRef} className="hidden" />
                <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-600/80 backdrop-blur-md text-[11px] font-bold text-white uppercase tracking-wider">
                  <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
                  Camera Active
                </div>
              </div>
            )}

            <p className="text-xs text-slate-300">
              Live webcam feed. Capturing will compute an SHA-256 hash and upload to the database vault.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button variant="ghost" size="sm" onClick={handleCloseCamera}>
                Cancel
              </Button>
              {!cameraError && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleCaptureSnapshot}
                  leftIcon={<Camera className="w-4 h-4" />}
                >
                  CAPTURE SNAPSHOT
                </Button>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* REAL MICROPHONE AUDIO RECORDING MODAL */}
      {/* ------------------------------------------------------------------ */}
      {isAudioModalOpen && (
        <Modal
          isOpen={isAudioModalOpen}
          onClose={handleCloseAudio}
          title="Real Microphone Audio Recording"
          maxWidth="md"
        >
          <div className="space-y-6 text-center py-4">
            {audioErrorMsg ? (
              <div className="p-6 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs space-y-2">
                <AlertTriangle className="w-8 h-8 text-red-400 mx-auto" />
                <h5 className="font-bold text-sm">MICROPHONE PERMISSION REQUIRED</h5>
                <p className="text-slate-300">{audioErrorMsg}</p>
              </div>
            ) : (
              <div className="h-36 bg-navy-950 rounded-2xl border border-white/10 flex flex-col items-center justify-center p-4 relative overflow-hidden">
                <div className="relative flex items-center justify-center mb-3">
                  <span className="absolute w-12 h-12 rounded-full bg-red-500/20 animate-ping"></span>
                  <div className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center text-white shadow-lg shadow-red-600/50">
                    <Volume2 className="w-6 h-6 animate-pulse" />
                  </div>
                </div>

                <div className="text-2xl font-mono font-bold text-red-400">
                  {`00:${recordingSeconds.toString().padStart(2, '0')}`}
                </div>

                <span className="text-xs font-bold text-slate-200 mt-1">
                  Recording Telemetry Audio Stream via Browser Microphone...
                </span>
                <span className="text-[10px] text-slate-400">
                  Blob will be created and hashed with SHA-256 upon stopping.
                </span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3">
              <Button variant="ghost" size="sm" onClick={handleCloseAudio}>
                Cancel
              </Button>
              {!audioErrorMsg && isRecording && (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={handleStopAudio}
                  leftIcon={<CheckCircle2 className="w-4 h-4" />}
                >
                  Stop Recording & Upload
                </Button>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!itemToDelete}
        onClose={() => setItemToDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Evidence Record"
        message={
          itemToDelete
            ? `Delete evidence permanently? ID: ${itemToDelete.id} (${itemToDelete.type}). This action cannot be undone.`
            : 'Are you sure you want to delete this evidence record?'
        }
        confirmText="Delete Evidence Permanently"
        isDestructive
      />
    </div>
  );
};
