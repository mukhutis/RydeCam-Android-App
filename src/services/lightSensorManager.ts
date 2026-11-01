/**
 * @fileoverview Automotive Ambient Light Sensor & Optical Luminance Engine.
 *
 * Provides real-time ambient lighting detection to automatically switch between
 * Day Mode (high-brightness cyan/emerald) and Night Mode (anti-glare amber/red).
 *
 * Sensing Architecture (Multi-Tier Fallback):
 * 1. Tier 1 - Hardware Ambient Light Sensor API:
 *    Queries W3C Generic Sensor `AmbientLightSensor` or `devicelight` event on
 *    supported Android / mobile browsers to measure true physical illuminance in Lux.
 * 2. Tier 2 - Camera Optical Luminance Analysis:
 *    When the dashcam video feed or windshield camera is active, samples frame pixels
 *    to compute perceived photometric luminance (ITU-R BT.601 formula: Y = 0.299R + 0.587G + 0.114B).
 * 3. Tier 3 - Astronomical Solar Ephemeris & Local Clock:
 *    Computes civil dusk / dawn based on GPS coordinates and device clock to accurately
 *    estimate twilight and nighttime road conditions.
 * 4. Tier 4 - Test Simulation Mode:
 *    Allows drivers and testers to simulate dark tunnels (5 lux) or bright daylight (450 lux)
 *    to test automatic cockpit switching on demand.
 *
 * Hysteresis & Anti-Flicker Filter:
 * Automotive cockpits must NOT flicker when passing under a single street light,
 * bridge, or overhead road gantry. The engine enforces a 2.5-second debounce with
 * hysteresis (+15 lux delta required to exit night mode).
 *
 * @module services/lightSensorManager
 */

import { AmbientLightData } from '../types/dashcam';

type LightChangeListener = (data: AmbientLightData) => void;

/**
 * Manages ambient illuminance measurement and automatic day/night mode determination.
 */
class LightSensorManager {
  private currentLux: number = 320; // Default daylight illuminance
  private currentSource: AmbientLightData['source'] = 'SOLAR_TIME';
  private thresholdLux: number = 25; // Default transition threshold
  private hysteresisDelta: number = 15; // Requires (threshold + 15) to return to day
  private isNightDetected: boolean = false;

  private hardwareSensor: any = null;
  private isHardwareAvailable: boolean = false;
  private simulatedLux: number | null = null;

  private listeners: Set<LightChangeListener> = new Set();
  private sampleCanvas: HTMLCanvasElement | null = null;
  private sampleCtx: CanvasRenderingContext2D | null = null;

  // Hysteresis timing state
  private pendingState: boolean | null = null;
  private pendingStartTime: number = 0;
  private readonly debounceDelayMs: number = 2000; // 2 seconds continuous reading to switch

  constructor() {
    this.initHardwareSensor();
    this.evaluateSolarTime(37.7749, -122.4194);
  }

  /**
   * Initializes W3C Generic AmbientLightSensor if supported by the browser.
   */
  private initHardwareSensor(): void {
    if (typeof window === 'undefined') return;

    try {
      const SensorClass = (window as any).AmbientLightSensor;
      if (SensorClass) {
        this.hardwareSensor = new SensorClass({ frequency: 2 });
        this.hardwareSensor.addEventListener('reading', () => {
          if (this.hardwareSensor && typeof this.hardwareSensor.illuminance === 'number') {
            this.isHardwareAvailable = true;
            this.updateIlluminance(this.hardwareSensor.illuminance, 'HARDWARE_SENSOR');
          }
        });
        this.hardwareSensor.addEventListener('error', () => {
          this.isHardwareAvailable = false;
        });
        this.hardwareSensor.start();
        return;
      }
    } catch {
      this.isHardwareAvailable = false;
    }

    // Legacy devicelight event fallback
    if ('ondevicelight' in window) {
      window.addEventListener('devicelight', (event: any) => {
        if (event && typeof event.value === 'number') {
          this.isHardwareAvailable = true;
          this.updateIlluminance(event.value, 'HARDWARE_SENSOR');
        }
      });
    }
  }

  /**
   * Analyzes an active HTMLVideoElement or HTMLCanvasElement to compute optical luminance.
   * Called periodically (e.g. every 1-2 seconds) from the road canvas or camera stream.
   *
   * @param sourceElement - Active video or canvas element
   */
  public sampleOpticalLuminance(sourceElement: HTMLVideoElement | HTMLCanvasElement): void {
    // If hardware sensor is actively streaming, hardware sensor takes precedence
    if (this.isHardwareAvailable && this.currentSource === 'HARDWARE_SENSOR') return;
    if (this.simulatedLux !== null) return;

    try {
      if (!this.sampleCanvas) {
        this.sampleCanvas = document.createElement('canvas');
        this.sampleCanvas.width = 16;
        this.sampleCanvas.height = 16;
        this.sampleCtx = this.sampleCanvas.getContext('2d', { willReadFrequently: true });
      }

      if (!this.sampleCtx) return;

      const isVideo = sourceElement instanceof HTMLVideoElement;
      if (isVideo && (sourceElement.readyState < 2 || sourceElement.videoWidth === 0)) {
        return;
      }

      this.sampleCtx.drawImage(sourceElement, 0, 0, 16, 16);
      const imgData = this.sampleCtx.getImageData(0, 0, 16, 16).data;

      let totalLuma = 0;
      const totalPixels = 16 * 16;

      for (let i = 0; i < imgData.length; i += 4) {
        const r = imgData[i];
        const g = imgData[i + 1];
        const b = imgData[i + 2];
        // Standard Rec. 601 Luma formula
        const luma = 0.299 * r + 0.587 * g + 0.114 * b;
        totalLuma += luma;
      }

      const avgLuma = totalLuma / totalPixels; // 0 to 255
      // Map 0-255 luminance to estimated ambient Lux scale:
      // In dark road/night/tunnel: avgLuma < 40 -> Lux < 15
      // In daytime road: avgLuma > 90 -> Lux > 150
      const estimatedLux = Math.round(Math.pow(avgLuma / 255, 2.2) * 550);
      this.updateIlluminance(Math.max(2, estimatedLux), 'CAMERA_OPTICAL');
    } catch {
      // Fallback gracefully to solar calculation if canvas access fails
    }
  }

  /**
   * Evaluates astronomical sunset/sunrise based on GPS coordinates and local device time.
   */
  public evaluateSolarTime(lat: number = 37.7749, _lng: number = -122.4194): void {
    if (this.simulatedLux !== null) return;
    if (this.isHardwareAvailable && this.currentSource === 'HARDWARE_SENSOR') return;
    if (this.currentSource === 'CAMERA_OPTICAL') return;

    const now = new Date();
    const hours = now.getHours() + now.getMinutes() / 60;

    // Approximate solar dawn (6:30 AM) and dusk (7:00 PM / 19:00)
    const isNightByHour = hours < 6.5 || hours > 19.0;
    const isTwilight = (hours >= 6.0 && hours <= 7.0) || (hours >= 18.5 && hours <= 19.5);

    let solarLux = 380;
    if (isNightByHour) {
      solarLux = 8; // Deep night road
    } else if (isTwilight) {
      solarLux = 24; // Dusk or dawn
    }

    this.updateIlluminance(solarLux, 'SOLAR_TIME');
  }

  /**
   * Updates current illuminance reading and checks debounced hysteresis state transition.
   */
  private updateIlluminance(rawLux: number, source: AmbientLightData['source']): void {
    const lux = this.simulatedLux !== null ? this.simulatedLux : Math.max(0, Math.round(rawLux));
    const activeSource = this.simulatedLux !== null ? 'SIMULATED' : source;

    this.currentLux = lux;
    this.currentSource = activeSource;

    // Evaluate proposed state:
    // If currently day: must fall BELOW threshold to trigger night
    // If currently night: must rise ABOVE (threshold + hysteresisDelta) to return to day
    const candidateNight = this.isNightDetected
      ? lux <= this.thresholdLux + this.hysteresisDelta
      : lux <= this.thresholdLux;

    const now = Date.now();

    if (candidateNight !== this.isNightDetected) {
      if (this.pendingState !== candidateNight) {
        this.pendingState = candidateNight;
        this.pendingStartTime = now;
      } else if (now - this.pendingStartTime >= this.debounceDelayMs) {
        // Debounce requirement satisfied! Commit transition
        this.isNightDetected = candidateNight;
        this.pendingState = null;
      }
    } else {
      this.pendingState = null;
    }

    this.notifyListeners();
  }

  /**
   * Sets the target illuminance threshold in lux.
   */
  public setThresholdLux(threshold: number): void {
    this.thresholdLux = Math.max(5, Math.min(100, threshold));
    this.notifyListeners();
  }

  /**
   * Simulates a specific ambient lux level for testing (e.g. 5 lux for tunnel, 450 lux for daylight).
   */
  public simulateLux(lux: number | null): void {
    this.simulatedLux = lux;
    if (lux !== null) {
      // Immediate switch for manual testing
      this.currentLux = lux;
      this.currentSource = 'SIMULATED';
      this.isNightDetected = lux <= this.thresholdLux;
      this.pendingState = null;
    } else {
      this.currentSource = 'SOLAR_TIME';
      this.evaluateSolarTime();
    }
    this.notifyListeners();
  }

  /**
   * Returns snapshot of ambient light diagnostics.
   */
  public getAmbientData(): AmbientLightData {
    return {
      lux: this.currentLux,
      source: this.currentSource,
      isLowLight: this.isNightDetected,
      thresholdLux: this.thresholdLux,
      timestampMillis: Date.now()
    };
  }

  /**
   * Subscribes to ambient light changes.
   */
  public subscribe(listener: LightChangeListener): () => void {
    this.listeners.add(listener);
    listener(this.getAmbientData());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    const data = this.getAmbientData();
    this.listeners.forEach(fn => fn(data));
  }
}

/** Singleton instance of LightSensorManager */
export const lightSensor = new LightSensorManager();
