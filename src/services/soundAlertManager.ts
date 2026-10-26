/**
 * @fileoverview Automotive Chime & Audio Alert Synthesizer.
 *
 * Provides real-time acoustic feedback for driver safety events using the browser
 * Web Audio API. Eliminates reliance on external audio assets (MP3/WAV) to ensure
 * instantaneous zero-latency playback, 100% offline reliability, and zero network overhead.
 *
 * Supported Audio Signals:
 * 1. Overspeed Dual-Tone Chime: A two-stage ascending sequence (880 Hz / A5 -> 1174.66 Hz / D6)
 *    modeled after OEM automotive overspeed warnings (e.g. Tesla, Audi, Genesis).
 *    Includes automated debouncing (minimum 2500ms repeat interval) to prevent auditory fatigue.
 * 2. Traffic Sign Recognition (TSR) Confirmation: A soft 1046.5 Hz (C6) triangle-wave chime
 *    indicating detection of a new regulatory speed limit sign.
 *
 * Audio Graph Topology:
 *   [OscillatorNode] ---> [GainNode (Envelope ADSR)] ---> [MasterGainNode] ---> [AudioDestination]
 *
 * @module services/soundAlertManager
 */

/**
 * Manages procedural synthesis of vehicular alerts and cockpit chimes.
 */
class SoundAlertManager {
  /** Lazy-initialized Web Audio API context */
  private audioCtx: AudioContext | null = null;
  /** Global audio muting toggle */
  private isMuted: boolean = false;
  /** Normalized output volume scale (0.0 to 1.0) */
  private volume: number = 0.6;
  /** Unix timestamp in milliseconds of the last emitted overspeed alert */
  private lastBeepTime: number = 0;
  /** Minimum refractory period between consecutive overspeed warnings in milliseconds */
  private readonly beepIntervalMs: number = 2500;

  /**
   * Lazily provisions and un-suspends the AudioContext following browser autoplay policies.
   *
   * @returns Active AudioContext instance or null in non-browser environments
   */
  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {
        // AudioContext may remain suspended until initial user interaction
      });
    }
    return this.audioCtx;
  }

  /**
   * Updates global chime mute status.
   *
   * @param muted - Whether alert audio should be suppressed
   */
  public setMuted(muted: boolean): void {
    this.isMuted = muted;
  }

  /**
   * Sets master chime playback volume.
   *
   * @param vol - Target volume clamped between 0.0 (silent) and 1.0 (maximum)
   */
  public setVolume(vol: number): void {
    this.volume = Math.max(0, Math.min(1, vol));
  }

  /**
   * Queries whether cockpit chimes are currently muted.
   *
   * @returns Current mute state
   */
  public isSoundMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Synthesizes and plays an automotive dual-tone overspeed warning chime.
   *
   * Frequency Profile:
   * - Stage 1: 880.00 Hz (Musical Pitch A5) for 90ms with smooth exponential attack/decay.
   * - Stage 2: 1174.66 Hz (Musical Pitch D6) for 140ms delivering distinct high-priority urgency.
   *
   * @param force - If true, bypasses the 2500ms debounce interval (useful for manual testing)
   * @returns True if the chime successfully dispatched, false if muted or debounced
   */
  public playOverspeedBeep(force: boolean = false): boolean {
    if (this.isMuted) return false;
    const now = Date.now();
    if (!force && now - this.lastBeepTime < this.beepIntervalMs) {
      return false; // Debounced to prevent continuous harsh ringing
    }
    this.lastBeepTime = now;

    const ctx = this.getContext();
    if (!ctx) return false;

    try {
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(this.volume * 0.45, ctx.currentTime);
      masterGain.connect(ctx.destination);

      const startTime = ctx.currentTime + 0.02;

      // Tone 1: 880 Hz (A5)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, startTime);
      gain1.gain.setValueAtTime(0.001, startTime);
      gain1.gain.exponentialRampToValueAtTime(0.8, startTime + 0.015);
      gain1.gain.exponentialRampToValueAtTime(0.001, startTime + 0.09);
      osc1.connect(gain1);
      gain1.connect(masterGain);
      osc1.start(startTime);
      osc1.stop(startTime + 0.1);

      // Tone 2: 1174.66 Hz (D6) - Higher urgent warning pitch
      const tone2Start = startTime + 0.11;
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1174.66, tone2Start);
      gain2.gain.setValueAtTime(0.001, tone2Start);
      gain2.gain.exponentialRampToValueAtTime(1.0, tone2Start + 0.015);
      gain2.gain.exponentialRampToValueAtTime(0.001, tone2Start + 0.14);
      osc2.connect(gain2);
      gain2.connect(masterGain);
      osc2.start(tone2Start);
      osc2.stop(tone2Start + 0.16);

      return true;
    } catch (e) {
      console.warn('AudioContext playback error', e);
      return false;
    }
  }

  /**
   * Synthesizes and plays a gentle single-tone notification chime (1046.5 Hz / C6)
   * when a new road speed limit sign is optically recognized by the TSR pipeline.
   */
  public playSignDetectedChime(): void {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(this.volume * 0.35, ctx.currentTime);
      masterGain.connect(ctx.destination);

      const startTime = ctx.currentTime + 0.01;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1046.5, startTime); // C6 pitch
      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.exponentialRampToValueAtTime(0.7, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.18);

      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(startTime);
      osc.stop(startTime + 0.2);
    } catch (e) {
      console.warn('Sign chime error', e);
    }
  }
}

/** Singleton instance of SoundAlertManager for application-wide audio feedback */
export const soundAlert = new SoundAlertManager();
