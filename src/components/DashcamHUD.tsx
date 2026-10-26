import React, { useState } from 'react';
import {
  ShieldAlert,
  Map,
  Settings,
  FolderOpen,
  Mic,
  MicOff,
  Battery,
  BatteryCharging,
  BatteryFull,
  BatteryMedium,
  BatteryLow,
  BatteryWarning,
  Thermometer,
  Lock,
  Play,
  Square,
  Zap,
  Activity,
  Layers,
  Sparkles,
  Video,
  Navigation,
  Volume2,
  VolumeX,
  Eye,
  AlertTriangle
} from 'lucide-react';
import { StorageStats, TelemetryData, VideoResolutionOption, SpeedUnitOption, SpeedLimitSign } from '../types/dashcam';

/**
 * Properties for the primary automotive Heads-Up Display (DashcamHUD) overlay.
 */
export interface DashcamHUDProps {
  /** Indicates whether the segmented video recording engine is actively encoding */
  isRecording: boolean;
  /** Elapsed recording time of the current active clip in seconds */
  recordingElapsedSec: number;
  /** Real-time GPS speed, coordinates, bearing, and altitude telemetry */
  telemetry: TelemetryData;
  /** Storage quota allocation, used capacity, and FIFO ring buffer diagnostics */
  storageStats: StorageStats;
  /** Video capture resolution profile ('1080p' | '4K') */
  resolution: VideoResolutionOption;
  /** Indicates if in-cabin microphone audio capture is active */
  isAudioEnabled: boolean;
  /** Unit of measure ('KMH' or 'MPH') for speedometer and distance displays */
  speedUnit: SpeedUnitOption;
  /** Current dynamic resultant G-force from accelerometer telemetry */
  currentGForce: number;
  /** Active emergency lock notice banner message, or null if no active incident */
  activeIncidentMessage: string | null;
  /** Active speed limit sign recognized by TSR or GPS database, or null */
  detectedSpeedLimit: SpeedLimitSign | null;
  /** True when current vehicle speed exceeds detected speed limit by configured tolerance */
  isOverSpeed: boolean;
  /** Quantitative overspeed margin in current speed units (speed - limit) */
  overspeedAmount: number;
  /** Toggles acoustic dual-tone alert chime for overspeed events */
  speedLimitBeepEnabled: boolean;
  /** Temporary toast notification message when a new traffic sign is recognized */
  tsrDetectionNotice: string | null;
  /** Battery charge percentage (0-100) */
  batteryLevel?: number;
  /** Indicates if the device is plugged into 12V automotive power / charging */
  isCharging?: boolean;
  /** Callback to toggle between 12V automotive power and internal battery backup */
  onToggleCharging?: () => void;
  /** Callback to toggle recording state (triggers guard dialog if recording is stopped) */
  onToggleRecording: () => void;
  /** Callback to toggle between KM/H and MPH measurement units */
  onToggleSpeedUnit: () => void;
  /** Callback to zero-out the persistent cumulative trip odometer */
  onResetTrip: () => void;
  /** Callback to toggle audible chime alert sound */
  onToggleBeepSound: () => void;
  /** Callback to manually cycle speed limit values for validation and testing */
  onCycleSpeedLimit: () => void;
  /** Callback to trigger an immediate manual incident lock on the rolling buffer */
  onTriggerManualLock: () => void;
  /** Callback to simulate G-sensor shock thresholds (e.g. 1.8G hard brake, 2.8G collision) */
  onSimulateShock: (gForce: number, label: string) => void;
  /** Callback to open the recorded clips and incident gallery modal */
  onOpenLibrary: () => void;
  /** Callback to open cockpit configuration and sensor settings modal */
  onOpenSettings: () => void;
  /** Callback to launch third-party navigation companion (Google Maps / Waze) */
  onOpenNavCompanion: () => void;
  /** Callback to open the native Android Kotlin/Compose project files explorer */
  onOpenProjectExplorer: () => void;
  /** Callback to open the automated test suite runner modal */
  onOpenTestRunner: () => void;
}

/**
 * Automotive Heads-Up Display (HUD) overlay component.
 *
 * Implements a high-contrast dark OLED dashboard interface compliant with
 * automotive ergonomics:
 * - Top Status Bar: Branding, REC/STANDBY state, resolution, audio status, battery level, temperature, and FIFO disk quota.
 * - Central Telemetry Cluster: High-visibility speedometer numerals, unit toggle button, trip odometer, and compass bearing.
 * - TSR Sign Widget: Regulatory European/US speed limit circle with pulsing overspeed warning state.
 * - Cockpit Quick-Action Bar: Instant manual lock button, G-sensor test triggers, and companion navigation launcher.
 */
export const DashcamHUD: React.FC<DashcamHUDProps> = ({
  isRecording,
  recordingElapsedSec,
  telemetry,
  storageStats,
  resolution,
  isAudioEnabled,
  speedUnit,
  currentGForce,
  activeIncidentMessage,
  detectedSpeedLimit,
  isOverSpeed,
  overspeedAmount,
  speedLimitBeepEnabled,
  tsrDetectionNotice,
  batteryLevel = 94,
  isCharging = true,
  onToggleCharging,
  onToggleRecording,
  onToggleSpeedUnit,
  onResetTrip,
  onToggleBeepSound,
  onCycleSpeedLimit,
  onTriggerManualLock,
  onSimulateShock,
  onOpenLibrary,
  onOpenSettings,
  onOpenNavCompanion,
  onOpenProjectExplorer,
  onOpenTestRunner
}) => {
  const [showStopConfirm, setShowStopConfirm] = useState(false);

  const isMph = speedUnit === 'MPH';
  const speedUnitLabel = isMph ? 'm/hr' : 'km/hr';
  const distanceUnitLabel = isMph ? 'miles' : 'km';
  const displaySpeed = telemetry.isGpsLocked && !telemetry.isSignalStale
    ? Math.round(isMph ? telemetry.speedMph : telemetry.speedKmh)
    : '--';
  const displayDistance = isMph
    ? (telemetry.tripDistanceKm * 0.621371).toFixed(1)
    : telemetry.tripDistanceKm.toFixed(1);

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const usedGb = (storageStats.usedBytes / (1024 * 1024 * 1024)).toFixed(1);
  const quotaGb = (storageStats.quotaBytes / (1024 * 1024 * 1024)).toFixed(0);
  const remainingMin = Math.floor(storageStats.estimatedRemainingSeconds / 60);

  const usagePercent = Math.min(100, Math.round((storageStats.usedBytes / storageStats.quotaBytes) * 100));

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between z-10 p-3 select-none">

      {/* 1. TOP STATUS BAR */}
      <div className="pointer-events-auto bg-neutral-950/85 backdrop-blur-md rounded-xl p-3 border border-neutral-800/80 shadow-2xl">
        <div className="flex items-center justify-between gap-2">

          {/* Left: RydeCam Brand Title, REC Indicator & Elapsed Timer */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 pr-3 border-r border-neutral-800">
              <div className="w-7 h-7 rounded-lg bg-red-600/20 border border-red-500/50 flex items-center justify-center">
                <Video className="w-4 h-4 text-red-500" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5 leading-none">
                  <span className="font-black text-sm tracking-wider text-white">RYDECAM</span>
                  <span className="text-[9px] bg-red-950 text-red-300 border border-red-800 px-1 py-0.5 rounded font-mono font-bold leading-none">PRO</span>
                </div>
                <span className="text-[9px] text-neutral-400 font-mono leading-none mt-0.5">com.rydecam.app</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`w-3.5 h-3.5 rounded-full transition-all duration-300 ${
                  isRecording
                    ? 'bg-red-500 shadow-lg shadow-red-500/80 animate-pulse'
                    : 'bg-neutral-600'
                }`}
              />
              <span
                className={`text-xs font-black tracking-widest ${
                  isRecording ? 'text-red-400' : 'text-neutral-400'
                }`}
              >
                {isRecording ? 'REC' : 'STANDBY'}
              </span>
            </div>
            <div className="font-mono text-sm font-bold text-white bg-neutral-900/90 px-2.5 py-0.5 rounded border border-neutral-700/60">
              {formatTimer(recordingElapsedSec)}
            </div>
          </div>

          {/* Center-Right Badges: Resolution, Mic, Battery, Temp */}
          <div className="flex items-center gap-2">
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider border ${
                resolution === '4K'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
              }`}
            >
              {resolution} 30FPS
            </span>

            <div
              className={`flex items-center gap-1 text-[11px] px-2 py-0.5 rounded border ${
                isAudioEnabled
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-neutral-800 text-neutral-400 border-neutral-700'
              }`}
              title={isAudioEnabled ? 'Audio Recording ON' : 'Audio Muted'}
            >
              {isAudioEnabled ? <Mic className="w-3 h-3" /> : <MicOff className="w-3 h-3" />}
              <span className="hidden sm:inline font-mono">{isAudioEnabled ? 'AUDIO' : 'MUTE'}</span>
            </div>

            {/* Battery Level Percentage & Power Charging Status */}
            <div
              onClick={onToggleCharging}
              className={`flex items-center gap-1.5 text-[11px] px-2.5 py-0.5 rounded border transition-colors cursor-pointer select-none ${
                isCharging
                  ? 'bg-emerald-950/70 border-emerald-500/60 text-emerald-300 hover:bg-emerald-950'
                  : batteryLevel <= 20
                    ? 'bg-red-950/80 border-red-500/80 text-red-300 animate-pulse'
                    : batteryLevel <= 40
                      ? 'bg-amber-950/70 border-amber-500/60 text-amber-300'
                      : 'bg-neutral-900/90 border-neutral-700/60 text-neutral-300 hover:bg-neutral-800'
              }`}
              title={
                isCharging
                  ? `Connected to power: Battery ${batteryLevel}% and charging. Click to toggle power.`
                  : `Running on battery: ${batteryLevel}% remaining. Click to simulate 12V power.`
              }
            >
              {isCharging ? (
                <div className="relative flex items-center">
                  <BatteryCharging className="w-3.5 h-3.5 text-emerald-400" />
                  <Zap className="w-2.5 h-2.5 text-amber-300 fill-amber-300 absolute -top-1 -right-1 animate-pulse" />
                </div>
              ) : batteryLevel <= 20 ? (
                <BatteryWarning className="w-3.5 h-3.5 text-red-400" />
              ) : batteryLevel <= 40 ? (
                <BatteryLow className="w-3.5 h-3.5 text-amber-400" />
              ) : batteryLevel <= 70 ? (
                <BatteryMedium className="w-3.5 h-3.5 text-neutral-300" />
              ) : (
                <BatteryFull className="w-3.5 h-3.5 text-emerald-400" />
              )}

              <span className="font-mono font-bold tracking-tight">{batteryLevel}%</span>

              {isCharging ? (
                <span className="flex items-center gap-0.5 text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-1 rounded font-mono font-semibold">
                  <Zap className="w-2.5 h-2.5 fill-current" />
                  <span>CHG</span>
                </span>
              ) : (
                <span className="hidden lg:inline text-[9px] bg-neutral-800 text-neutral-400 px-1 rounded font-mono">
                  BAT
                </span>
              )}
            </div>

            <div className="hidden md:flex items-center gap-1 text-[11px] text-neutral-300 bg-neutral-900/90 px-2 py-0.5 rounded border border-neutral-700/60">
              <Thermometer className="w-3.5 h-3.5 text-cyan-400" />
              <span className="font-mono">36°C NORMAL</span>
            </div>
          </div>
        </div>

        {/* Storage Bar & FIFO Progress */}
        <div className="mt-2.5 pt-2 border-t border-neutral-800/80">
          <div className="flex items-center justify-between text-[11px] text-neutral-300 font-mono mb-1">
            <div className="flex items-center gap-1.5">
              <span className="text-neutral-400">STORAGE:</span>
              <span className="font-bold text-white">{usedGb} / {quotaGb} GB</span>
              <span className="text-[10px] text-cyan-400 bg-cyan-950/70 px-1 rounded border border-cyan-800/60 font-sans">FIFO AUTO-ROTATE</span>
            </div>
            <div className="text-neutral-400">
              EST. REMAINING: <span className="text-emerald-300 font-bold">~{Math.floor(remainingMin / 60)}h {remainingMin % 60}m</span>
            </div>
          </div>

          <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden flex">
            <div
              className={`h-full transition-all duration-500 ${
                usagePercent > 90 ? 'bg-amber-500' : 'bg-cyan-500'
              }`}
              style={{ width: `${usagePercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* 2. CENTER HUD: SPEEDOMETER, GPS STATUS & G-FORCE */}
      <div className="flex flex-col items-center justify-center my-auto pointer-events-none">

        {/* Emergency Alert Toast */}
        {activeIncidentMessage && (
          <div className="mb-4 bg-red-600/95 border-2 border-amber-300 text-white px-5 py-2.5 rounded-xl shadow-2xl animate-bounce flex items-center gap-3 backdrop-blur-md">
            <ShieldAlert className="w-6 h-6 text-amber-200 shrink-0" />
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-amber-100">INCIDENT PRESERVED</p>
              <p className="text-sm font-bold">{activeIncidentMessage}</p>
            </div>
          </div>
        )}

        {/* TSR Road Sign Detection Notification */}
        {tsrDetectionNotice && (
          <div className="mb-2 bg-cyan-950/90 border border-cyan-500/80 text-cyan-200 px-3.5 py-1.5 rounded-lg shadow-xl flex items-center gap-2 backdrop-blur-md animate-fadeIn pointer-events-auto">
            <Eye className="w-4 h-4 text-cyan-400 shrink-0" />
            <span className="text-xs font-mono font-bold">{tsrDetectionNotice}</span>
          </div>
        )}

        {/* Overspeed Warning Alert Banner */}
        {isOverSpeed && (
          <div className="mb-2 bg-red-600/95 border-2 border-amber-300 text-white px-4 py-2 rounded-xl shadow-2xl flex items-center gap-3 backdrop-blur-md animate-pulse pointer-events-auto">
            <AlertTriangle className="w-5 h-5 text-amber-300 shrink-0" />
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-200">
                OVERSPEED WARNING • SLOW DOWN
              </span>
              <span className="text-xs font-bold font-mono">
                +{overspeedAmount} {speedUnitLabel} over limit ({isMph ? (detectedSpeedLimit?.limitMph ?? 45) : (detectedSpeedLimit?.limitKmh ?? 60)} {speedUnitLabel})
              </span>
            </div>
            <button
              onClick={onToggleBeepSound}
              className={`ml-2 px-2.5 py-1 rounded-md text-[10px] font-mono font-bold flex items-center gap-1 transition ${
                speedLimitBeepEnabled
                  ? 'bg-neutral-900/90 hover:bg-black text-amber-300 border border-amber-400/60'
                  : 'bg-neutral-800 text-neutral-400 border border-neutral-700'
              }`}
              title={speedLimitBeepEnabled ? 'Mute alert chime' : 'Unmute alert chime'}
            >
              {speedLimitBeepEnabled ? <Volume2 className="w-3.5 h-3.5 text-amber-300" /> : <VolumeX className="w-3.5 h-3.5 text-neutral-400" />}
              <span>{speedLimitBeepEnabled ? 'BEEP ON' : 'MUTED'}</span>
            </button>
          </div>
        )}

        {/* Speedometer numerals and Traffic Sign Recognition (TSR) Badge */}
        <div className="flex items-center justify-center gap-3 sm:gap-6">
          {/* Main Speedometer */}
          <div className="flex items-baseline justify-center">
            <span
              className={`font-mono text-7xl sm:text-8xl md:text-9xl font-black tracking-tighter transition-colors duration-300 ${
                isOverSpeed
                  ? 'text-red-500 drop-shadow-[0_4px_30px_rgba(239,68,68,0.7)] animate-pulse'
                  : 'text-emerald-400 drop-shadow-[0_4px_24px_rgba(16,185,129,0.35)]'
              }`}
            >
              {displaySpeed}
            </span>
            <button
              onClick={onToggleSpeedUnit}
              className="pointer-events-auto ml-2 flex items-center gap-1 group transition"
              title={`Click to switch between km/hr and m/hr (Currently ${speedUnitLabel})`}
            >
              <span className="text-xl sm:text-2xl font-black text-emerald-300/90 group-hover:text-emerald-200 tracking-wider font-mono">
                {speedUnitLabel}
              </span>
              <span className="text-[10px] text-emerald-400 bg-emerald-950/80 group-hover:bg-emerald-900 border border-emerald-700/60 px-1.5 py-0.5 rounded font-mono font-bold tracking-tight">
                ⇄
              </span>
            </button>
          </div>

          {/* Road Speed Limit Sign (Detected via Front Camera TSR) */}
          {detectedSpeedLimit && (
            <div className="flex flex-col items-center pointer-events-auto">
              <button
                onClick={onCycleSpeedLimit}
                className={`relative w-15 h-15 sm:w-18 sm:h-18 rounded-full border-4 bg-white flex flex-col items-center justify-center shadow-2xl transition hover:scale-105 active:scale-95 cursor-pointer ${
                  isOverSpeed
                    ? 'border-red-600 ring-4 ring-red-500/70 animate-bounce'
                    : 'border-red-600 ring-2 ring-black/40'
                }`}
                title="TSR Optical Speed Limit Sign (Click to cycle speed limit)"
              >
                <span className="text-[8px] font-black uppercase text-neutral-600 tracking-tighter leading-none mt-0.5">
                  LIMIT
                </span>
                <span className="font-mono text-2xl sm:text-3xl font-black text-black leading-none my-0.5">
                  {isMph ? detectedSpeedLimit.limitMph : detectedSpeedLimit.limitKmh}
                </span>
                <span className="text-[8px] font-bold text-neutral-500 uppercase leading-none">
                  {speedUnitLabel}
                </span>
              </button>
              <div className="flex items-center gap-1 mt-1 bg-black/80 backdrop-blur-sm px-2 py-0.5 rounded-full border border-neutral-700/80">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
                <span className="text-[9px] font-mono text-cyan-300 font-bold">TSR AI</span>
              </div>
            </div>
          )}
        </div>

        {/* Trip Distance Odometer bar */}
        <div className="flex items-center justify-center gap-2 mt-0.5 mb-1.5">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-950/80 backdrop-blur-md border border-neutral-800/90 pointer-events-auto shadow-lg">
            <Navigation className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="text-[11px] font-mono text-neutral-400">TRIP DISTANCE:</span>
            <span className="text-xs font-mono font-bold text-white tracking-wide">
              {displayDistance} {distanceUnitLabel}
            </span>
            <button
              onClick={onResetTrip}
              title="Reset trip odometer"
              className="text-[9px] text-neutral-400 hover:text-white font-mono font-semibold px-1.5 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 transition"
            >
              RESET
            </button>
          </div>

          <button
            onClick={onToggleSpeedUnit}
            className="pointer-events-auto px-2.5 py-1 rounded-full bg-neutral-900/90 hover:bg-neutral-800 border border-neutral-700 text-cyan-400 hover:text-cyan-300 text-[11px] font-mono font-bold flex items-center gap-1 transition shadow-lg"
            title="Toggle between km/hr and m/hr"
          >
            <span>Unit: {speedUnitLabel}</span>
          </button>
        </div>

        {/* GPS coordinates & G-Meter */}
        <div className="flex flex-wrap items-center justify-center gap-4 mt-1 bg-neutral-950/70 backdrop-blur-md px-4 py-1.5 rounded-full border border-neutral-800/80">
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                telemetry.isGpsLocked && !telemetry.isSignalStale
                  ? 'bg-emerald-400 animate-pulse'
                  : 'bg-red-500'
              }`}
            />
            <span className="text-[11px] font-mono font-semibold text-neutral-300">
              {telemetry.isGpsLocked && !telemetry.isSignalStale ? 'GPS LOCKED' : 'SEARCHING GPS'}
            </span>
          </div>

          <div className="text-[11px] font-mono text-neutral-400 hidden sm:inline">
            LAT: {telemetry.latitude.toFixed(4)}° • LNG: {telemetry.longitude.toFixed(4)}°
          </div>

          <div className="flex items-center gap-1 text-[11px] font-mono">
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-neutral-400">G-FORCE:</span>
            <span
              className={`font-bold ${
                currentGForce > 2.0 ? 'text-amber-400 animate-pulse' : 'text-cyan-300'
              }`}
            >
              {currentGForce.toFixed(2)} G
            </span>
          </div>
        </div>

        {/* Sensor Shock Simulation Quick Bar */}
        <div className="pointer-events-auto mt-4 flex flex-wrap items-center justify-center gap-2">
          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest hidden md:inline">
            TEST SENSORS:
          </span>
          <button
            onClick={() => onSimulateShock(1.2, 'Speed Bump / Pothole (1.2G - Filtered)')}
            className="text-[10px] font-semibold bg-neutral-900/80 hover:bg-neutral-800 text-neutral-300 px-2.5 py-1 rounded border border-neutral-700 transition"
          >
            Pothole (1.2G)
          </button>
          <button
            onClick={() => onSimulateShock(2.0, 'Hard Emergency Braking (2.0G)')}
            className="text-[10px] font-semibold bg-amber-950/80 hover:bg-amber-900 text-amber-200 px-2.5 py-1 rounded border border-amber-700/80 transition"
          >
            Hard Brake (2.0G)
          </button>
          <button
            onClick={() => onSimulateShock(3.4, 'Collision Impact Shock (3.4G)')}
            className="text-[10px] font-bold bg-red-950/80 hover:bg-red-900 text-red-200 px-2.5 py-1 rounded border border-red-700/90 transition shadow-lg shadow-red-900/30 flex items-center gap-1"
          >
            <Zap className="w-3 h-3 text-red-400" />
            Crash Impact (3.4G)
          </button>
        </div>
      </div>

      {/* 3. BOTTOM AUTOMOTIVE DOCK */}
      <div className="pointer-events-auto bg-neutral-950/90 backdrop-blur-md rounded-2xl p-3 border border-neutral-800 shadow-2xl flex flex-col gap-2">
        <div className="flex items-center justify-around gap-2 max-w-2xl mx-auto w-full">

          {/* Navigation Companion Button */}
          <button
            onClick={onOpenNavCompanion}
            className="flex flex-col items-center justify-center gap-1 w-14 h-14 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-700/80 text-cyan-400 transition"
            title="Companion Navigation & Split Screen"
          >
            <Map className="w-5 h-5" />
            <span className="text-[9px] font-bold tracking-wider">NAV</span>
          </button>

          {/* Manual Incident Lock Button (Yellow Shield) */}
          <button
            onClick={onTriggerManualLock}
            className="flex flex-col items-center justify-center gap-1 w-14 h-14 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/60 text-amber-300 transition shadow-lg shadow-amber-500/20 active:scale-95"
            title="Immediately lock the last 60 seconds leading to now and preserve footage"
          >
            <Lock className="w-5 h-5" />
            <span className="text-[9px] font-black tracking-wider text-amber-200">LOCK</span>
          </button>

          {/* Main Record / Stop Giant Button */}
          <button
            onClick={() => {
              if (isRecording) {
                setShowStopConfirm(true);
              } else {
                onToggleRecording();
              }
            }}
            className={`w-16 h-16 rounded-full flex items-center justify-center shadow-2xl transition-all duration-200 active:scale-90 ${
              isRecording
                ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-600/50 ring-4 ring-red-600/30'
                : 'bg-emerald-500 hover:bg-emerald-400 text-neutral-950 shadow-emerald-500/50 ring-4 ring-emerald-500/30'
            }`}
            title={isRecording ? 'Stop Recording' : 'Start Continuous Recording'}
          >
            {isRecording ? (
              <Square className="w-7 h-7 fill-current" />
            ) : (
              <Play className="w-8 h-8 fill-current ml-1" />
            )}
          </button>

          {/* Library / Archive Button */}
          <button
            onClick={onOpenLibrary}
            className="flex flex-col items-center justify-center gap-1 w-14 h-14 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-700/80 text-neutral-200 transition"
            title="Saved Clips & Protected Incidents"
          >
            <FolderOpen className="w-5 h-5 text-neutral-300" />
            <span className="text-[9px] font-bold tracking-wider">CLIPS</span>
          </button>

          {/* Settings / Setup Button */}
          <button
            onClick={onOpenSettings}
            className="flex flex-col items-center justify-center gap-1 w-14 h-14 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-700/80 text-neutral-300 transition"
            title="Dashcam Configuration & Quotas"
          >
            <Settings className="w-5 h-5" />
            <span className="text-[9px] font-bold tracking-wider">SETUP</span>
          </button>
        </div>

        {/* Secondary Utility Dock: Android Code Explorer & Verification Test Runner */}
        <div className="flex items-center justify-center gap-3 pt-1 border-t border-neutral-800/60 text-xs">
          <button
            onClick={onOpenProjectExplorer}
            className="flex items-center gap-1.5 text-cyan-400 hover:text-cyan-300 font-semibold px-3 py-1 rounded bg-neutral-900/60 hover:bg-neutral-900 border border-neutral-700/50 transition"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Android Studio Code & ZIP</span>
          </button>

          <button
            onClick={onOpenTestRunner}
            className="flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 font-semibold px-3 py-1 rounded bg-neutral-900/60 hover:bg-neutral-900 border border-neutral-700/50 transition"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Run FIFO & Buffer Tests</span>
          </button>
        </div>
      </div>

      {/* Accidental Stop Guard Dialog */}
      {showStopConfirm && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 pointer-events-auto">
          <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-5 max-w-sm w-full text-center shadow-2xl">
            <h3 className="text-base font-bold text-white mb-2">Stop RydeCam Recording?</h3>
            <p className="text-xs text-neutral-300 mb-5 leading-relaxed">
              Continuous RydeCam coverage will pause. Road incidents and collision shocks will not be automatically preserved while stopped.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowStopConfirm(false)}
                className="flex-1 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white font-semibold text-xs border border-neutral-600 transition"
              >
                Keep Recording
              </button>
              <button
                onClick={() => {
                  setShowStopConfirm(false);
                  onToggleRecording();
                }}
                className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold text-xs shadow-lg shadow-red-600/40 transition"
              >
                Stop Recording
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
