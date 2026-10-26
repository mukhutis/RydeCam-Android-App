import React from 'react';
import {
  X,
  Lock,
  Star,
  HardDrive,
  Video,
  Shield,
  Gauge,
  Volume2,
  Clock,
  Compass,
  CheckCircle,
  Smartphone
} from 'lucide-react';
import { DashcamSettings, BillingEntitlements, StorageQuotaOption, VideoResolutionOption, SpeedUnitOption, SensitivityOption } from '../types/dashcam';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: DashcamSettings;
  entitlements: BillingEntitlements;
  onUpdateSettings: (newSettings: Partial<DashcamSettings>) => void;
  onTriggerPaywall: () => void;
  onToggleSandboxPro: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  entitlements,
  onUpdateSettings,
  onTriggerPaywall,
  onToggleSandboxPro
}) => {
  if (!isOpen) return null;

  const quotas: StorageQuotaOption[] = [8, 16, 32, 64];

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 select-none animate-fadeIn">
      <div className="bg-neutral-900 border border-neutral-700/80 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">

        {/* Modal Header */}
        <div className="p-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-950/70">
          <div>
            <h2 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-cyan-400" />
              <span>RYDECAM CONFIGURATION</span>
            </h2>
            <p className="text-xs text-neutral-400">Automotive recording policies, quotas, and sensor calibration</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Settings Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">

          {/* Pro Status Banner */}
          <div
            onClick={onTriggerPaywall}
            className={`p-4 rounded-xl border flex items-center justify-between cursor-pointer transition ${
              entitlements.isProUnlocked
                ? 'bg-emerald-950/40 border-emerald-600/60 hover:bg-emerald-950/60'
                : 'bg-amber-950/30 border-amber-600/60 hover:bg-amber-950/50'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-amber-500/20 text-amber-300">
                <Star className="w-6 h-6 fill-amber-400 text-amber-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-white">
                    {entitlements.isProUnlocked ? 'RYDECAM PRO UNLOCKED' : 'UPGRADE TO RYDECAM PRO'}
                  </span>
                  {entitlements.isProUnlocked && (
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 px-2 py-0.5 rounded font-bold">
                      ACTIVE
                    </span>
                  )}
                </div>
                <p className="text-xs text-neutral-400 mt-0.5">
                  {entitlements.isProUnlocked
                    ? '64 GB Quota, 4K UHD, and Front Cabin Dual-Camera recording active'
                    : 'Unlock 64GB storage quota, 4K Ultra HD video, and dual cabin recording'}
                </p>
              </div>
            </div>

            <button className="text-xs font-bold text-amber-300 bg-amber-500/20 hover:bg-amber-500/30 px-3 py-1.5 rounded-lg border border-amber-500/40 transition">
              {entitlements.isProUnlocked ? 'Manage Plan' : 'Unlock Pro'}
            </button>
          </div>

          {/* SECTION 1: STORAGE QUOTA & FIFO */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <HardDrive className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                1. Storage Quota (FIFO Auto-Deletion)
              </h3>
            </div>
            <p className="text-xs text-neutral-400 mb-3 leading-relaxed">
              When logical quota is reached, the oldest eligible unprotected recordings are deleted first. Protected incident clips are never deleted.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {quotas.map(quota => {
                const is64GbPro = quota === 64;
                const isSelected = settings.storageQuotaGb === quota;

                return (
                  <button
                    key={quota}
                    onClick={() => {
                      if (is64GbPro && !entitlements.canUse64GbQuota) {
                        onTriggerPaywall();
                      } else {
                        onUpdateSettings({ storageQuotaGb: quota });
                      }
                    }}
                    className={`relative p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                      isSelected
                        ? 'bg-cyan-950/60 border-cyan-400 text-white shadow-lg shadow-cyan-950/50'
                        : 'bg-neutral-950/60 border-neutral-800 text-neutral-300 hover:border-neutral-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold font-mono">{quota} GB</span>
                      {is64GbPro ? (
                        <span className="flex items-center gap-0.5 text-[9px] font-bold bg-amber-500 text-black px-1.5 py-0.5 rounded">
                          <Lock className="w-2.5 h-2.5" />
                          PRO
                        </span>
                      ) : (
                        <span className="text-[10px] text-neutral-500">Free</span>
                      )}
                    </div>
                    <span className="text-[10px] text-neutral-400 mt-2">
                      {is64GbPro ? '~8+ hours road time' : quota === 8 ? '~1 hour' : quota === 16 ? '~2 hours' : '~4 hours'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* SECTION 2: VIDEO RESOLUTION & DUAL CAMERAS */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Video className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                2. Video Resolution & Dual Camera
              </h3>
            </div>

            <div className="bg-neutral-950/60 border border-neutral-800 rounded-xl divide-y divide-neutral-800/80">
              {/* 1080p */}
              <div
                onClick={() => onUpdateSettings({ videoResolution: '1080p' })}
                className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-neutral-800/40 transition"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">1080p Full HD (30 FPS)</span>
                    <span className="text-[10px] font-semibold bg-neutral-800 text-neutral-300 px-2 py-0.5 rounded">Default / Free</span>
                  </div>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Recommended for low battery drain, optimal temperature, and sustained reliability.
                  </p>
                </div>
                <div
                  className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                    settings.videoResolution === '1080p'
                      ? 'border-cyan-400 bg-cyan-500/20'
                      : 'border-neutral-700'
                  }`}
                >
                  {settings.videoResolution === '1080p' && (
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                  )}
                </div>
              </div>

              {/* 4K */}
              <div
                onClick={() => {
                  if (!entitlements.canUse4kResolution) {
                    onTriggerPaywall();
                  } else {
                    onUpdateSettings({ videoResolution: '4K' });
                  }
                }}
                className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-neutral-800/40 transition"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">4K Ultra HD (3840×2160)</span>
                    <span className="flex items-center gap-1 text-[10px] font-bold bg-amber-500 text-black px-1.5 py-0.5 rounded">
                      <Lock className="w-2.5 h-2.5" />
                      PRO
                    </span>
                  </div>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Crisp license-plate detail; queries device camera HAL for hardware encoder support.
                  </p>
                </div>
                <div
                  className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                    settings.videoResolution === '4K'
                      ? 'border-amber-400 bg-amber-500/20'
                      : 'border-neutral-700'
                  }`}
                >
                  {settings.videoResolution === '4K' && (
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  )}
                </div>
              </div>

              {/* Front Camera Dual Stream */}
              <div className="p-3.5 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">Dual Cabin / Front Camera</span>
                    <span className="flex items-center gap-1 text-[10px] font-bold bg-amber-500 text-black px-1.5 py-0.5 rounded">
                      <Lock className="w-2.5 h-2.5" />
                      PRO
                    </span>
                  </div>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Simultaneous road and interior cabin selfie recording on supported concurrent cameras.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.frontCameraEnabled}
                    onChange={(e) => {
                      if (!entitlements.canUseFrontCamera && e.target.checked) {
                        onTriggerPaywall();
                      } else {
                        onUpdateSettings({ frontCameraEnabled: e.target.checked });
                      }
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
                </label>
              </div>
            </div>
          </div>

          {/* SECTION 3: ACCIDENT DETECTION & SENSITIVITY */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                3. G-Sensor Collision Detection & Rolling 60s Buffer
              </h3>
            </div>
            <p className="text-xs text-neutral-400 mb-3">
              Isolates vehicle shocks using gravity filtering. On impact, retains the previous 60 seconds and 30 seconds post-event to protected storage.
            </p>

            <div className="bg-neutral-950/60 border border-neutral-800 rounded-xl p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-bold text-white">Enable Collision Monitoring</span>
                  <p className="text-xs text-neutral-400">Continuously monitors accelerometer vectors</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.accidentDetectionEnabled}
                    onChange={(e) => onUpdateSettings({ accidentDetectionEnabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>

              {settings.accidentDetectionEnabled && (
                <div className="pt-3 border-t border-neutral-800/80">
                  <span className="text-xs font-semibold text-neutral-300 block mb-2">
                    Shock Trigger Sensitivity:
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { level: 'LOW' as SensitivityOption, label: 'Low (3.5G)', desc: 'Heavy impacts only' },
                      { level: 'MEDIUM' as SensitivityOption, label: 'Med (2.5G)', desc: 'Standard collision' },
                      { level: 'HIGH' as SensitivityOption, label: 'High (1.8G)', desc: 'Firm road shocks' }
                    ].map(s => (
                      <button
                        key={s.level}
                        onClick={() => onUpdateSettings({ accidentSensitivity: s.level })}
                        className={`p-2.5 rounded-lg border text-left transition ${
                          settings.accidentSensitivity === s.level
                            ? 'bg-emerald-950/60 border-emerald-500 text-white'
                            : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
                        }`}
                      >
                        <span className="text-xs font-bold block">{s.label}</span>
                        <span className="text-[10px] text-neutral-500">{s.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* SECTION 4: SPEED UNITS & SEGMENT DURATION */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Speed Unit */}
            <div className="bg-neutral-950/60 border border-neutral-800 rounded-xl p-3.5">
              <span className="text-xs font-bold text-white block mb-1">Speed Display Units</span>
              <p className="text-[11px] text-neutral-400 mb-3">Unit shown on HUD and burned to video</p>
              <div className="flex gap-2">
                {(['KMH', 'MPH'] as SpeedUnitOption[]).map(unit => (
                  <button
                    key={unit}
                    onClick={() => onUpdateSettings({ speedUnit: unit })}
                    className={`flex-1 py-1.5 rounded-lg font-mono text-xs font-bold transition border ${
                      settings.speedUnit === unit
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500'
                        : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white'
                    }`}
                  >
                    {unit}
                  </button>
                ))}
              </div>
            </div>

            {/* Segment Length */}
            <div className="bg-neutral-950/60 border border-neutral-800 rounded-xl p-3.5">
              <span className="text-xs font-bold text-white block mb-1">Segment Duration</span>
              <p className="text-[11px] text-neutral-400 mb-3">File rotation interval</p>
              <div className="flex gap-2">
                {[1, 2, 3].map(min => (
                  <button
                    key={min}
                    onClick={() => onUpdateSettings({ segmentLengthMinutes: min })}
                    className={`flex-1 py-1.5 rounded-lg font-mono text-xs font-bold transition border ${
                      settings.segmentLengthMinutes === min
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500'
                        : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white'
                    }`}
                  >
                    {min} MIN
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* SECTION 5: IN-CABIN AUDIO RECORDING */}
          <div className="bg-neutral-950/60 border border-neutral-800 rounded-xl p-3.5 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-cyan-400" />
                <span className="text-sm font-bold text-white">Record Cabin Audio</span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                Microphone permission requested only when enabled. Disabled by default for privacy.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.audioRecordingEnabled}
                onChange={(e) => onUpdateSettings({ audioRecordingEnabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
            </label>
          </div>

          {/* Sandbox Toggle for Quick Testing */}
          <div className="pt-3 border-t border-neutral-800 flex items-center justify-between text-xs">
            <span className="text-neutral-500 font-mono">Developer Testing Sandbox:</span>
            <button
              onClick={onToggleSandboxPro}
              className="text-xs font-semibold text-neutral-400 hover:text-cyan-400 underline"
            >
              {entitlements.isProUnlocked ? 'Simulate Free Tier' : 'Simulate Google Play Pro Unlock'}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
