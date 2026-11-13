import React, { useState } from 'react';
import {
  X,
  MapPin,
  Compass,
  ExternalLink,
  Smartphone,
  Navigation,
  Info,
  ArrowLeftRight,
  CornerUpRight,
  CornerUpLeft,
  Lock,
  Video
} from 'lucide-react';
import { DriveSideOption, TrafficSideOption, SpeedUnitOption } from '../types/dashcam';

interface CompanionNavModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedNavApp: string;
  onSelectNavApp: (appKey: string) => void;
  driveSide?: DriveSideOption;
  onToggleDriveSide?: () => void;
  trafficSide?: TrafficSideOption;
  onToggleTrafficSide?: () => void;
  nightModeEnabled?: boolean;
  speedUnit?: SpeedUnitOption;
}

export const CompanionNavModal: React.FC<CompanionNavModalProps> = ({
  isOpen,
  onClose,
  selectedNavApp,
  onSelectNavApp,
  driveSide = 'LHD',
  onToggleDriveSide,
  trafficSide = 'RIGHT',
  onToggleTrafficSide,
  nightModeEnabled = false,
  speedUnit = 'KMH'
}) => {
  const [destination, setDestination] = useState('');

  if (!isOpen) return null;

  const isRhd = driveSide === 'RHD';
  const isLeftTraffic = trafficSide === 'LEFT';
  const isMph = speedUnit === 'MPH';

  const navApps = [
    {
      id: 'google_maps',
      name: 'Google Maps Navigation',
      desc: 'Default Android automotive companion',
      package: 'com.google.android.apps.maps',
      webUrl: (q: string) => `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(q || 'Current Location')}`
    },
    {
      id: 'waze',
      name: 'Waze Live Traffic & Police Alerts',
      desc: 'Community-driven hazard alerts',
      package: 'com.waze',
      webUrl: (q: string) => `https://www.waze.com/ul?q=${encodeURIComponent(q || 'Traffic')}`
    },
    {
      id: 'osm',
      name: 'OsmAnd Offline Maps',
      desc: 'OpenStreetMap vector navigation',
      package: 'net.osmand',
      webUrl: () => 'https://www.openstreetmap.org'
    }
  ];

  const activeApp = navApps.find(a => a.id === selectedNavApp) || navApps[0];
  const launchUrl = activeApp.webUrl(destination);

  const accentText = nightModeEnabled ? 'text-amber-400' : 'text-cyan-400';
  const accentStroke = nightModeEnabled ? '#f59e0b' : '#22d3ee';
  const laneStroke = nightModeEnabled ? '#fbbf24' : '#facc15';

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 select-none animate-fadeIn">
      <div className={`rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border transition-colors ${
        nightModeEnabled
          ? 'bg-neutral-950 border-amber-900/70'
          : 'bg-neutral-900 border-neutral-700/80'
      }`}>

        {/* Modal Header (Adapts close button & title side to LHD vs RHD) */}
        <div className={`p-4 border-b flex items-center justify-between gap-3 transition-all ${
          isRhd ? 'flex-row-reverse text-right' : 'flex-row text-left'
        } ${
          nightModeEnabled ? 'border-amber-950/80 bg-black/80' : 'border-neutral-800 bg-neutral-950/70'
        }`}>
          <div>
            <h2 className={`text-base font-bold text-white tracking-wide flex items-center gap-2 ${
              isRhd ? 'flex-row-reverse' : 'flex-row'
            }`}>
              <Compass className={`w-5 h-5 ${accentText}`} />
              <span>RYDECAM COMPANION NAVIGATION</span>
            </h2>
            <p className="text-xs text-neutral-400">
              Car: {isRhd ? 'Right-Hand Drive (RHD)' : 'Left-Hand Drive (LHD)'} · Road: {isLeftTraffic ? 'Drive on the Left' : 'Drive on the Right'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition shrink-0"
            title="Close Companion Navigation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* Independent Car Steering & Road Traffic Orientation Controls */}
          <div className={`rounded-xl border p-3.5 space-y-3 ${
            nightModeEnabled
              ? 'bg-black/70 border-amber-900/60'
              : 'bg-neutral-950/70 border-neutral-800'
          }`}>
            <div className={`flex items-center gap-2 ${isRhd ? 'flex-row-reverse text-right' : 'flex-row text-left'}`}>
              <ArrowLeftRight className={`w-4 h-4 shrink-0 ${accentText}`} />
              <div>
                <span className="text-xs font-bold text-white block">Cockpit & Road Orientation</span>
                <span className="text-[11px] text-neutral-400">
                  Car Steering controls button & pane placement · Road Traffic controls route lanes & road signs
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2.5">
              {/* Toggle 1: Car Steering Side (LHD vs RHD) */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 whitespace-nowrap">
                  Car Steering:
                </span>
                <div className="flex items-center p-1 rounded-lg bg-neutral-900 border border-neutral-800 gap-1">
                  <button
                    type="button"
                    onClick={() => { if (isRhd && onToggleDriveSide) onToggleDriveSide(); }}
                    className={`px-2.5 py-1 rounded-md text-xs font-mono font-bold transition whitespace-nowrap shrink-0 ${
                      !isRhd
                        ? nightModeEnabled
                          ? 'bg-amber-600 text-black shadow-sm'
                          : 'bg-cyan-600 text-white shadow-sm'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    LHD Car
                  </button>
                  <button
                    type="button"
                    onClick={() => { if (!isRhd && onToggleDriveSide) onToggleDriveSide(); }}
                    className={`px-2.5 py-1 rounded-md text-xs font-mono font-bold transition whitespace-nowrap shrink-0 ${
                      isRhd
                        ? nightModeEnabled
                          ? 'bg-amber-600 text-black shadow-sm'
                          : 'bg-cyan-600 text-white shadow-sm'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    RHD Car
                  </button>
                </div>
              </div>

              {/* Toggle 2: Road Traffic Side (Drive Right vs Drive Left) */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 whitespace-nowrap">
                  Road Traffic:
                </span>
                <div className="flex items-center p-1 rounded-lg bg-neutral-900 border border-neutral-800 gap-1">
                  <button
                    type="button"
                    onClick={() => { if (isLeftTraffic && onToggleTrafficSide) onToggleTrafficSide(); }}
                    className={`px-2.5 py-1 rounded-md text-xs font-mono font-bold transition whitespace-nowrap shrink-0 ${
                      !isLeftTraffic
                        ? nightModeEnabled
                          ? 'bg-amber-600 text-black shadow-sm'
                          : 'bg-emerald-600 text-white shadow-sm'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    Drive Right
                  </button>
                  <button
                    type="button"
                    onClick={() => { if (!isLeftTraffic && onToggleTrafficSide) onToggleTrafficSide(); }}
                    className={`px-2.5 py-1 rounded-md text-xs font-mono font-bold transition whitespace-nowrap shrink-0 ${
                      isLeftTraffic
                        ? nightModeEnabled
                          ? 'bg-amber-600 text-black shadow-sm'
                          : 'bg-emerald-600 text-white shadow-sm'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    Drive Left
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Animated Live Split-Screen Companion Preview */}
          <div className={`rounded-xl border overflow-hidden ${
            nightModeEnabled ? 'border-amber-900/60 bg-black' : 'border-neutral-800 bg-neutral-950'
          }`}>
            <div className={`px-3 py-2 border-b flex items-center justify-between text-[11px] font-mono ${
              isRhd ? 'flex-row-reverse' : 'flex-row'
            } ${
              nightModeEnabled ? 'border-amber-950 bg-neutral-950 text-amber-300' : 'border-neutral-800 bg-neutral-900/80 text-neutral-300'
            }`}>
              <span className="font-bold">
                LIVE SPLIT-SCREEN PREVIEW ({driveSide} · {isLeftTraffic ? 'DRIVE-L' : 'DRIVE-R'})
              </span>
              <span className="text-neutral-400">
                {isRhd ? 'Driver Side: RIGHT →' : '← Driver Side: LEFT'} · {isLeftTraffic ? 'Left Lane' : 'Right Lane'}
              </span>
            </div>

            {/* Split-Screen Canvas: Flips Left/Right halves dynamically on LHD vs RHD */}
            <div className={`p-3 grid grid-cols-1 sm:grid-cols-2 gap-3 transition-all duration-300`}>
              {/* Pane 1: Companion Navigation Pane (Left in LHD, Right in RHD) */}
              <div className={`rounded-lg border overflow-hidden flex min-h-[156px] transition-all duration-300 ${
                isRhd ? 'sm:order-2 flex-row-reverse' : 'sm:order-1 flex-row'
              } ${
                nightModeEnabled ? 'border-amber-800/60 bg-neutral-950' : 'border-cyan-800/50 bg-neutral-900/90'
              }`}>
                {/* Driver-Side Dock Rail inside Companion App */}
                <div className={`w-11 py-2 flex flex-col items-center justify-between shrink-0 ${
                  isRhd ? 'border-l' : 'border-r'
                } ${
                  nightModeEnabled ? 'bg-black border-amber-950' : 'bg-neutral-950 border-neutral-800'
                }`}>
                  <div className={`w-7 h-7 rounded-md flex items-center justify-center ${
                    nightModeEnabled ? 'bg-amber-500/20 text-amber-300' : 'bg-cyan-500/20 text-cyan-300'
                  }`}>
                    <Navigation className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex flex-col gap-1.5 items-center">
                    <span className={`w-2 h-2 rounded-full ${nightModeEnabled ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                    <span className="text-[8px] font-mono text-neutral-400">{driveSide}</span>
                  </div>
                  <div className="w-7 h-7 rounded-md bg-neutral-800 flex items-center justify-center text-neutral-300">
                    <MapPin className="w-3.5 h-3.5" />
                  </div>
                </div>

                {/* Animated Turn-by-Turn Vector Route */}
                <div className="flex-1 p-2.5 flex flex-col justify-between relative overflow-hidden">
                  <div className={`flex items-center justify-between gap-2 z-10 ${
                    isRhd ? 'flex-row-reverse text-right' : 'flex-row text-left'
                  }`}>
                    <div className={`flex items-center gap-1.5 ${isRhd ? 'flex-row-reverse' : 'flex-row'}`}>
                      {isLeftTraffic ? (
                        <CornerUpLeft className={`w-5 h-5 ${accentText}`} />
                      ) : (
                        <CornerUpRight className={`w-5 h-5 ${accentText}`} />
                      )}
                      <div>
                        <div className="text-xs font-bold text-white leading-tight">
                          {destination.trim() ? destination.trim() : (isLeftTraffic ? 'Keep Left · 350 m' : 'Keep Right · 350 m')}
                        </div>
                        <div className="text-[10px] font-mono text-neutral-400">
                          {activeApp.name.split(' ')[0]} · {isMph ? '42 mph ETA 12m' : '68 km/h ETA 12m'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Animated SVG Road Route (Lanes mirror accurately between Drive-Left and Drive-Right) */}
                  <div className="mt-2 h-20 w-full rounded bg-black/50 border border-neutral-800/80 overflow-hidden relative">
                    <svg viewBox="0 0 240 90" className="w-full h-full">
                      {/* Road Corridor */}
                      <polygon
                        points="92,6 148,6 218,88 22,88"
                        fill="#171717"
                        stroke="#334155"
                        strokeWidth="1.5"
                      />
                      {/* Animated Center Divider Dashed Line */}
                      <line
                        x1="120"
                        y1="6"
                        x2="120"
                        y2="88"
                        stroke={laneStroke}
                        strokeWidth="2.5"
                        strokeDasharray="10 8"
                      >
                        <animate
                          attributeName="stroke-dashoffset"
                          from="18"
                          to="0"
                          dur="0.65s"
                          repeatCount="indefinite"
                        />
                      </line>
                      {/* Active Travel Path Highlight (Right lane in Drive-Right, Left lane in Drive-Left) */}
                      <path
                        d={isLeftTraffic ? 'M 72 82 L 106 14' : 'M 168 82 L 134 14'}
                        stroke={accentStroke}
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeDasharray="8 6"
                        fill="none"
                      >
                        <animate
                          attributeName="stroke-dashoffset"
                          from="14"
                          to="0"
                          dur="0.5s"
                          repeatCount="indefinite"
                        />
                      </path>
                      {/* Navigation Arrow Puck */}
                      <polygon
                        points={isLeftTraffic ? '76,66 64,79 76,75 88,79' : '164,66 152,79 164,75 176,79'}
                        fill={accentStroke}
                      />
                      {/* Oncoming Lane Indicator Arrow */}
                      <text
                        x={isLeftTraffic ? '164' : '76'}
                        y="56"
                        textAnchor="middle"
                        fill="#94a3b8"
                        fontSize="9"
                        fontFamily="monospace"
                      >
                        ONCOMING
                      </text>
                    </svg>
                  </div>
                </div>
              </div>

              {/* Pane 2: RydeCam Dashcam Mini-HUD (Right in LHD, Left in RHD) */}
              <div className={`rounded-lg border p-2.5 flex flex-col justify-between min-h-[156px] transition-all duration-300 ${
                isRhd ? 'sm:order-1' : 'sm:order-2'
              } ${
                nightModeEnabled ? 'border-amber-900/50 bg-black' : 'border-neutral-800 bg-neutral-950'
              }`}>
                <div className={`flex items-center justify-between text-[10px] font-mono ${
                  isRhd ? 'flex-row-reverse' : 'flex-row'
                }`}>
                  <div className="flex items-center gap-1.5 text-red-400 font-bold">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    <Video className="w-3 h-3" />
                    <span>RYDECAM REC</span>
                  </div>
                  <span className="text-neutral-400">
                    {isLeftTraffic ? 'L-Curb TSR' : 'R-Curb TSR'}
                  </span>
                </div>

                {/* Animated Mini Dashcam Highway Feed */}
                <div className="my-2 h-20 rounded bg-neutral-900 border border-neutral-800 overflow-hidden relative">
                  <svg viewBox="0 0 240 90" className="w-full h-full">
                    {/* Horizon */}
                    <rect x="0" y="0" width="240" height="32" fill="#090d16" />
                    {/* Perspective Asphalt */}
                    <polygon
                      points={isLeftTraffic ? '128,32 142,32 232,90 8,90' : '98,32 112,32 232,90 8,90'}
                      fill="#18181b"
                    />
                    {/* Animated Yellow Divider */}
                    <line
                      x1={isLeftTraffic ? '135' : '105'}
                      y1="32"
                      x2={isLeftTraffic ? '135' : '105'}
                      y2="90"
                      stroke="#facc15"
                      strokeWidth="2"
                      strokeDasharray="7 6"
                    >
                      <animate
                        attributeName="stroke-dashoffset"
                        from="13"
                        to="0"
                        dur="0.55s"
                        repeatCount="indefinite"
                      />
                    </line>
                    {/* Lead Car in Travel Lane (Tail lights) */}
                    <g transform={isLeftTraffic ? 'translate(68, 52)' : 'translate(150, 52)'}>
                      <rect x="0" y="0" width="24" height="14" rx="2" fill="#38bdf8" />
                      <rect x="2" y="8" width="5" height="3" fill="#ef4444" />
                      <rect x="17" y="8" width="5" height="3" fill="#ef4444" />
                    </g>
                    {/* Oncoming Car in Opposite Lane (Headlights) */}
                    <g transform={isLeftTraffic ? 'translate(166, 54)' : 'translate(50, 54)'}>
                      <rect x="0" y="0" width="22" height="13" rx="2" fill="#e11d48" />
                      <rect x="2" y="7" width="5" height="3" fill="#fef9c3" />
                      <rect x="15" y="7" width="5" height="3" fill="#fef9c3" />
                    </g>
                    {/* Roadside TSR Sign Circle on Curb Side */}
                    <g transform={isLeftTraffic ? 'translate(18, 42)' : 'translate(206, 42)'}>
                      <line x1="8" y1="12" x2="8" y2="30" stroke="#94a3b8" strokeWidth="2" />
                      <circle cx="8" cy="8" r="8" fill="#ffffff" stroke="#dc2626" strokeWidth="2.5" />
                      <text x="8" y="10.5" textAnchor="middle" fill="#000" fontSize="7" fontWeight="bold">
                        {isMph ? '40' : '60'}
                      </text>
                    </g>
                  </svg>
                </div>

                {/* Mini HUD Quick-Action Dock (LOCK & Speed on driver side) */}
                <div className={`flex items-center justify-between text-[10px] font-mono ${
                  isRhd ? 'flex-row-reverse' : 'flex-row'
                }`}>
                  <span className="flex items-center gap-1 text-amber-300 font-bold">
                    <Lock className="w-3 h-3" />
                    LOCK READY
                  </span>
                  <span className="text-neutral-400">
                    {isRhd ? 'Cam PiP: Left' : 'Cam PiP: Right'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Destination Input & Launch Button (Launch button moves to driver side: Left for LHD, Right for RHD) */}
          <div>
            <label className={`text-xs font-bold text-neutral-300 block mb-1.5 ${
              isRhd ? 'text-right' : 'text-left'
            }`}>
              SET NAVIGATION DESTINATION ({isRhd ? 'LAUNCH ON RIGHT FOR RHD' : 'LAUNCH ON LEFT FOR LHD'})
            </label>
            <div className={`flex items-center gap-2 ${
              isRhd ? 'flex-row' : 'flex-row-reverse'
            }`}>
              <div className="relative flex-1">
                <MapPin className={`w-4 h-4 ${accentText} absolute top-1/2 -translate-y-1/2 ${
                  isRhd ? 'right-3' : 'left-3'
                }`} />
                <input
                  type="text"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="e.g. San Francisco Airport or 123 Main St"
                  className={`w-full bg-neutral-950 border border-neutral-800 rounded-xl py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-400 font-medium ${
                    isRhd ? 'pr-9 pl-3 text-right' : 'pl-9 pr-3 text-left'
                  }`}
                />
              </div>
              <a
                href={launchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`px-4 py-2 font-bold text-xs rounded-xl shadow-lg transition flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
                  nightModeEnabled
                    ? 'bg-amber-600 hover:bg-amber-500 text-black shadow-amber-600/30'
                    : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-600/30'
                }`}
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>Launch App</span>
                <ExternalLink className="w-3 h-3 opacity-80" />
              </a>
            </div>
          </div>

          {/* Navigation App Selector */}
          <div>
            <span className={`text-xs font-bold text-neutral-300 block mb-2 ${
              isRhd ? 'text-right' : 'text-left'
            }`}>
              SELECT COMPANION NAVIGATION APP
            </span>
            <div className="space-y-2">
              {navApps.map(app => {
                const isSelected = selectedNavApp === app.id;
                return (
                  <button
                    key={app.id}
                    type="button"
                    onClick={() => onSelectNavApp(app.id)}
                    className={`w-full p-3 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                      isRhd ? 'flex-row-reverse text-right' : 'flex-row text-left'
                    } ${
                      isSelected
                        ? nightModeEnabled
                          ? 'bg-amber-950/40 border-amber-400 text-white shadow-lg'
                          : 'bg-cyan-950/50 border-cyan-400 text-white shadow-lg shadow-cyan-950/40'
                        : 'bg-neutral-950/60 border-neutral-800 text-neutral-300 hover:border-neutral-700'
                    }`}
                  >
                    <div>
                      <div className={`flex items-center gap-2 ${isRhd ? 'flex-row-reverse' : 'flex-row'}`}>
                        <span className="text-xs font-bold">{app.name}</span>
                        {app.id === 'google_maps' && (
                          <span className="text-[9px] bg-neutral-800 text-cyan-300 px-1.5 py-0.5 rounded font-bold">
                            Default
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-neutral-400 font-mono mt-0.5">{app.package}</p>
                    </div>

                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                        isSelected
                          ? nightModeEnabled ? 'border-amber-400 bg-amber-500/20' : 'border-cyan-400 bg-cyan-500/20'
                          : 'border-neutral-700'
                      }`}
                    >
                      {isSelected && (
                        <span className={`w-2 h-2 rounded-full ${nightModeEnabled ? 'bg-amber-400' : 'bg-cyan-400'}`} />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Split Screen Guide Card */}
          <div className="bg-neutral-950/80 border border-neutral-800 rounded-xl p-4">
            <div className={`flex items-center gap-2 mb-2 text-amber-300 ${isRhd ? 'flex-row-reverse' : 'flex-row'}`}>
              <Info className="w-4 h-4 text-amber-400 shrink-0" />
              <h4 className="text-xs font-bold uppercase tracking-wider">
                Android Multi-Window & Split-Screen Instructions ({driveSide} · {isLeftTraffic ? 'Drive Left' : 'Drive Right'})
              </h4>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed mb-3">
              Because Android security rules prevent third-party apps from forcibly rearranging your screen layout without user consent, follow these 3 quick steps on your phone:
            </p>

            <div className="space-y-2 text-xs text-neutral-400 font-medium">
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-neutral-800 text-cyan-300 flex items-center justify-center text-[10px] font-bold shrink-0">
                  1
                </span>
                <span>Tap <strong>Launch App</strong> ({isRhd ? 'right' : 'left'} thumb side) to open Google Maps, Waze, or OsmAnd.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-neutral-800 text-cyan-300 flex items-center justify-center text-[10px] font-bold shrink-0">
                  2
                </span>
                <span>
                  Swipe up to open <strong>Recent Apps Overview</strong>. Tap the <strong>RydeCam</strong> app icon above its preview window.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-neutral-800 text-cyan-300 flex items-center justify-center text-[10px] font-bold shrink-0">
                  3
                </span>
                <span>
                  Select <strong>Split screen</strong> and place your Navigation app on the <strong>{isRhd ? 'Right (RHD Driver Side)' : 'Left (LHD Driver Side)'}</strong> with RydeCam on the {isRhd ? 'Left' : 'Right'}, while route & road animations stay aligned for <strong>{isLeftTraffic ? 'Drive-on-the-Left' : 'Drive-on-the-Right'}</strong> traffic.
                </span>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-neutral-800 text-[11px] text-neutral-400 flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>RydeCam's Foreground Service keeps recording 1080p video while split-screen is active.</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
