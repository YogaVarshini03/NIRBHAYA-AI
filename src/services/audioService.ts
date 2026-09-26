/**
 * NIRBHAYA AI — High-Fidelity Audio Feedback & Emergency Siren Service
 * Features:
 * 1. User-gesture safe AudioContext initialization (PointerDown / TouchStart)
 * 2. Continuous audible warning drone during SOS 3-second hold (0.0s)
 * 3. Distinct progression beeps at 1.0s (33%) and 2.0s (66%)
 * 4. Powerful ascending 4-tone emergency activation sound at 3.0s (100%)
 * 5. Instant cancellation & silence upon early release
 * 6. Critical Risk emergency siren with audio state verification
 */

class AudioService {
  private ctx: AudioContext | null = null;
  private isAudioMuted: boolean = false;
  private holdOsc: OscillatorNode | null = null;
  private holdGain: GainNode | null = null;
  private holdActive: boolean = false;
  private criticalTimer: number | null = null;
  private alertAudioElement: HTMLAudioElement | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        const audio = new Audio('/assets/free.jpg.mp3');
        audio.loop = true;
        audio.preload = 'auto';
        this.alertAudioElement = audio;
      } catch (e) {
        console.warn('[AudioService] Could not preload audio asset:', e);
      }
    }
  }

  /**
   * Safe AudioContext initializer directly linked to user interaction
   */
  public async ensureAudioReady(): Promise<boolean> {
    if (typeof window === 'undefined') return false;

    try {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) return false;
        this.ctx = new AudioCtx();
      }

      if (this.ctx.state === 'suspended') {
        await this.ctx.resume();
      }

      return this.ctx.state === 'running';
    } catch (err) {
      console.warn('[AudioService] AudioContext resume failed:', err);
      return false;
    }
  }

  public getAudioStatus(): 'READY' | 'BLOCKED' | 'FAILED' {
    if (typeof window === 'undefined') return 'FAILED';
    if (!this.ctx) return 'BLOCKED';
    if (this.ctx.state === 'running') return 'READY';
    if (this.ctx.state === 'suspended') return 'BLOCKED';
    return 'FAILED';
  }

  // --- SOS 3-Second Hold Audio Feedback ---

  /**
   * Starts audible hold warning drone immediately at 0.0s
   */
  public async startSosHoldFeedback(): Promise<void> {
    if (this.isAudioMuted) return;
    this.holdActive = true;

    await this.ensureAudioReady();
    if (!this.ctx || this.ctx.state !== 'running') return;

    try {
      // Stop previous hold oscillator if any
      this.stopHoldDrone();

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      // Continuous warning tone at 540Hz
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(540, now);

      // Audible gain ramp (0 -> 0.28)
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.28, now + 0.04);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      this.holdOsc = osc;
      this.holdGain = gain;

      // Initial tactile vibration
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(50);
      }
    } catch (e) {
      console.warn('[AudioService] Failed to start SOS hold drone:', e);
    }
  }

  /**
   * Confirmation beep at 1s (33%) and 2s (66%)
   */
  public playHoldBeep(step: 1 | 2): void {
    if (this.isAudioMuted || !this.holdActive) return;
    if (!this.ctx || this.ctx.state !== 'running') return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      // 1s -> 720Hz; 2s -> 920Hz
      const freq = step === 1 ? 720 : 920;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.35, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.2);

      // Pitch bump on the hold drone to indicate rising intensity
      if (this.holdOsc) {
        this.holdOsc.frequency.setValueAtTime(540 + step * 80, now);
      }

      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(60 + step * 30);
      }
    } catch (e) {
      console.warn('[AudioService] Hold beep error:', e);
    }
  }

  /**
   * Immediately stops hold tone upon early release (1s or 2s)
   */
  public stopSosHoldFeedback(): void {
    this.holdActive = false;
    this.stopHoldDrone();
  }

  private stopHoldDrone(): void {
    if (this.holdGain && this.ctx) {
      try {
        const now = this.ctx.currentTime;
        this.holdGain.gain.setValueAtTime(this.holdGain.gain.value, now);
        this.holdGain.gain.linearRampToValueAtTime(0.0001, now + 0.03);
      } catch {}
    }
    if (this.holdOsc) {
      try {
        this.holdOsc.stop();
        this.holdOsc.disconnect();
      } catch {}
      this.holdOsc = null;
    }
    this.holdGain = null;
  }

  /**
   * Loud ascending activation sound played at 3.0s (100%)
   */
  public playSosActivatedSound(): void {
    this.stopHoldDrone();
    this.holdActive = false;

    if (!this.ctx || this.ctx.state !== 'running') {
      this.ensureAudioReady().then(() => this.synthesizeSosActivation());
      return;
    }
    this.synthesizeSosActivation();
  }

  private synthesizeSosActivation(): void {
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      // Ascending triumphant emergency chime
      const notes = [600, 850, 1150, 1500];

      notes.forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);

        gain.gain.setValueAtTime(0.001, now + idx * 0.08);
        gain.gain.linearRampToValueAtTime(0.42, now + idx * 0.08 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.22);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.24);
      });

      // Powerful haptic pulse
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([100, 50, 100, 50, 350]);
      }
    } catch (e) {
      console.warn('[AudioService] Activation chime error:', e);
    }
  }

  // --- Critical Risk Warning Siren ---

  public async startCriticalRiskWarning(forceMuted?: boolean): Promise<{ audioBlocked: boolean }> {
    if (forceMuted !== undefined) {
      this.isAudioMuted = forceMuted;
    }
    if (this.criticalTimer) return { audioBlocked: false };

    const ready = await this.ensureAudioReady();
    if (!ready || this.isAudioMuted) {
      return { audioBlocked: !ready };
    }

    let high = true;
    const pulse = () => {
      if (this.isAudioMuted || !this.ctx || this.ctx.state !== 'running') return;
      try {
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(high ? 880 : 660, now);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.25, now + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.36);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.38);

        high = !high;
      } catch {}
    };

    pulse();
    this.criticalTimer = window.setInterval(pulse, 420);
    return { audioBlocked: false };
  }

  public stopCriticalRiskWarning(): void {
    if (this.criticalTimer) {
      clearInterval(this.criticalTimer);
      this.criticalTimer = null;
    }
    if (this.alertAudioElement) {
      try {
        this.alertAudioElement.pause();
        this.alertAudioElement.currentTime = 0;
      } catch {}
    }
  }

  public setMuted(muted: boolean): void {
    this.isAudioMuted = muted;
    if (muted) {
      this.stopSosHoldFeedback();
      this.stopCriticalRiskWarning();
    }
  }

  public isMuted(): boolean {
    return this.isAudioMuted;
  }
}

export const audioService = new AudioService();
