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
  Smartphone,
  Bell,
  VolumeX,
  Eye,
  Moon,
  Sun
} from 'lucide-react';
import {
  DashcamSettings,
  BillingEntitlements,
  StorageQuotaOption,
  VideoResolutionOption,
  SpeedUnitOption,
  SensitivityOption,
  NightModePreference,
  AmbientLightData
} from '../types/dashcam';
import { soundAlert } from '../services/soundAlertManager';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: DashcamSettings;
  entitlements: BillingEntitlements;
  ambientLight?: AmbientLightData;
  onSimulateLux?: (lux: number | null) => void;
  onUpdateSettings: (newSettings: Partial<DashcamSettings>) => void;
  onTriggerPaywall: () => void;
  onToggleSandboxPro: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  entitlements,
  ambientLight,
  onSimulateLux,
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
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl overflow-hidden border border-cyan-500/50 shadow-md bg-black shrink-0">
              <img
                src="/assets/aistudio/Neon_Road_Camera_Aperture_52fc4fc0.png"
                alt="RydeCam App Icon"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
                <span>RYDECAM CONFIGURATION</span>
              </h2>
              <p className="text-xs text-neutral-400">Automotive recording policies, quotas, and sensor calibration</p>
            </div>
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
              <div className="w-10 h-10 rounded-xl overflow-hidden border border-amber-500/50 shadow-md bg-black shrink-0 relative">
                <img
                  src="/assets/aistudio/Neon_Road_Camera_Aperture_52fc4fc0.png"
                  alt="RydeCam Pro Icon"
                  className="w-full h-full object-cover"
                />
                <div className="absolute -bottom-1 -right-1 bg-amber-500 rounded-full p-0.5 shadow">
                  <Star className="w-3 h-3 fill-black text-black" />
                </div>
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
            {/* Speed & Distance Units */}
            <div className="bg-neutral-950/60 border border-neutral-800 rounded-xl p-3.5">
              <span className="text-xs font-bold text-white block mb-1">Speed & Distance Units</span>
              <p className="text-[11px] text-neutral-400 mb-3">Telemetry on HUD, video watermarks & trip odometer</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onUpdateSettings({ speedUnit: 'KMH' })}
                  className={`py-2 px-2.5 rounded-lg text-left transition border ${
                    settings.speedUnit === 'KMH'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500 shadow-sm'
                      : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white'
                  }`}
                >
                  <div className="font-mono text-xs font-bold">km/hr</div>
                  <div className="text-[10px] text-neutral-400 mt-0.5 font-sans">Distance: km</div>
                </button>

                <button
                  type="button"
                  onClick={() => onUpdateSettings({ speedUnit: 'MPH' })}
                  className={`py-2 px-2.5 rounded-lg text-left transition border ${
                    settings.speedUnit === 'MPH'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500 shadow-sm'
                      : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white'
                  }`}
                >
                  <div className="font-mono text-xs font-bold">m/hr</div>
                  <div className="text-[10px] text-neutral-400 mt-0.5 font-sans">Distance: miles</div>
                </button>
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

          {/* SECTION 5: SPEED LIMIT DETECTION & OVERSPEED BEEP ALERTS */}
          <div className="bg-neutral-950/60 border border-neutral-800 rounded-xl p-4 space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-cyan-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                  5. Traffic Sign Recognition (TSR) & Speed Limit Alerts
                </h3>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.speedLimitAlertEnabled}
                  onChange={(e) => onUpdateSettings({ speedLimitAlertEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
              </label>
            </div>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Optical sign recognition identifies roadside speed limits. When your vehicle exceeds the posted limit, RydeCam warns you visually on the speedometer and plays acoustic alert chimes.
            </p>

            {settings.speedLimitAlertEnabled && (
              <div className="pt-2 border-t border-neutral-800/80 space-y-3">
                {/* Audio Beep Switch */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-amber-400" />
                    <div>
                      <span className="text-xs font-bold text-white block">Acoustic Warning Beeps</span>
                      <span className="text-[11px] text-neutral-400">Play dual-tone alert chime above the speed limit</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => soundAlert.playOverspeedBeep(true)}
                      className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-[10px] font-mono border border-neutral-700 transition"
                      title="Test the automotive warning chime"
                    >
                      Test Chime 🔔
                    </button>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.speedLimitBeepEnabled}
                        onChange={(e) => onUpdateSettings({ speedLimitBeepEnabled: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                    </label>
                  </div>
                </div>

                {/* Warning Tolerance Threshold */}
                <div>
                  <span className="text-[11px] font-bold text-neutral-300 block mb-1">
                    Alert Sensitivity & Tolerance Threshold
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { val: 0, label: 'Strict (+0)', desc: 'Instant alert' },
                      { val: 5, label: '+5 ' + (settings.speedUnit === 'MPH' ? 'mph' : 'km/h'), desc: 'Standard buffer' },
                      { val: 10, label: '+10 ' + (settings.speedUnit === 'MPH' ? 'mph' : 'km/h'), desc: 'Highway buffer' }
                    ].map(tol => (
                      <button
                        key={tol.val}
                        type="button"
                        onClick={() => onUpdateSettings({ speedLimitTolerance: tol.val })}
                        className={`p-2 rounded-lg text-left transition border ${
                          settings.speedLimitTolerance === tol.val
                            ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500 shadow-sm'
                            : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white'
                        }`}
                      >
                        <div className="font-mono text-xs font-bold">{tol.label}</div>
                        <div className="text-[9px] text-neutral-500">{tol.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* SECTION 6: AMBIENT LIGHT SENSING & NIGHT MODE */}
          <div className={`rounded-xl p-4 border transition-colors ${
            settings.nightModeEnabled
              ? 'bg-amber-950/40 border-amber-500/70 shadow-lg shadow-amber-950/40'
              : 'bg-neutral-950/60 border-neutral-800'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Moon className={`w-4 h-4 ${settings.nightModeEnabled ? 'text-amber-400' : 'text-cyan-400'}`} />
                <h3 className={`text-xs font-bold uppercase tracking-wider ${
                  settings.nightModeEnabled ? 'text-amber-400' : 'text-cyan-400'
                }`}>
                  6. Ambient Light Detection & Night Mode
                </h3>
                <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                  settings.nightModePreference === 'AUTO'
                    ? settings.nightModeEnabled
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                    : settings.nightModeEnabled
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-neutral-800 text-neutral-400 border-neutral-700'
                }`}>
                  {settings.nightModePreference === 'AUTO'
                    ? `AUTO (${settings.nightModeEnabled ? 'NIGHT' : 'DAY'})`
                    : settings.nightModeEnabled ? 'ALWAYS NIGHT' : 'ALWAYS DAY'}
                </span>
              </div>
            </div>

            <p className="text-xs text-neutral-400 leading-relaxed mb-3">
              RydeCam automatically senses ambient lighting using hardware light sensors, camera optical luminance analysis, and solar twilight coordinates to eliminate windshield glare at night and maximize daytime visibility.
            </p>

            {/* 3-Way Mode Selector */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[
                {
                  id: 'AUTO' as NightModePreference,
                  label: 'Auto Detect',
                  sub: 'Sensor & Camera',
                  icon: <Sun className="w-3.5 h-3.5 text-amber-400" />
                },
                {
                  id: 'ALWAYS_OFF' as NightModePreference,
                  label: 'Always Day',
                  sub: 'High Brightness',
                  icon: <Sun className="w-3.5 h-3.5 text-cyan-400" />
                },
                {
                  id: 'ALWAYS_ON' as NightModePreference,
                  label: 'Always Night',
                  sub: 'Anti-Glare Amber',
                  icon: <Moon className="w-3.5 h-3.5 text-amber-400" />
                }
              ].map(opt => {
                const isSelected = (settings.nightModePreference || 'AUTO') === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      const enabled = opt.id === 'ALWAYS_ON' ? true : opt.id === 'ALWAYS_OFF' ? false : (ambientLight?.isLowLight ?? false);
                      onUpdateSettings({
                        nightModePreference: opt.id,
                        nightModeEnabled: enabled
                      });
                    }}
                    className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                      isSelected
                        ? settings.nightModeEnabled
                          ? 'bg-amber-950/70 border-amber-400 text-amber-200 shadow-md shadow-amber-950/50'
                          : 'bg-cyan-950/50 border-cyan-400 text-white shadow-md'
                        : 'bg-neutral-900/80 border-neutral-800 text-neutral-400 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <div className="flex items-center gap-1.5 font-bold text-xs">
                        {opt.icon}
                        <span>{opt.label}</span>
                      </div>
                      {isSelected && (
                        <CheckCircle className={`w-3.5 h-3.5 ${settings.nightModeEnabled ? 'text-amber-400' : 'text-cyan-400'}`} />
                      )}
                    </div>
                    <span className="text-[10px] text-neutral-400">{opt.sub}</span>
                  </button>
                );
              })}
            </div>

            {/* Live Illuminance Diagnostic Gauge & Simulator */}
            <div className={`p-3 rounded-xl border ${
              settings.nightModeEnabled ? 'bg-black/70 border-amber-900/60' : 'bg-neutral-900/90 border-neutral-800'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-neutral-300">LIVE ILLUMINANCE SENSOR:</span>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold border ${
                    ambientLight?.source === 'SIMULATED'
                      ? 'bg-purple-950 text-purple-300 border-purple-800'
                      : ambientLight?.source === 'HARDWARE_SENSOR'
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                      : ambientLight?.source === 'CAMERA_OPTICAL'
                      ? 'bg-cyan-950 text-cyan-300 border-cyan-800'
                      : 'bg-blue-950 text-blue-300 border-blue-800'
                  }`}>
                    {ambientLight?.source ?? 'CAMERA_OPTICAL'}
                  </span>
                </div>
                <div className="font-mono text-xs font-bold flex items-center gap-1.5">
                  <span className={settings.nightModeEnabled ? 'text-amber-300' : 'text-cyan-300'}>
                    {Math.round(ambientLight?.lux ?? 0)} LUX
                  </span>
                  <span className="text-[10px] text-neutral-500 font-normal">
                    (Threshold: {settings.autoNightLuxThreshold || 25} lx)
                  </span>
                </div>
              </div>

              {/* Lux Progress Bar */}
              <div className="w-full bg-neutral-800 h-2.5 rounded-full overflow-hidden relative mb-2">
                <div
                  className={`h-full transition-all duration-300 ${
                    settings.nightModeEnabled
                      ? 'bg-gradient-to-r from-amber-600 to-amber-400'
                      : 'bg-gradient-to-r from-cyan-600 to-cyan-400'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(3, ((ambientLight?.lux ?? 0) / 100) * 100))}%` }}
                />
                {/* Threshold Marker line at configured threshold */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-red-400"
                  style={{ left: `${Math.min(100, ((settings.autoNightLuxThreshold || 25) / 100) * 100)}%` }}
                  title={`Trigger Threshold: ${settings.autoNightLuxThreshold || 25} Lux`}
                />
              </div>

              <div className="flex items-center justify-between text-[10px] text-neutral-500 font-mono mb-3">
                <span>0 lx (Pitch Dark)</span>
                <span className="text-red-400 font-bold">▲ Cutoff ({settings.autoNightLuxThreshold || 25} lx)</span>
                <span>100+ lx (Daylight)</span>
              </div>

              {/* Threshold adjustment buttons */}
              <div className="mb-3 pt-2 border-t border-neutral-800/80">
                <span className="text-[11px] font-bold text-neutral-300 block mb-1.5">
                  Night Mode Light Sensitivity Cutoff:
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { val: 15, label: '15 Lux', desc: 'Dark night / Unlit tunnel' },
                    { val: 25, label: '25 Lux', desc: 'Standard dusk / Light tunnel' },
                    { val: 45, label: '45 Lux', desc: 'Overcast / Early twilight' }
                  ].map(lvl => (
                    <button
                      key={lvl.val}
                      type="button"
                      onClick={() => onUpdateSettings({ autoNightLuxThreshold: lvl.val })}
                      className={`p-2 rounded-lg text-left transition border ${
                        (settings.autoNightLuxThreshold || 25) === lvl.val
                          ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500 shadow-sm'
                          : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white'
                      }`}
                    >
                      <div className="font-mono text-xs font-bold">{lvl.label}</div>
                      <div className="text-[9px] text-neutral-500">{lvl.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Instant Simulation Testing Triggers */}
              <div className="pt-2 border-t border-neutral-800/80 flex flex-wrap items-center justify-between gap-2">
                <span className="text-[10px] font-mono text-neutral-400">Light Simulator Test:</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => onSimulateLux?.(8)}
                    className="px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-amber-300 text-[10px] font-mono border border-neutral-700 transition"
                  >
                    Tunnel (8 Lux) 🚇
                  </button>
                  <button
                    type="button"
                    onClick={() => onSimulateLux?.(450)}
                    className="px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-cyan-300 text-[10px] font-mono border border-neutral-700 transition"
                  >
                    Sunlight (450 Lux) ☀️
                  </button>
                  {ambientLight?.source === 'SIMULATED' && (
                    <button
                      type="button"
                      onClick={() => onSimulateLux?.(null)}
                      className="px-2 py-1 rounded bg-red-950/80 hover:bg-red-900 text-red-200 text-[10px] font-mono border border-red-800 transition"
                    >
                      Reset Sensor ↺
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 7: IN-CABIN AUDIO RECORDING */}
          <div className="bg-neutral-950/60 border border-neutral-800 rounded-xl p-3.5 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-cyan-400" />
                <span className="text-sm font-bold text-white">7. Record Cabin Audio</span>
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
