/**
 * NIRBHAYA AI — High-Fidelity Audio Feedback & Emergency Siren Service
 * Features:
 * 1. Zero-latency Web Audio API synthesis for SOS 3-second hold beeps (0s, 1s, 2s)
 * 2. Strong ascending emergency activation chime (at 3.0s)
 * 3. Proactive Critical Risk Alert Siren & free.jpg.mp3 audio playback
 * 4. Cancellation & Mute controls with mobile haptics
 */

class AudioService {
  private ctx: AudioContext | null = null;
  private isAudioMuted: boolean = false;
  private criticalLoopTimer: number | null = null;
  private holdSoundActive: boolean = false;
  private alertAudioElement: HTMLAudioElement | null = null;

  constructor() {
    // Attempt lazy creation of HTMLAudioElement for free.jpg.mp3 asset
    if (typeof window !== 'undefined') {
      try {
        const audio = new Audio('/assets/free.jpg.mp3');
        audio.loop = true;
        audio.preload = 'auto';
        this.alertAudioElement = audio;
      } catch (e) {
        console.warn('[AudioService] Could not preload asset audio:', e);
      }
    }
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  // --- SOS 3-Second Hold Audio Feedback ---

  /**
   * Play a clean, focused alert tone during manual SOS hold
   * @param second 0 for initial press, 1 for 1s (33%), 2 for 2s (66%)
   */
  public playHoldBeep(second: number = 0): void {
    if (this.isAudioMuted) return;

    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const freqs = [560, 720, 920];
      const freq = freqs[Math.min(second, freqs.length - 1)];

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      // Smooth attack & decay to prevent clicking
      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.16);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.18);

      // Mobile haptic pulse if supported
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(35 + second * 20);
      }
    } catch (e) {
      console.warn('[AudioService] Hold beep error:', e);
    }
  }

  public startSosHoldFeedback(): void {
    this.holdSoundActive = true;
    this.playHoldBeep(0);
  }

  public stopSosHoldFeedback(): void {
    this.holdSoundActive = false;
  }

  public isHoldActive(): boolean {
    return this.holdSoundActive;
  }

  /**
   * Strong Emergency Activation Sound (At exactly 3.0s)
   */
  public playSosActivatedSound(): void {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const notes = [600, 850, 1150, 1500];

      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.09);

        gain.gain.setValueAtTime(0.001, now + idx * 0.09);
        gain.gain.exponentialRampToValueAtTime(0.35, now + idx * 0.09 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.09 + 0.18);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.09);
        osc.stop(now + idx * 0.09 + 0.2);
      });

      // Long urgent haptic pattern
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([100, 50, 100, 50, 300]);
      }
    } catch (e) {
      console.warn('[AudioService] Activation sound error:', e);
    }
  }

  // --- Critical Risk Warning Siren ---

  /**
   * Start pulsing critical risk warning sound (Risk >= 81)
   */
  public startCriticalRiskWarning(forceMuted?: boolean): void {
    if (forceMuted !== undefined) {
      this.isAudioMuted = forceMuted;
    }
    if (this.criticalLoopTimer) return; // already active

    // Attempt to play the free.jpg.mp3 audio track
    if (!this.isAudioMuted && this.alertAudioElement) {
      this.alertAudioElement.currentTime = 0;
      this.alertAudioElement.play().catch(() => {
        // Autoplay may block if no interaction occurred yet; Web Audio will pulse when user clicks
      });
    }

    let toggle = false;
    const pulseSiren = () => {
      if (this.isAudioMuted) return;
      try {
        const ctx = this.getAudioContext();
        if (!ctx) return;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(toggle ? 880 : 660, ctx.currentTime);

        gain.gain.setValueAtTime(0.001, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.38);

        toggle = !toggle;
      } catch (e) {
        // Ignore audio errors
      }
    };

    pulseSiren();
    this.criticalLoopTimer = window.setInterval(pulseSiren, 450);
  }

  /**
   * Stop critical risk warning sound immediately
   */
  public stopCriticalRiskWarning(): void {
    if (this.criticalLoopTimer) {
      clearInterval(this.criticalLoopTimer);
      this.criticalLoopTimer = null;
    }
    if (this.alertAudioElement) {
      try {
        this.alertAudioElement.pause();
        this.alertAudioElement.currentTime = 0;
      } catch (e) {}
    }
  }

  public setMuted(muted: boolean): void {
    this.isAudioMuted = muted;
    if (muted && this.alertAudioElement) {
      try {
        this.alertAudioElement.pause();
      } catch (e) {}
    }
  }

  public isMuted(): boolean {
    return this.isAudioMuted;
  }

  public toggleMute(): boolean {
    this.setMuted(!this.isAudioMuted);
    return this.isAudioMuted;
  }
}

export const audioService = new AudioService();
