import React, { useState } from 'react';
import {
  X,
  MapPin,
  Compass,
  ExternalLink,
  Layers,
  Smartphone,
  Navigation,
  Info
} from 'lucide-react';

interface CompanionNavModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedNavApp: string;
  onSelectNavApp: (appKey: string) => void;
}

export const CompanionNavModal: React.FC<CompanionNavModalProps> = ({
  isOpen,
  onClose,
  selectedNavApp,
  onSelectNavApp
}) => {
  const [destination, setDestination] = useState('');
  const [showEmbeddedMap, setShowEmbeddedMap] = useState(false);

  if (!isOpen) return null;

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
      webUrl: () => `https://www.openstreetmap.org`
    }
  ];

  const handleLaunch = () => {
    const current = navApps.find(a => a.id === selectedNavApp) || navApps[0];
    const url = current.webUrl(destination);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 select-none animate-fadeIn">
      <div className="bg-neutral-900 border border-neutral-700/80 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">

        {/* Modal Header */}
        <div className="p-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-950/70">
          <div>
            <h2 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
              <Compass className="w-5 h-5 text-cyan-400" />
              <span>RYDECAM COMPANION NAVIGATION</span>
            </h2>
            <p className="text-xs text-neutral-400">
              RydeCam foreground service keeps recording in background while you navigate
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* Destination Input */}
          <div>
            <label className="text-xs font-bold text-neutral-300 block mb-1.5">
              SET NAVIGATION DESTINATION (OPTIONAL)
            </label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <MapPin className="w-4 h-4 text-cyan-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="e.g. San Francisco Airport or 123 Main St"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-400 font-medium"
                />
              </div>
              <button
                onClick={handleLaunch}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-cyan-600/30 transition flex items-center gap-1.5 shrink-0"
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>Launch App</span>
              </button>
            </div>
          </div>

          {/* Navigation App Selector */}
          <div>
            <span className="text-xs font-bold text-neutral-300 block mb-2">
              SELECT COMPANION NAVIGATION APP
            </span>
            <div className="space-y-2">
              {navApps.map(app => {
                const isSelected = selectedNavApp === app.id;
                return (
                  <div
                    key={app.id}
                    onClick={() => onSelectNavApp(app.id)}
                    className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                      isSelected
                        ? 'bg-cyan-950/50 border-cyan-400 text-white shadow-lg shadow-cyan-950/40'
                        : 'bg-neutral-950/60 border-neutral-800 text-neutral-300 hover:border-neutral-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
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
                      className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        isSelected ? 'border-cyan-400 bg-cyan-500/20' : 'border-neutral-700'
                      }`}
                    >
                      {isSelected && <span className="w-2 h-2 rounded-full bg-cyan-400" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Split Screen Guide Card */}
          <div className="bg-neutral-950/80 border border-neutral-800 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2 text-amber-300">
              <Info className="w-4 h-4 text-amber-400" />
              <h4 className="text-xs font-bold uppercase tracking-wider">
                Android Multi-Window & Split-Screen Instructions
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
                <span>Tap <strong>Launch App</strong> to open Google Maps or Waze.</span>
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
                  Select <strong>Split screen</strong> (or <em>Open in split screen view</em>) and choose your Navigation app on the bottom half!
                </span>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-neutral-800 text-[11px] text-neutral-400 flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
              <span>RydeCam's Foreground Service keeps recording 1080p video while split-screen is active.</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
