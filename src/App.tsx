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
import {
  DashcamSettings,
  BillingEntitlements,
  TelemetryData,
  StorageStats,
  DashcamClip
} from './types/dashcam';

export default function App() {
  // App state & settings
  const [settings, setSettings] = useState<DashcamSettings>({
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
    companionNavApp: 'google_maps'
  });

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

  // GPS Telemetry
  const [telemetry, setTelemetry] = useState<TelemetryData>({
    speedKmh: 68.4,
    speedMph: 42.5,
    latitude: 37.7749,
    longitude: -122.4194,
    altitudeMeters: 24,
    bearingDegrees: 48,
    accuracyMeters: 4.2,
    isGpsLocked: true,
    isSignalStale: false,
    lastUpdateTimestamp: Date.now()
  });

  // Modals state
  const [showGallery, setShowGallery] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [showNavCompanion, setShowNavCompanion] = useState(false);
  const [showProjectExplorer, setShowProjectExplorer] = useState(false);
  const [showTestRunner, setShowTestRunner] = useState(false);

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
      latitude: telemetry.latitude,
      longitude: telemetry.longitude,
      hasAudio: settings.audioRecordingEnabled,
      thumbnailColor: '#1e293b'
    };

    webStorage.addClip(newClip);
    setClips(webStorage.getClips());
    setStorageStats(webStorage.getStorageStats());
  };

  // Speedometer driving simulation loop (Smoothly fluctuates speed between 58 and 78 km/h)
  useEffect(() => {
    const speedInterval = setInterval(() => {
      setTelemetry(prev => {
        const noise = (Math.random() - 0.49) * 2.2;
        const targetKmh = Math.min(88, Math.max(48, prev.speedKmh + noise));
        const targetMph = targetKmh * 0.621371;

        // Subtle G-force wobble from normal road surface
        const roadG = 1.0 + (Math.random() - 0.5) * 0.08;
        setCurrentGForce(roadG);

        return {
          ...prev,
          speedKmh: targetKmh,
          speedMph: targetMph,
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

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-neutral-950 font-sans">
      {/* 1. Live Road Canvas / Camera Preview */}
      <RoadCanvas
        speedKmh={telemetry.speedKmh}
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
        onToggleRecording={() => setIsRecording(prev => !prev)}
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
