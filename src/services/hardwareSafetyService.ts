/**
 * NIRBHAYA AI — Hardware Safety & Actuator Controller
 * Provides real working device actuators:
 * 1. High-Decibel Web Audio Synthesized Siren (Wailing Dual-Tone Emergency Siren)
 * 2. Hardware Camera Flashlight / Torch Strobe (via MediaStream Track constraints)
 * 3. Screen High-Intensity Strobe Flasher (fallback & visual defense)
 * 4. Haptic Distress Vibration (Morse SOS: ... --- ...)
 */

export type HardwareSafetyListener = (state: {
  isSirenActive: boolean;
  isStrobeActive: boolean;
  isScreenStrobeActive: boolean;
  torchSupported: boolean;
  audioReady: boolean;
}) => void;

class HardwareSafetyService {
  private audioCtx: AudioContext | null = null;
  private sirenOsc1: OscillatorNode | null = null;
  private sirenOsc2: OscillatorNode | null = null;
  private sirenGain: GainNode | null = null;
  private sirenInterval: number | null = null;
  private isSirenActive: boolean = false;

  private videoTrack: MediaStreamTrack | null = null;
  private mediaStream: MediaStream | null = null;
  private torchInterval: number | null = null;
  private isTorchOn: boolean = false;
  private isStrobeActive: boolean = false;
  private torchSupported: boolean = false;

  private isScreenStrobeActive: boolean = false;
  private screenStrobeInterval: number | null = null;

  private listeners: Set<HardwareSafetyListener> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      this.checkTorchSupport();
    }
  }

  public subscribe(listener: HardwareSafetyListener): () => void {
    this.listeners.add(listener);
    this.notify();
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    const state = {
      isSirenActive: this.isSirenActive,
      isStrobeActive: this.isStrobeActive,
      isScreenStrobeActive: this.isScreenStrobeActive,
      torchSupported: this.torchSupported,
      audioReady: this.audioCtx?.state === 'running',
    };
    this.listeners.forEach((fn) => fn(state));
  }

  private async ensureAudioContext(): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    try {
      if (!this.audioCtx) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) return false;
        this.audioCtx = new AudioCtx();
      }
      if (this.audioCtx.state === 'suspended') {
        await this.audioCtx.resume();
      }
      return this.audioCtx.state === 'running';
    } catch (e) {
      console.warn('[HardwareSafety] Audio context error:', e);
      return false;
    }
  }

  // ==========================================
  // 1. HIGH-DECIBEL EMERGENCY POLICE SIREN
  // ==========================================
  public async startSiren(volume: number = 0.85): Promise<boolean> {
    if (this.isSirenActive) return true;

    const ready = await this.ensureAudioContext();
    if (!ready || !this.audioCtx) return false;

    try {
      this.stopSiren();

      const now = this.audioCtx.currentTime;
      const osc1 = this.audioCtx.createOscillator();
      const osc2 = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc1.type = 'sawtooth';
      osc2.type = 'sine';

      // Modulating emergency police wail (650Hz to 1150Hz)
      osc1.frequency.setValueAtTime(650, now);
      osc2.frequency.setValueAtTime(655, now);

      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(Math.min(volume, 1.0), now + 0.1);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc1.start(now);
      osc2.start(now);

      this.sirenOsc1 = osc1;
      this.sirenOsc2 = osc2;
      this.sirenGain = gain;
      this.isSirenActive = true;

      // Frequency sweeping lfo
      let sweepingUp = true;
      this.sirenInterval = window.setInterval(() => {
        if (!this.audioCtx || !this.isSirenActive || !this.sirenOsc1 || !this.sirenOsc2) return;
        const t = this.audioCtx.currentTime;
        const targetFreq = sweepingUp ? 1200 : 650;
        this.sirenOsc1.frequency.cancelScheduledValues(t);
        this.sirenOsc2.frequency.cancelScheduledValues(t);
        this.sirenOsc1.frequency.exponentialRampToValueAtTime(targetFreq, t + 0.65);
        this.sirenOsc2.frequency.exponentialRampToValueAtTime(targetFreq + 5, t + 0.65);
        sweepingUp = !sweepingUp;
      }, 700);

      this.triggerHapticSos();
      this.notify();
      return true;
    } catch (err) {
      console.warn('[HardwareSafety] Siren start failed:', err);
      return false;
    }
  }

  public stopSiren(): void {
    if (this.sirenInterval) {
      clearInterval(this.sirenInterval);
      this.sirenInterval = null;
    }

    if (this.sirenGain && this.audioCtx) {
      try {
        const now = this.audioCtx.currentTime;
        this.sirenGain.gain.setValueAtTime(this.sirenGain.gain.value, now);
        this.sirenGain.gain.linearRampToValueAtTime(0.0001, now + 0.08);
      } catch {}
    }

    setTimeout(() => {
      if (this.sirenOsc1) {
        try {
          this.sirenOsc1.stop();
          this.sirenOsc1.disconnect();
        } catch {}
        this.sirenOsc1 = null;
      }
      if (this.sirenOsc2) {
        try {
          this.sirenOsc2.stop();
          this.sirenOsc2.disconnect();
        } catch {}
        this.sirenOsc2 = null;
      }
      this.sirenGain = null;
    }, 100);

    this.isSirenActive = false;
    this.notify();
  }

  public toggleSiren(): Promise<boolean> | void {
    if (this.isSirenActive) {
      this.stopSiren();
      return;
    }
    return this.startSiren();
  }

  // ==========================================
  // 2. HARDWARE TORCH / CAMERA FLASHLIGHT STROBE
  // ==========================================
  private async checkTorchSupport(): Promise<boolean> {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      this.torchSupported = false;
      return false;
    }
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const hasCamera = devices.some((d) => d.kind === 'videoinput');
      this.torchSupported = hasCamera;
      return hasCamera;
    } catch {
      this.torchSupported = false;
      return false;
    }
  }

  public async startStrobe(): Promise<boolean> {
    if (this.isStrobeActive) return true;

    this.isStrobeActive = true;
    this.isScreenStrobeActive = true; // simultaneous screen strobe for 360-degree visibility
    this.notify();

    try {
      if (navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
        });
        this.mediaStream = stream;
        const track = stream.getVideoTracks()[0];
        this.videoTrack = track;

        // Check if torch constraint is supported
        const capabilities = (track.getCapabilities && (track.getCapabilities() as any)) || {};
        if (capabilities.torch) {
          this.torchSupported = true;
          this.torchInterval = window.setInterval(async () => {
            if (!this.videoTrack || !this.isStrobeActive) return;
            try {
              this.isTorchOn = !this.isTorchOn;
              await (this.videoTrack.applyConstraints as any)({
                advanced: [{ torch: this.isTorchOn }],
              });
            } catch {}
          }, 150); // Rapid 6.6Hz emergency strobe
        }
      }
    } catch (e) {
      console.warn('[HardwareSafety] Camera torch not available, relying on screen strobe:', e);
    }

    return true;
  }

  public stopStrobe(): void {
    if (this.torchInterval) {
      clearInterval(this.torchInterval);
      this.torchInterval = null;
    }

    if (this.videoTrack) {
      try {
        if (this.isTorchOn) {
          (this.videoTrack.applyConstraints as any)({
            advanced: [{ torch: false }],
          }).catch(() => {});
        }
        this.videoTrack.stop();
      } catch {}
      this.videoTrack = null;
    }

    if (this.mediaStream) {
      try {
        this.mediaStream.getTracks().forEach((t) => t.stop());
      } catch {}
      this.mediaStream = null;
    }

    this.isTorchOn = false;
    this.isStrobeActive = false;
    this.isScreenStrobeActive = false;
    this.notify();
  }

  public toggleStrobe(): void {
    if (this.isStrobeActive || this.isScreenStrobeActive) {
      this.stopStrobe();
    } else {
      this.startStrobe();
    }
  }

  // ==========================================
  // 3. HAPTIC SOS DISTRESS VIBRATION
  // ==========================================
  public triggerHapticSos(): void {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      // Morse S-O-S: ... --- ...
      navigator.vibrate([
        100, 80, 100, 80, 100, // S (...)
        200, // pause
        300, 80, 300, 80, 300, // O (---)
        200, // pause
        100, 80, 100, 80, 100, // S (...)
      ]);
    }
  }

  public stopAll(): void {
    this.stopSiren();
    this.stopStrobe();
  }

  public getState() {
    return {
      isSirenActive: this.isSirenActive,
      isStrobeActive: this.isStrobeActive,
      isScreenStrobeActive: this.isScreenStrobeActive,
      torchSupported: this.torchSupported,
      audioReady: this.audioCtx?.state === 'running',
    };
  }
}

export const hardwareSafetyService = new HardwareSafetyService();
