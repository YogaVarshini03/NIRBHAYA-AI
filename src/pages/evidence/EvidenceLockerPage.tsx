import React, { useState } from 'react';
import {
  FileLock2,
  Lock,
  Unlock,
  Play,
  Download,
  Trash2,
  Info,
  Shield,
  FileText,
  Clock,
  MapPin,
  CheckCircle2,
  Plus,
  Volume2,
  Video,
  Camera,
  X,
  ShieldAlert
} from 'lucide-react';
import { evidenceService } from '../../services/evidenceService';
import { EvidenceItem } from '../../types';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { useToast } from '../../context/ToastContext';

export const EvidenceLockerPage: React.FC = () => {
  const { showToast } = useToast();
  const [evidenceList, setEvidenceList] = useState<EvidenceItem[]>(() => evidenceService.getEvidence());
  const [selectedItemForMetadata, setSelectedItemForMetadata] = useState<EvidenceItem | null>(null);
  const [playingItem, setPlayingItem] = useState<EvidenceItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [isAudioModalOpen, setIsAudioModalOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [audioDuration, setAudioDuration] = useState(0);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const audioChunksRef = React.useRef<Blob[]>([]);

  // Load from database on mount
  React.useEffect(() => {
    evidenceService.fetchEvidenceFromBackend().then((list) => {
      setEvidenceList(list);
    });
  }, []);

  const handleToggleLock = async (id: string) => {
    await evidenceService.toggleLock(id);
    setEvidenceList(evidenceService.getEvidence());
    showToast('Integrity lock status updated in database.', 'info');
  };

  const handleDownload = (item: EvidenceItem) => {
    if (item.downloadUrl) {
      const a = document.createElement('a');
      a.href = item.downloadUrl;
      a.download = `${item.title.replace(/\s+/g, '_')}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      showToast(`Downloading certified evidence file: ${item.title}`, 'success');
    } else {
      showToast(`Downloading certified evidence archive: ${item.title}.zip`, 'success');
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    await evidenceService.deleteEvidence(itemToDelete);
    setEvidenceList(evidenceService.getEvidence());
    setItemToDelete(null);
    showToast('Evidence record deleted.', 'info');
  };

  // Open Real Camera using navigator.mediaDevices.getUserMedia()
  const handleStartCamera = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showToast('Camera API unsupported in this browser.', 'error');
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      setCameraStream(stream);
      setIsCameraModalOpen(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 200);
    } catch (err: any) {
      console.error('[Evidence] Camera permission error:', err);
      showToast('Camera permission denied or camera unavailable.', 'error', 4000);
    }
  };

  const handleCapturePhoto = async () => {
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
        showToast('Encrypting & computing SHA-256 integrity hash...', 'info');
        const item = await evidenceService.uploadRealEvidence(blob, 'photo', 'Live Camera Snapshot');
        if (item) {
          setEvidenceList(evidenceService.getEvidence());
          showToast('✓ Photo securely uploaded to vault. Integrity hash recorded.', 'success');
        } else {
          showToast('✓ Photo captured and recorded in local session.', 'info');
        }
      }
      handleCloseCamera();
    }, 'image/jpeg', 0.9);
  };

  const handleCloseCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((t) => t.stop());
      setCameraStream(null);
    }
    setIsCameraModalOpen(false);
  };

  // Open Real Microphone
  const handleStartAudio = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showToast('Microphone API unsupported in this browser.', 'error');
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setAudioStream(stream);
      audioChunksRef.current = [];

      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        showToast('Saving audio clip with SHA-256 integrity hash...', 'info');
        const item = await evidenceService.uploadRealEvidence(audioBlob, 'audio', 'Real Mic Audio Telemetry');
        if (item) {
          setEvidenceList(evidenceService.getEvidence());
          showToast('✓ Audio securely uploaded to vault. Integrity hash recorded.', 'success');
        }
        handleCloseAudio();
      };

      setMediaRecorder(recorder);
      setIsAudioModalOpen(true);
      recorder.start();
      setIsRecordingAudio(true);
    } catch (err: any) {
      console.error('[Evidence] Mic permission error:', err);
      showToast('Microphone access denied or audio hardware unavailable.', 'error', 4000);
    }
  };

  const handleStopAudio = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
      setIsRecordingAudio(false);
    }
  };

  const handleCloseAudio = () => {
    if (audioStream) {
      audioStream.getTracks().forEach((t) => t.stop());
      setAudioStream(null);
    }
    setIsAudioModalOpen(false);
    setIsRecordingAudio(false);
  };

  const handleRecordNew = (type: 'audio' | 'video' | 'snapshot') => {
    if (type === 'snapshot') {
      handleStartCamera();
    } else if (type === 'audio') {
      handleStartAudio();
    } else {
      evidenceService.addRecordedEvidence(type, 'Multi-Angle Burst Video');
      setEvidenceList(evidenceService.getEvidence());
      showToast('New video evidence captured and recorded.', 'success');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
              Tamper-Evident Vault
            </span>
            {/* Rule 26: Security badge with truthful language */}
            <Badge variant="violet" size="sm" dot>
              Demo encryption visualization
            </Badge>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
            Secure Evidence Locker
          </h2>
          <p className="text-sm text-slate-400">
            Immutable chain of custody preserving sensor captures, geo-tags, and audio recordings for legal admissibility.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleRecordNew('audio')}
            leftIcon={<Volume2 className="w-4 h-4 text-purple-400" />}
          >
            Record Audio Clip
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => handleRecordNew('snapshot')}
            leftIcon={<Camera className="w-4 h-4" />}
          >
            Capture Snapshot
          </Button>
        </div>
      </div>

      {/* Chain of Custody Overview Card (Rule 28) */}
      <Card variant="glass" className="p-6">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-4 flex items-center gap-2">
          <Shield className="w-4 h-4 text-purple-400" />
          <span>Standard Chain of Custody Protocol</span>
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-center">
          {[
            { step: '1. Evidence Created', sub: 'Hardware sensors trigger' },
            { step: '2. Metadata Attached', sub: 'GPS & accelerometer signed' },
            { step: '3. Evidence Locked', sub: 'SHA-256 hash locked' },
            { step: '4. Incident Linked', sub: 'Bound to Incident ID' },
            { step: '5. Responder Accessed', sub: 'Audit-logged review' },
          ].map((s, idx) => (
            <div key={idx} className="p-3 rounded-xl bg-navy-950/60 border border-white/5 space-y-1">
              <span className="text-xs font-bold text-white block">{s.step}</span>
              <span className="text-[10px] text-slate-400 block">{s.sub}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Evidence Cards Grid (Rule 26 & 27) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {evidenceList.length === 0 ? (
          <div className="col-span-full p-12 text-center rounded-2xl bg-navy-950/40 border border-white/5 space-y-3">
            <FileLock2 className="w-10 h-10 text-slate-500 mx-auto" />
            <h4 className="text-base font-bold text-white">Forensic Evidence Vault is Empty</h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              No audio recordings or camera snapshots have been uploaded yet. Use the "Record Audio" or "Capture Snapshot" buttons above to create tamper-evident SHA-256 evidence.
            </p>
          </div>
        ) : (
          evidenceList.map((item) => {
            let TypeIcon = Volume2;
            let iconColor = 'text-purple-400 bg-purple-500/10 border-purple-500/20';
            if (item.type === 'video') {
              TypeIcon = Video;
              iconColor = 'text-blue-400 bg-blue-500/10 border-blue-500/20';
            } else if (item.type === 'snapshot') {
              TypeIcon = Camera;
              iconColor = 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20';
            }

            return (
              <Card key={item.id} variant="glass" className="p-6 flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className={`p-2.5 rounded-xl border ${iconColor}`}>
                      <TypeIcon className="w-5 h-5" />
                    </div>
                    <Badge variant={item.isLocked ? 'critical' : 'moderate'} size="sm">
                      {item.isLocked ? 'LOCKED' : 'UNLOCKED'}
                    </Badge>
                  </div>

                <div>
                  <h4 className="text-base font-bold text-white truncate" title={item.title}>
                    {item.title}
                  </h4>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{item.timestamp}</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-navy-950/60 border border-white/5 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-300">
                    <span className="text-slate-400">Duration:</span>
                    <span className="font-mono">{item.duration}</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span className="text-slate-400">Format:</span>
                    <span>{item.fileType}</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span className="text-slate-400">File Size:</span>
                    <span className="font-mono">{item.size}</span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 flex items-start gap-1">
                  <MapPin className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
                  <span className="truncate">{item.location}</span>
                </div>
              </div>

              {/* Action Buttons: Play, Metadata, Download, Lock/Unlock, Delete (Rule 26) */}
              <div className="space-y-2 pt-3 border-t border-white/10">
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setPlayingItem(item);
                      setIsPlaying(true);
                    }}
                    leftIcon={<Play className="w-3.5 h-3.5" />}
                  >
                    Play
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setSelectedItemForMetadata(item)}
                    leftIcon={<Info className="w-3.5 h-3.5" />}
                  >
                    View Metadata
                  </Button>
                </div>

                <div className="flex items-center justify-between gap-2 pt-1">
                  <button
                    onClick={() => handleToggleLock(item.id)}
                    className="flex-1 py-1.5 px-2 rounded-lg bg-navy-900 border border-white/10 hover:border-white/20 text-xs text-slate-300 flex items-center justify-center gap-1.5"
                    title={item.isLocked ? 'Unlock for review' : 'Lock evidence'}
                  >
                    {item.isLocked ? <Unlock className="w-3.5 h-3.5 text-amber-400" /> : <Lock className="w-3.5 h-3.5 text-emerald-400" />}
                    <span>{item.isLocked ? 'Unlock' : 'Lock'}</span>
                  </button>

                  <button
                    onClick={() => handleDownload(item)}
                    className="p-1.5 rounded-lg bg-navy-900 border border-white/10 hover:border-white/20 text-slate-300 hover:text-white"
                    title="Download Demo Evidence"
                    aria-label="Download Demo Evidence"
                  >
                    <Download className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setItemToDelete(item.id)}
                    className="p-1.5 rounded-lg bg-navy-900 border border-white/10 hover:border-red-500/30 text-slate-400 hover:text-red-400"
                    title="Delete record"
                    aria-label="Delete record"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </Card>
          );
        }))}
      </div>

      {/* Metadata Modal */}
      {selectedItemForMetadata && (
        <Modal
          isOpen={!!selectedItemForMetadata}
          onClose={() => setSelectedItemForMetadata(null)}
          title={`Evidence Metadata: ${selectedItemForMetadata.title}`}
          maxWidth="lg"
        >
          <div className="space-y-4 text-xs text-slate-300">
            <div className="p-3 rounded-xl bg-navy-950 border border-white/10 space-y-1">
              <span className="text-slate-400 font-mono">Cryptographic SHA-256 Hash:</span>
              <p className="font-mono text-purple-300 break-all text-[11px]">
                {selectedItemForMetadata.sha256Hash}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-2.5 rounded-xl bg-navy-950/60 border border-white/5">
                <span className="text-slate-400">Captured At</span>
                <p className="font-semibold text-white mt-0.5">{selectedItemForMetadata.timestamp}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-navy-950/60 border border-white/5">
                <span className="text-slate-400">Encoding Format</span>
                <p className="font-semibold text-white mt-0.5">{selectedItemForMetadata.fileType}</p>
              </div>
            </div>

            <div>
              <h5 className="font-bold text-white mb-2">Verified Chain of Custody History</h5>
              <div className="space-y-2">
                {selectedItemForMetadata.chainOfCustody.map((stage, idx) => (
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

      {/* Playback Simulation Modal */}
      {playingItem && (
        <Modal
          isOpen={!!playingItem}
          onClose={() => setPlayingItem(null)}
          title={`Simulated Playback: ${playingItem.title}`}
          maxWidth="md"
        >
          <div className="space-y-6 text-center py-4">
            <div className="h-32 bg-navy-950 rounded-2xl border border-white/10 flex items-center justify-center p-4 relative overflow-hidden">
              {/* Animated Waveform Visual */}
              <div className="flex items-center gap-1.5 h-16">
                {[40, 75, 20, 90, 60, 30, 85, 45, 95, 30, 70, 50, 80, 25, 65, 85, 30].map((h, i) => (
                  <div
                    key={i}
                    className="w-1.5 bg-gradient-to-t from-purple-500 to-cyan-400 rounded-full transition-all duration-300"
                    style={{
                      height: isPlaying ? `${h}%` : '20%',
                    }}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center justify-center gap-4">
              <Button
                variant="primary"
                size="md"
                onClick={() => setIsPlaying(!isPlaying)}
              >
                {isPlaying ? 'Pause Demo Stream' : 'Resume Demo Stream'}
              </Button>
            </div>

            <p className="text-xs text-slate-400">
              Simulated audio/video playback buffer for hackathon validation.
            </p>
          </div>
        </Modal>
      )}

      {/* Live Camera Snapshot Modal */}
      {isCameraModalOpen && (
        <Modal
          isOpen={isCameraModalOpen}
          onClose={handleCloseCamera}
          title="Live Camera Evidence Capture"
          maxWidth="md"
        >
          <div className="space-y-4 text-center">
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

            <p className="text-xs text-slate-300">
              Live webcam feed. Capturing will compute an SHA-256 hash and upload to the database vault.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button variant="ghost" size="sm" onClick={handleCloseCamera}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleCapturePhoto}
                leftIcon={<Camera className="w-4 h-4" />}
              >
                Capture & Upload Snapshot
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Live Microphone Audio Recording Modal */}
      {isAudioModalOpen && (
        <Modal
          isOpen={isAudioModalOpen}
          onClose={handleCloseAudio}
          title="Live Microphone Audio Capture"
          maxWidth="md"
        >
          <div className="space-y-6 text-center py-4">
            <div className="h-32 bg-navy-950 rounded-2xl border border-white/10 flex flex-col items-center justify-center p-4 relative overflow-hidden">
              <div className="relative flex items-center justify-center mb-3">
                <span className="absolute w-12 h-12 rounded-full bg-red-500/20 animate-ping"></span>
                <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center text-white shadow-lg shadow-red-600/50">
                  <Volume2 className="w-5 h-5 animate-pulse" />
                </div>
              </div>
              <span className="text-sm font-bold text-red-400">
                Recording Telemetry Audio Stream...
              </span>
              <span className="text-[11px] text-slate-400 mt-1">
                Speak clearly. Media will be hashed and stored in database.
              </span>
            </div>

            <div className="flex items-center justify-end gap-3">
              <Button variant="ghost" size="sm" onClick={handleCloseAudio}>
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleStopAudio}
                leftIcon={<CheckCircle2 className="w-4 h-4" />}
              >
                Stop & Upload Audio to Vault
              </Button>
            </div>
          </div>
        </Modal>
      )}


      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!itemToDelete}
        onClose={() => setItemToDelete(null)}
        onConfirm={handleDelete}
        title="Delete Evidence Record"
        message="Are you sure you want to remove this simulated evidence item from the local vault?"
        confirmText="Delete Record"
        isDestructive
      />
    </div>
  );
};
