import React, { useState } from 'react';
import {
  ShieldAlert,
  Map,
  Settings,
  FolderOpen,
  Mic,
  MicOff,
  BatteryCharging,
  Thermometer,
  Lock,
  Play,
  Square,
  Zap,
  Activity,
  Layers,
  Sparkles,
  Video
} from 'lucide-react';
import { StorageStats, TelemetryData, VideoResolutionOption, SpeedUnitOption } from '../types/dashcam';

interface DashcamHUDProps {
  isRecording: boolean;
  recordingElapsedSec: number;
  telemetry: TelemetryData;
  storageStats: StorageStats;
  resolution: VideoResolutionOption;
  isAudioEnabled: boolean;
  speedUnit: SpeedUnitOption;
  currentGForce: number;
  activeIncidentMessage: string | null;
  onToggleRecording: () => void;
  onTriggerManualLock: () => void;
  onSimulateShock: (gForce: number, label: string) => void;
  onOpenLibrary: () => void;
  onOpenSettings: () => void;
  onOpenNavCompanion: () => void;
  onOpenProjectExplorer: () => void;
  onOpenTestRunner: () => void;
}

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
  onToggleRecording,
  onTriggerManualLock,
  onSimulateShock,
  onOpenLibrary,
  onOpenSettings,
  onOpenNavCompanion,
  onOpenProjectExplorer,
  onOpenTestRunner
}) => {
  const [showStopConfirm, setShowStopConfirm] = useState(false);

  const displaySpeed = telemetry.isGpsLocked && !telemetry.isSignalStale
    ? Math.round(speedUnit === 'MPH' ? telemetry.speedMph : telemetry.speedKmh)
    : '--';

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

            <div className="hidden sm:flex items-center gap-1 text-[11px] text-neutral-300 bg-neutral-900/90 px-2 py-0.5 rounded border border-neutral-700/60">
              <BatteryCharging className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-mono">12V CHARGING</span>
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

        {/* Speedometer numerals */}
        <div className="flex items-baseline justify-center">
          <span className="font-mono text-7xl sm:text-8xl md:text-9xl font-black text-emerald-400 tracking-tighter drop-shadow-[0_4px_24px_rgba(16,185,129,0.35)]">
            {displaySpeed}
          </span>
          <span className="text-xl sm:text-2xl font-black text-emerald-300/80 ml-2 tracking-wider">
            {speedUnit}
          </span>
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
