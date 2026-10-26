import React, { useState, useEffect, useRef } from 'react';
import { RoadCanvas } from './components/RoadCanvas';
import { DashcamHUD } from './components/DashcamHUD';
import { GalleryModal } from './components/GalleryModal';
import { SettingsModal } from './components/SettingsModal';
import { PaywallModal } from './components/PaywallModal';
import { CompanionNavModal } from './components/CompanionNavModal';
import { AndroidProjectExplorer } from './components/AndroidProjectExplorer';
import { TestRunnerModal } from './components/TestRunnerModal';
import { webStorage } from './services/storageManager';
import { soundAlert } from './services/soundAlertManager';
import {
  DashcamSettings,
  BillingEntitlements,
  TelemetryData,
  StorageStats,
  DashcamClip,
  SpeedLimitSign
} from './types/dashcam';

/**
 * @fileoverview RydeCam Automotive Dashcam Cockpit Root Application.
 *
 * Coordinates the full automotive dashcam execution loop:
 * 1. Video Pipeline: Live road visualization with highway simulation or physical camera capture.
 * 2. Heads-Up Display (HUD): Dark OLED cockpit instrument cluster showing speed, storage, battery, and incident status.
 * 3. Optical Traffic Sign Recognition (TSR): Automated speed limit detection and audible overspeed warning chimes.
 * 4. G-Sensor & Incident Engine: Continuous acceleration monitoring with automated pre/post-event clip locking.
 * 5. Storage Quota & FIFO Recycler: Circular buffer retention with protected file safeguards.
 * 6. Power Management: Battery status synchronization via Navigator Battery API with 12V automotive power simulation.
 *
 * @module App
 */

/** LocalStorage key for persisting user configuration settings */
const SETTINGS_KEY = 'rydecam_settings_v1';
/** LocalStorage key for persisting the cumulative trip odometer distance */
const TRIP_ODOMETER_KEY = 'rydecam_trip_odometer_v1';

/**
 * Standard factory default cockpit settings for fresh application installations.
 */
const DEFAULT_SETTINGS: DashcamSettings = {
  storageQuotaGb: 16,
  videoResolution: '1080p',
  frontCameraEnabled: false,
  segmentLengthMinutes: 2,
  audioRecordingEnabled: false,
  gpsOverlayEnabled: true,
  speedUnit: 'KMH',
  accidentDetectionEnabled: true,
  accidentSensitivity: 'MEDIUM',
  customGThreshold: 2.5,
  postEventSeconds: 30,
  screenOffBehavior: 'DIM_AFTER_1_MIN',
  companionNavApp: 'google_maps',
  speedLimitAlertEnabled: true,
  speedLimitBeepEnabled: true,
  speedLimitTolerance: 5
};

/**
 * Retrieves persisted cockpit settings from browser LocalStorage with fallback to defaults.
 *
 * @returns Validated DashcamSettings object
 */
function getSavedSettings(): DashcamSettings {
  try {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (saved) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.warn('Could not read settings from storage', e);
  }
  return DEFAULT_SETTINGS;
}

/**
 * Retrieves the persistent cumulative trip odometer reading in kilometers from LocalStorage.
 *
 * @returns Cumulative trip distance in km (defaults to 14.8 km on first boot)
 */
function getSavedTripDistance(): number {
  try {
    const saved = localStorage.getItem(TRIP_ODOMETER_KEY);
    if (saved) {
      const parsed = parseFloat(saved);
      if (!isNaN(parsed) && parsed >= 0) return parsed;
    }
  } catch (e) {
    console.warn('Could not read odometer from storage', e);
  }
  return 14.8; // Realistic initial trip odometer in km
}

/**
 * Root component orchestrating the dashcam recording engine, telemetry loop, and cockpit UI modals.
 */
export default function App() {
  // App state & settings with persistent storage
  const [settings, setSettings] = useState<DashcamSettings>(getSavedSettings);

  const [entitlements, setEntitlements] = useState<BillingEntitlements>({
    isProUnlocked: false,
    canUse64GbQuota: false,
    canUse4kResolution: false,
    canUseFrontCamera: false,
    activePlan: 'NONE'
  });

  // Recording engine state
  const [isRecording, setIsRecording] = useState(true); // Default to active recording on launch like real dashcam
  const [recordingElapsedSec, setRecordingElapsedSec] = useState(84); // Initial realistic running time
  const [clips, setClips] = useState<DashcamClip[]>(webStorage.getClips());
  const [storageStats, setStorageStats] = useState<StorageStats>(webStorage.getStorageStats());

  // Incident & G-sensor state
  const [currentGForce, setCurrentGForce] = useState(1.02);
  const [activeIncidentMessage, setActiveIncidentMessage] = useState<string | null>(null);

  // Traffic Sign Recognition (TSR) & Speed Limit State
  const [detectedSpeedLimit, setDetectedSpeedLimit] = useState<SpeedLimitSign>({
    limitKmh: 60,
    limitMph: 40,
    detectedAtMillis: Date.now(),
    confidencePercent: 98,
    signType: 'STANDARD',
    source: 'OPTICAL_TSR'
  });
  const [tsrDetectionNotice, setTsrDetectionNotice] = useState<string | null>(null);

  // Device Battery & 12V Power Charging State
  const [batteryLevel, setBatteryLevel] = useState(94);
  const [isCharging, setIsCharging] = useState(true);

  // Read real browser Battery API if supported on device
  useEffect(() => {
    let batteryObj: any = null;

    const updateBatteryStatus = () => {
      if (batteryObj) {
        setBatteryLevel(Math.round(batteryObj.level * 100));
        setIsCharging(batteryObj.charging);
      }
    };

    if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        batteryObj = battery;
        updateBatteryStatus();
        battery.addEventListener('chargingchange', updateBatteryStatus);
        battery.addEventListener('levelchange', updateBatteryStatus);
      }).catch(() => {
        // Fall back to automotive 12V power state
      });
    }

    return () => {
      if (batteryObj) {
        batteryObj.removeEventListener('chargingchange', updateBatteryStatus);
        batteryObj.removeEventListener('levelchange', updateBatteryStatus);
      }
    };
  }, []);

  // Battery drain / charge simulation ticker
  useEffect(() => {
    const batteryTimer = setInterval(() => {
      setBatteryLevel(prev => {
        if (isCharging) {
          return Math.min(100, prev + (prev < 100 ? 1 : 0));
        } else {
          return Math.max(5, prev - 1);
        }
      });
    }, 20000);

    return () => clearInterval(batteryTimer);
  }, [isCharging]);

  // GPS Telemetry with persistent trip distance
  const [telemetry, setTelemetry] = useState<TelemetryData>(() => {
    const initialTripKm = getSavedTripDistance();
    return {
      speedKmh: 68.4,
      speedMph: 42.5,
      tripDistanceKm: initialTripKm,
      tripDistanceMiles: initialTripKm * 0.621371,
      latitude: 37.7749,
      longitude: -122.4194,
      altitudeMeters: 24,
      bearingDegrees: 48,
      accuracyMeters: 4.2,
      isGpsLocked: true,
      isSignalStale: false,
      lastUpdateTimestamp: Date.now()
    };
  });

  // Modals state
  const [showGallery, setShowGallery] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [showNavCompanion, setShowNavCompanion] = useState(false);
  const [showProjectExplorer, setShowProjectExplorer] = useState(false);
  const [showTestRunner, setShowTestRunner] = useState(false);

  // Persist settings changes so speed unit, quotas, and preferences survive restart
  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (e) {
      console.warn('Could not persist settings', e);
    }
  }, [settings]);

  // Sync quota changes with webStorage
  useEffect(() => {
    webStorage.setQuotaGb(settings.storageQuotaGb);
    setStorageStats(webStorage.getStorageStats());
    setClips(webStorage.getClips());
  }, [settings.storageQuotaGb]);

  // Continuous recording ticker & segment rotation
  useEffect(() => {
    let interval: any = null;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingElapsedSec(prev => {
          const next = prev + 1;
          const segmentLimitSec = settings.segmentLengthMinutes * 60;

          // Segment rotation boundary!
          if (next % segmentLimitSec === 0) {
            rotateSegment();
          }
          return next;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording, settings.segmentLengthMinutes, settings.videoResolution, telemetry]);

  // Rotates to a new recording segment and writes to storage
  const rotateSegment = () => {
    const now = Date.now();
    const is4k = settings.videoResolution === '4K';
    const duration = settings.segmentLengthMinutes * 60;
    const fileBytes = duration * (is4k ? 6_000_000 : 2_500_000);
    const distanceCoveredKm = parseFloat(((duration * telemetry.speedKmh) / 3600).toFixed(2));

    const newClip: DashcamClip = {
      id: 'clip_' + now,
      fileName: `RYDECAM_${new Date(now).toISOString().replace(/[-:T]/g, '').slice(0, 14)}_${settings.videoResolution}.mp4`,
      startTimeMillis: now - duration * 1000,
      endTimeMillis: now,
      durationSeconds: duration,
      fileSizeBytes: fileBytes,
      resolution: settings.videoResolution,
      cameraLens: settings.frontCameraEnabled ? 'DUAL' : 'BACK',
      isProtected: false,
      averageSpeedKmh: telemetry.speedKmh,
      maxSpeedKmh: telemetry.speedKmh + 4.5,
      distanceCoveredKm,
      latitude: telemetry.latitude,
      longitude: telemetry.longitude,
      hasAudio: settings.audioRecordingEnabled,
      thumbnailColor: '#1e293b'
    };

    webStorage.addClip(newClip);
    setClips(webStorage.getClips());
    setStorageStats(webStorage.getStorageStats());
  };

  // Speedometer driving simulation loop & trip odometer accumulation
  useEffect(() => {
    const speedInterval = setInterval(() => {
      setTelemetry(prev => {
        const noise = (Math.random() - 0.49) * 2.2;
        const targetKmh = Math.min(88, Math.max(48, prev.speedKmh + noise));
        const targetMph = targetKmh * 0.621371;

        // Subtle G-force wobble from normal road surface
        const roadG = 1.0 + (Math.random() - 0.5) * 0.08;
        setCurrentGForce(roadG);

        // Distance accumulated in this 1.2s tick
        const dtHours = 1.2 / 3600;
        const deltaKm = targetKmh * dtHours;
        const nextTripKm = prev.tripDistanceKm + deltaKm;
        const nextTripMiles = nextTripKm * 0.621371;

        // Persist odometer periodically
        try {
          localStorage.setItem(TRIP_ODOMETER_KEY, nextTripKm.toFixed(3));
        } catch {
          // ignore quota storage issues
        }

        return {
          ...prev,
          speedKmh: targetKmh,
          speedMph: targetMph,
          tripDistanceKm: nextTripKm,
          tripDistanceMiles: nextTripMiles,
          latitude: prev.latitude + 0.00008,
          longitude: prev.longitude + 0.00005,
          lastUpdateTimestamp: Date.now()
        };
      });
    }, 1200);

    return () => clearInterval(speedInterval);
  }, []);

  // Real device accelerometer listener for physical mobile devices
  useEffect(() => {
    const handleDeviceMotion = (event: DeviceMotionEvent) => {
      if (!settings.accidentDetectionEnabled || !event.accelerationIncludingGravity) return;
      const acc = event.accelerationIncludingGravity;
      const x = acc.x || 0;
      const y = acc.y || 0;
      const z = acc.z || 9.81;
      const totalG = Math.sqrt(x * x + y * y + z * z) / 9.80665;
      setCurrentGForce(totalG);

      const threshold = settings.accidentSensitivity === 'LOW' ? 3.5 : settings.accidentSensitivity === 'HIGH' ? 1.8 : 2.5;
      if (totalG >= threshold) {
        handleShockDetected(totalG, `Real Device G-Sensor Impact (${totalG.toFixed(1)}G)`);
      }
    };

    if (window.DeviceMotionEvent) {
      window.addEventListener('devicemotion', handleDeviceMotion);
    }
    return () => {
      if (window.DeviceMotionEvent) {
        window.removeEventListener('devicemotion', handleDeviceMotion);
      }
    };
  }, [settings.accidentDetectionEnabled, settings.accidentSensitivity]);

  // Handle shock / incident detected
  const handleShockDetected = (gForce: number, label: string) => {
    const now = Date.now();
    setCurrentGForce(gForce);
    setActiveIncidentMessage(`${label} — 60s Pre-Buffer & 30s Post-Buffer Locked!`);

    // Lock all clips in preceding 60 seconds
    webStorage.handleIncidentTrigger(
      now,
      'G_SENSOR',
      gForce,
      telemetry.speedKmh,
      telemetry.latitude,
      telemetry.longitude,
      60,
      settings.postEventSeconds
    );

    setClips(webStorage.getClips());
    setStorageStats(webStorage.getStorageStats());

    // Clear alert toast after 6 seconds
    setTimeout(() => {
      setActiveIncidentMessage(null);
    }, 6000);
  };

  // Manual incident lock trigger (Lock button on HUD)
  const handleTriggerManualLock = () => {
    const now = Date.now();
    setActiveIncidentMessage('Manual Lock Triggered — Preceding 60s footage preserved!');
    webStorage.handleIncidentTrigger(
      now,
      'MANUAL',
      currentGForce,
      telemetry.speedKmh,
      telemetry.latitude,
      telemetry.longitude,
      60,
      settings.postEventSeconds
    );
    setClips(webStorage.getClips());
    setStorageStats(webStorage.getStorageStats());

    setTimeout(() => {
      setActiveIncidentMessage(null);
    }, 5000);
  };

  // Google Play Billing Actions
  const handlePurchasePro = (plan: 'ANNUAL' | 'MONTHLY') => {
    setEntitlements({
      isProUnlocked: true,
      canUse64GbQuota: true,
      canUse4kResolution: true,
      canUseFrontCamera: true,
      activePlan: plan
    });
    // Auto-upgrade quota to 64GB
    setSettings(prev => ({ ...prev, storageQuotaGb: 64 }));
  };

  const handleToggleSandboxPro = () => {
    const newState = !entitlements.isProUnlocked;
    setEntitlements({
      isProUnlocked: newState,
      canUse64GbQuota: newState,
      canUse4kResolution: newState,
      canUseFrontCamera: newState,
      activePlan: newState ? 'ANNUAL' : 'NONE'
    });
    if (!newState && settings.storageQuotaGb === 64) {
      setSettings(prev => ({ ...prev, storageQuotaGb: 16 }));
    }
  };

  // Traffic Sign Recognition & Overspeed calculations
  const isMph = settings.speedUnit === 'MPH';
  const currentSpeed = isMph ? telemetry.speedMph : telemetry.speedKmh;
  const activeLimit = isMph ? detectedSpeedLimit.limitMph : detectedSpeedLimit.limitKmh;
  const tolerance = settings.speedLimitTolerance || 0;
  const isOverSpeed = settings.speedLimitAlertEnabled && (currentSpeed > activeLimit + tolerance);
  const overspeedAmount = Math.max(0, Math.round(currentSpeed - activeLimit));

  // Play acoustic warning beeps above speed limit
  useEffect(() => {
    if (isOverSpeed && settings.speedLimitBeepEnabled) {
      soundAlert.playOverspeedBeep();
    }
  }, [isOverSpeed, settings.speedLimitBeepEnabled, telemetry.speedKmh]);

  // Handle speed limit sign recognized from front camera or road simulation
  const handleSignRecognized = (limitKmh: number, limitMph: number) => {
    if (detectedSpeedLimit.limitKmh === limitKmh) return;

    setDetectedSpeedLimit({
      limitKmh,
      limitMph,
      detectedAtMillis: Date.now(),
      confidencePercent: 98,
      signType: 'STANDARD',
      source: 'OPTICAL_TSR'
    });

    soundAlert.playSignDetectedChime();
    const signLabel = isMph ? `${limitMph} m/hr` : `${limitKmh} km/hr`;
    setTsrDetectionNotice(`TSR: Road Sign Detected (${signLabel})`);
    setTimeout(() => setTsrDetectionNotice(null), 3500);
  };

  // Cycle speed limit on HUD sign click
  const handleCycleSpeedLimit = () => {
    const kmhCycle = [30, 40, 50, 60, 70, 80, 90, 100, 110];
    const mphCycle = [20, 25, 30, 35, 45, 50, 55, 65, 70];

    if (isMph) {
      const curIdx = mphCycle.indexOf(detectedSpeedLimit.limitMph);
      const nextIdx = (curIdx + 1) % mphCycle.length;
      const nextMph = mphCycle[nextIdx];
      const nextKmh = Math.round(nextMph / 0.621371);
      setDetectedSpeedLimit({
        limitKmh: nextKmh,
        limitMph: nextMph,
        detectedAtMillis: Date.now(),
        confidencePercent: 100,
        signType: 'STANDARD',
        source: 'MANUAL'
      });
      setTsrDetectionNotice(`Speed Limit set to ${nextMph} m/hr`);
    } else {
      const curIdx = kmhCycle.indexOf(detectedSpeedLimit.limitKmh);
      const nextIdx = (curIdx + 1) % kmhCycle.length;
      const nextKmh = kmhCycle[nextIdx];
      const nextMph = Math.round(nextKmh * 0.621371);
      setDetectedSpeedLimit({
        limitKmh: nextKmh,
        limitMph: nextMph,
        detectedAtMillis: Date.now(),
        confidencePercent: 100,
        signType: 'STANDARD',
        source: 'MANUAL'
      });
      setTsrDetectionNotice(`Speed Limit set to ${nextKmh} km/hr`);
    }
    soundAlert.playSignDetectedChime();
    setTimeout(() => setTsrDetectionNotice(null), 3000);
  };

  // Toggle speed limit acoustic alert chime
  const handleToggleBeepSound = () => {
    setSettings(prev => ({
      ...prev,
      speedLimitBeepEnabled: !prev.speedLimitBeepEnabled
    }));
  };

  // Toggle speed & distance unit between km/hr (km) and m/hr (miles)
  const handleToggleSpeedUnit = () => {
    setSettings(prev => ({
      ...prev,
      speedUnit: prev.speedUnit === 'KMH' ? 'MPH' : 'KMH'
    }));
  };

  // Reset trip odometer counter to zero
  const handleResetTrip = () => {
    setTelemetry(prev => ({
      ...prev,
      tripDistanceKm: 0,
      tripDistanceMiles: 0
    }));
    try {
      localStorage.setItem(TRIP_ODOMETER_KEY, '0');
    } catch (e) {
      console.warn('Could not reset trip odometer in storage', e);
    }
  };

  // Toggle 12V automotive charging power state
  const handleToggleCharging = () => {
    setIsCharging(prev => !prev);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-neutral-950 font-sans">
      {/* 1. Live Road Canvas / Camera Preview */}
      <RoadCanvas
        speedKmh={telemetry.speedKmh}
        speedUnit={settings.speedUnit}
        tripDistanceKm={telemetry.tripDistanceKm}
        activeSpeedLimitKmh={detectedSpeedLimit.limitKmh}
        batteryLevel={batteryLevel}
        isCharging={isCharging}
        onSignRecognized={handleSignRecognized}
        isRecording={isRecording}
        isDualCameraActive={settings.frontCameraEnabled && entitlements.canUseFrontCamera}
      />

      {/* 2. Automotive HUD Overlay & Cockpit Controls */}
      <DashcamHUD
        isRecording={isRecording}
        recordingElapsedSec={recordingElapsedSec}
        telemetry={telemetry}
        storageStats={storageStats}
        resolution={settings.videoResolution}
        isAudioEnabled={settings.audioRecordingEnabled}
        speedUnit={settings.speedUnit}
        currentGForce={currentGForce}
        activeIncidentMessage={activeIncidentMessage}
        detectedSpeedLimit={detectedSpeedLimit}
        isOverSpeed={isOverSpeed}
        overspeedAmount={overspeedAmount}
        speedLimitBeepEnabled={settings.speedLimitBeepEnabled}
        tsrDetectionNotice={tsrDetectionNotice}
        batteryLevel={batteryLevel}
        isCharging={isCharging}
        onToggleCharging={handleToggleCharging}
        onToggleRecording={() => setIsRecording(prev => !prev)}
        onToggleSpeedUnit={handleToggleSpeedUnit}
        onResetTrip={handleResetTrip}
        onToggleBeepSound={handleToggleBeepSound}
        onCycleSpeedLimit={handleCycleSpeedLimit}
        onTriggerManualLock={handleTriggerManualLock}
        onSimulateShock={(g, label) => handleShockDetected(g, label)}
        onOpenLibrary={() => setShowGallery(true)}
        onOpenSettings={() => setShowSettings(true)}
        onOpenNavCompanion={() => setShowNavCompanion(true)}
        onOpenProjectExplorer={() => setShowProjectExplorer(true)}
        onOpenTestRunner={() => setShowTestRunner(true)}
      />

      {/* 3. Recording Archive / Library Modal */}
      <GalleryModal
        isOpen={showGallery}
        onClose={() => setShowGallery(false)}
        clips={clips}
        storageStats={storageStats}
        speedUnit={settings.speedUnit}
        onToggleProtection={(id) => {
          webStorage.toggleProtection(id);
          setClips(webStorage.getClips());
          setStorageStats(webStorage.getStorageStats());
        }}
        onDeleteClip={(id) => {
          webStorage.deleteClip(id);
          setClips(webStorage.getClips());
          setStorageStats(webStorage.getStorageStats());
        }}
        onAddSimulatedClip={rotateSegment}
      />

      {/* 4. Configuration & Settings Modal */}
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        settings={settings}
        entitlements={entitlements}
        onUpdateSettings={(newSettings) => setSettings(prev => ({ ...prev, ...newSettings }))}
        onTriggerPaywall={() => setShowPaywall(true)}
        onToggleSandboxPro={handleToggleSandboxPro}
      />

      {/* 5. Google Play Billing Modal */}
      <PaywallModal
        isOpen={showPaywall}
        onClose={() => setShowPaywall(false)}
        entitlements={entitlements}
        onPurchasePro={handlePurchasePro}
        onRestorePurchases={() => handlePurchasePro('ANNUAL')}
      />

      {/* 6. Companion Navigation & Split-Screen Modal */}
      <CompanionNavModal
        isOpen={showNavCompanion}
        onClose={() => setShowNavCompanion(false)}
        selectedNavApp={settings.companionNavApp}
        onSelectNavApp={(appKey) => setSettings(prev => ({ ...prev, companionNavApp: appKey }))}
      />

      {/* 7. Android Project Explorer & Code Exporter (.ZIP) */}
      <AndroidProjectExplorer
        isOpen={showProjectExplorer}
        onClose={() => setShowProjectExplorer(false)}
      />

      {/* 8. Automated Verification Test Suite Runner */}
      <TestRunnerModal
        isOpen={showTestRunner}
        onClose={() => setShowTestRunner(false)}
      />
    </div>
  );
}
