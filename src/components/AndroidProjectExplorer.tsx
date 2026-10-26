import React, { useState } from 'react';
import {
  X,
  Download,
  Copy,
  Check,
  FileCode,
  Folder,
  Layers,
  ChevronRight,
  ChevronDown,
  Terminal,
  Cpu,
  Shield,
  FileText
} from 'lucide-react';
import JSZip from 'jszip';
import { ANDROID_PROJECT_FILES, AndroidProjectFile } from '../services/androidProjectFiles';

interface AndroidProjectExplorerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AndroidProjectExplorer: React.FC<AndroidProjectExplorerProps> = ({
  isOpen,
  onClose
}) => {
  const [selectedFile, setSelectedFile] = useState<AndroidProjectFile>(ANDROID_PROJECT_FILES[0]);
  const [copied, setCopied] = useState(false);
  const [isZipping, setIsZipping] = useState(false);
  const [activeTab, setActiveTab] = useState<'files' | 'architecture' | 'device_checklist'>('files');
  const [fileFilter, setFileFilter] = useState('');

  if (!isOpen) return null;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(selectedFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadZip = async () => {
    setIsZipping(true);
    try {
      const zip = new JSZip();

      // Populate files into zip folder
      for (const file of ANDROID_PROJECT_FILES) {
        zip.file(file.path, file.content);
      }

      // Add standard gradle wrapper properties
      zip.file('gradle/wrapper/gradle-wrapper.properties',
`distributionBase=GRADLE_USER_HOME
distributionPath=wrapper/dists
distributionUrl=https\\://services.gradle.org/distributions/gradle-8.10.2-bin.zip
networkTimeout=10000
validateDistributionUrl=true`);

      // Add proguard rules
      zip.file('app/proguard-rules.pro',
`# Add project specific ProGuard rules here.
-keep class com.rydecam.app.database.** { *; }
-keep class com.rydecam.app.incident.** { *; }`);

      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'RydeCam-Android-Project.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to create ZIP', err);
      alert('Error creating project ZIP. Please try again.');
    } finally {
      setIsZipping(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 select-none animate-fadeIn">
      <div className="bg-neutral-900 border border-neutral-700/80 rounded-2xl w-full max-w-5xl h-[92vh] flex flex-col shadow-2xl overflow-hidden">

        {/* Modal Top Bar */}
        <div className="p-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-950/80">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-800 flex items-center justify-center text-cyan-400">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <span>RYDECAM NATIVE ANDROID CODEBASE</span>
                <span className="text-[10px] bg-red-950 text-red-300 border border-red-800 px-2 py-0.5 rounded font-mono font-bold">
                  com.rydecam.app
                </span>
                <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded font-mono">
                  Kotlin + Compose + Room
                </span>
              </h2>
              <p className="text-[11px] text-neutral-400">
                Application ID: <span className="text-cyan-400 font-mono">com.rydecam.app</span> • Root Project: <span className="text-white font-mono">RydeCam</span> • Complete native Gradle package
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadZip}
              disabled={isZipping}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white rounded-lg text-xs font-bold shadow-lg shadow-emerald-900/40 transition active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isZipping ? 'Bundling...' : 'Download Project (.ZIP)'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-neutral-800 bg-neutral-950/40 px-4 text-xs font-bold">
          <button
            onClick={() => setActiveTab('files')}
            className={`py-2.5 px-3 border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'files'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>Source Code Explorer ({ANDROID_PROJECT_FILES.length} files)</span>
          </button>

          <button
            onClick={() => setActiveTab('architecture')}
            className={`py-2.5 px-3 border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'architecture'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Architecture & Permissions</span>
          </button>

          <button
            onClick={() => setActiveTab('device_checklist')}
            className={`py-2.5 px-3 border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'device_checklist'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Physical Device Test Checklist</span>
          </button>
        </div>

        {/* Tab 1: Source Code Explorer */}
        {activeTab === 'files' && (
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            {/* File List Sidebar */}
            <div className="w-full md:w-80 border-r border-neutral-800 bg-neutral-950/50 flex flex-col overflow-hidden">
              <div className="p-2 border-b border-neutral-800">
                <input
                  type="text"
                  placeholder="Filter 44 project files..."
                  value={fileFilter}
                  onChange={(e) => setFileFilter(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded px-2.5 py-1 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-400 font-mono"
                />
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                <div className="flex items-center justify-between px-2 py-1">
                  <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest block">
                    PROJECT FILES ({ANDROID_PROJECT_FILES.filter(f => f.path.toLowerCase().includes(fileFilter.toLowerCase()) || f.name.toLowerCase().includes(fileFilter.toLowerCase())).length})
                  </span>
                  <span className="text-[9px] font-mono text-cyan-400">com.rydecam.app</span>
                </div>
                {ANDROID_PROJECT_FILES
                  .filter(f => f.path.toLowerCase().includes(fileFilter.toLowerCase()) || f.name.toLowerCase().includes(fileFilter.toLowerCase()))
                  .map(file => {
                    const isSelected = selectedFile.path === file.path;
                    return (
                      <button
                        key={file.path}
                        onClick={() => setSelectedFile(file)}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-mono transition flex items-center justify-between ${
                          isSelected
                            ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-700/80'
                            : 'text-neutral-400 hover:bg-neutral-900 hover:text-neutral-200'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <FileCode className="w-3.5 h-3.5 shrink-0 text-neutral-500" />
                          <span className="truncate">{file.name}</span>
                        </div>
                      </button>
                    );
                  })}
              </div>
            </div>

            {/* Code Viewer */}
            <div className="flex-1 flex flex-col bg-neutral-950 overflow-hidden">
              <div className="p-2.5 px-4 bg-neutral-900/60 border-b border-neutral-800 flex items-center justify-between">
                <span className="text-xs font-mono text-cyan-400 font-semibold">
                  {selectedFile.path}
                </span>
                <button
                  onClick={handleCopyCode}
                  className="flex items-center gap-1 text-[11px] font-semibold text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 px-2 py-1 rounded transition"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Copied!' : 'Copy Code'}</span>
                </button>
              </div>

              <div className="flex-1 overflow-auto p-4 font-mono text-xs text-neutral-300 leading-relaxed bg-neutral-950">
                <pre className="whitespace-pre">{selectedFile.content}</pre>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Architecture & Permissions */}
        {activeTab === 'architecture' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6 text-neutral-300">
            <div>
              <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                <Cpu className="w-4 h-4 text-cyan-400" />
                <span>Clean Architecture & Subsystem Boundaries</span>
              </h3>
              <p className="text-xs text-neutral-400 leading-relaxed mb-3">
                RydeCam decouples video acquisition, foreground service lifecycle, sensor heuristics, storage management, and UI into testable layers:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-xl">
                  <h4 className="font-bold text-cyan-300 mb-1">camera / recording</h4>
                  <p className="text-neutral-400 text-[11px]">
                    Manages CameraX recorder, MediaCodec hardware encoding, and foreground service with Partial WakeLock.
                  </p>
                </div>

                <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-xl">
                  <h4 className="font-bold text-cyan-300 mb-1">storage (StorageQuotaManager)</h4>
                  <p className="text-neutral-400 text-[11px]">
                    Enforces logical quotas (8/16/32/64GB) via FIFO pruning of oldest unprotected segments while strictly safeguarding incident files.
                  </p>
                </div>

                <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-xl">
                  <h4 className="font-bold text-cyan-300 mb-1">incident (GSensorIncidentDetector)</h4>
                  <p className="text-neutral-400 text-[11px]">
                    Low-pass filters gravity (1.0G) and isolates dynamic collision shockwaves (2.5G–3.5G) with 10s debounce lockout.
                  </p>
                </div>

                <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-xl">
                  <h4 className="font-bold text-cyan-300 mb-1">location & navigation</h4>
                  <p className="text-neutral-400 text-[11px]">
                    Fused Location speed calculation with tunnel staleness guards and multi-window split-screen intent launcher.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-neutral-800">
              <h3 className="text-sm font-bold text-white mb-2">Android Permissions & Minimum SDK</h3>
              <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 text-xs font-mono space-y-1.5 text-neutral-400">
                <p><span className="text-cyan-400">minSdk = 26</span> (Android 8.0 Oreo - required for foreground notification channels & CameraX)</p>
                <p><span className="text-cyan-400">targetSdk = 35</span> (Android 15)</p>
                <p>• android.permission.CAMERA</p>
                <p>• android.permission.RECORD_AUDIO (opt-in cabin audio)</p>
                <p>• android.permission.ACCESS_FINE_LOCATION</p>
                <p>• android.permission.FOREGROUND_SERVICE_CAMERA</p>
                <p>• android.permission.FOREGROUND_SERVICE_LOCATION</p>
                <p>• android.permission.WAKE_LOCK (PARTIAL_WAKE_LOCK to allow screen-off recording)</p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Physical Device Test Checklist */}
        {activeTab === 'device_checklist' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-4 text-neutral-300">
            <div>
              <h3 className="text-sm font-bold text-white mb-1">Physical Device Quality Assurance Checklist</h3>
              <p className="text-xs text-neutral-400">
                Required physical testing matrix as specified in Product Specification Section 7 & 8:
              </p>
            </div>

            <div className="space-y-2.5 text-xs">
              {[
                { title: 'Concurrent Dual-Camera HAL Support', desc: 'Inspect CameraManager.concurrentCameraIds on target Android phone to ensure simultaneous front and rear video streaming does not trigger resource contention.' },
                { title: 'Sustained Windscreen Thermal Dissipation', desc: 'Mount phone on vehicle windscreen in direct sunlight for 60 minutes. Monitor battery temperature and ensure thermal state does not throttle encoding.' },
                { title: 'G-Sensor Road Vibration vs Crash Calibration', desc: 'Drive on cobblestones, speed bumps, and railway crossings. Confirm debounce filter does not trigger false positive incident locks for normal bumps.' },
                { title: 'Screen-Off Continuous Recording Continuity', desc: 'Lock the device screen. Verify DashcamRecordingService continues writing segments in background via PARTIAL_WAKE_LOCK without OEM killer termination.' },
                { title: 'Tunnel GPS Signal Loss Watchdog', desc: 'Drive through an underpass or tunnel. Verify HUD speed displays "--" and staleness watchdog prevents displaying stale velocity.' },
                { title: 'FIFO Quota Edge Case: Protected Overflow', desc: 'Lock enough clips that protected footage fills the quota. Verify that the app halts gracefully and warns the driver rather than corrupting files.' }
              ].map((item, i) => (
                <div key={i} className="p-3 bg-neutral-950 border border-neutral-800 rounded-xl flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                    {i + 1}
                  </div>
                  <div>
                    <h4 className="font-bold text-white mb-0.5">{item.title}</h4>
                    <p className="text-neutral-400 text-[11px] leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
