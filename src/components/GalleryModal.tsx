import React, { useState } from 'react';
import {
  X,
  Lock,
  Unlock,
  Trash2,
  Share2,
  Play,
  Download,
  AlertTriangle,
  Clock,
  HardDrive,
  Gauge,
  MapPin,
  PlusCircle,
  Video
} from 'lucide-react';
import { DashcamClip, StorageStats } from '../types/dashcam';

interface GalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  clips: DashcamClip[];
  storageStats: StorageStats;
  onToggleProtection: (clipId: string) => void;
  onDeleteClip: (clipId: string) => void;
  onAddSimulatedClip: () => void;
}

export const GalleryModal: React.FC<GalleryModalProps> = ({
  isOpen,
  onClose,
  clips,
  storageStats,
  onToggleProtection,
  onDeleteClip,
  onAddSimulatedClip
}) => {
  const [activeTab, setActiveTab] = useState<'normal' | 'protected'>('normal');
  const [selectedClip, setSelectedClip] = useState<DashcamClip | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<DashcamClip | null>(null);

  if (!isOpen) return null;

  const normalClips = clips.filter(c => !c.isProtected);
  const protectedClips = clips.filter(c => c.isProtected);
  const displayedClips = activeTab === 'normal' ? normalClips : protectedClips;

  const formatDate = (ms: number) => {
    const d = new Date(ms);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 select-none animate-fadeIn">
      <div className="bg-neutral-900 border border-neutral-700/80 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">

        {/* Modal Header */}
        <div className="p-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-950/70">
          <div>
            <h2 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
              <Video className="w-5 h-5 text-cyan-400" />
              <span>RYDECAM ARCHIVE</span>
            </h2>
            <p className="text-xs text-neutral-400">
              FIFO automatic rotation: {(storageStats.usedBytes / 1e9).toFixed(1)} / {(storageStats.quotaBytes / 1e9).toFixed(0)} GB used
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onAddSimulatedClip}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-cyan-300 rounded-lg text-xs font-semibold border border-neutral-700 transition"
              title="Add a 280MB simulated 2-min clip to test FIFO eviction"
            >
              <PlusCircle className="w-3.5 h-3.5 text-cyan-400" />
              <span>Add Test Segment</span>
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
        <div className="flex border-b border-neutral-800 bg-neutral-950/40 px-4">
          <button
            onClick={() => setActiveTab('normal')}
            className={`py-3 px-4 text-xs font-bold tracking-wide border-b-2 transition flex items-center gap-2 ${
              activeTab === 'normal'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <span>Normal Footage</span>
            <span className="bg-neutral-800 text-neutral-300 px-2 py-0.5 rounded-full text-[10px]">
              {normalClips.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('protected')}
            className={`py-3 px-4 text-xs font-bold tracking-wide border-b-2 transition flex items-center gap-2 ${
              activeTab === 'protected'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Lock className="w-3.5 h-3.5 text-amber-400" />
            <span>Protected Incidents</span>
            <span className="bg-amber-950 text-amber-300 border border-amber-800/80 px-2 py-0.5 rounded-full text-[10px]">
              {protectedClips.length}
            </span>
          </button>
        </div>

        {/* Clip List View */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {displayedClips.length === 0 ? (
            <div className="text-center py-16 text-neutral-400">
              <Video className="w-12 h-12 mx-auto mb-3 text-neutral-600" />
              <p className="text-sm font-semibold text-neutral-300">
                {activeTab === 'normal' ? 'No normal recordings found.' : 'No protected incidents.'}
              </p>
              <p className="text-xs text-neutral-500 mt-1">
                {activeTab === 'normal'
                  ? 'Clips are saved in 1-3 minute segments while continuous recording is active.'
                  : 'G-sensor impact shocks and manual driver locks are safeguarded here.'}
              </p>
            </div>
          ) : (
            displayedClips.map(clip => (
              <div
                key={clip.id}
                className="bg-neutral-950/60 border border-neutral-800/90 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-neutral-700 transition"
              >
                {/* Thumbnail & Title */}
                <div className="flex items-center gap-3">
                  <div
                    onClick={() => setSelectedClip(clip)}
                    className="relative w-24 h-16 rounded-lg bg-neutral-800 border border-neutral-700/80 overflow-hidden flex items-center justify-center cursor-pointer group shrink-0"
                    style={{ backgroundColor: clip.thumbnailColor || '#0f172a' }}
                  >
                    <Play className="w-6 h-6 text-white/80 group-hover:scale-110 transition fill-current" />
                    <span className="absolute bottom-1 right-1 bg-black/80 text-[9px] font-mono font-bold text-white px-1 rounded">
                      {clip.durationSeconds}s
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-white tracking-tight">
                        {clip.fileName}
                      </span>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase border ${
                          clip.resolution === '4K'
                            ? 'bg-amber-950/60 text-amber-300 border-amber-800/60'
                            : 'bg-cyan-950/60 text-cyan-300 border-cyan-800/60'
                        }`}
                      >
                        {clip.resolution}
                      </span>
                      {clip.isProtected && (
                        <span className="flex items-center gap-1 text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1.5 py-0.5 rounded">
                          <Lock className="w-2.5 h-2.5" />
                          <span>LOCKED</span>
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-neutral-400 font-mono mt-1">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-neutral-500" />
                        {formatDate(clip.startTimeMillis)}
                      </span>
                      <span className="flex items-center gap-1">
                        <HardDrive className="w-3 h-3 text-neutral-500" />
                        {(clip.fileSizeBytes / (1024 * 1024)).toFixed(0)} MB
                      </span>
                      {clip.maxSpeedKmh > 0 && (
                        <span className="flex items-center gap-1 text-emerald-400">
                          <Gauge className="w-3 h-3 text-emerald-500" />
                          Peak: {clip.maxSpeedKmh.toFixed(0)} km/h
                        </span>
                      )}
                    </div>

                    {clip.triggerReason && (
                      <p className="text-[10px] text-amber-300 font-semibold mt-1">
                        Trigger: {clip.triggerReason}
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <button
                    onClick={() => onToggleProtection(clip.id)}
                    className={`p-2 rounded-lg border text-xs font-semibold flex items-center gap-1 transition ${
                      clip.isProtected
                        ? 'bg-amber-950/70 border-amber-700/80 text-amber-300 hover:bg-amber-900'
                        : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:text-white'
                    }`}
                    title={clip.isProtected ? 'Unlock (Eligible for FIFO deletion)' : 'Lock & Protect from FIFO'}
                  >
                    {clip.isProtected ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                    <span className="hidden sm:inline">{clip.isProtected ? 'Protected' : 'Lock'}</span>
                  </button>

                  <button
                    onClick={() => setSelectedClip(clip)}
                    className="p-2 bg-neutral-800 hover:bg-neutral-700 text-cyan-300 rounded-lg border border-neutral-700 transition"
                    title="Play Video"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                  </button>

                  <button
                    onClick={() => setDeleteCandidate(clip)}
                    className="p-2 bg-neutral-800 hover:bg-red-950/80 hover:text-red-300 text-neutral-400 rounded-lg border border-neutral-700 transition"
                    title="Delete Clip"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Video Player Modal Replay */}
        {selectedClip && (
          <div className="fixed inset-0 z-60 bg-black/90 flex items-center justify-center p-4">
            <div className="bg-neutral-900 border border-neutral-700 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl">
              <div className="p-3 border-b border-neutral-800 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white font-mono">{selectedClip.fileName}</h3>
                  <p className="text-[11px] text-neutral-400">
                    Recorded {formatDate(selectedClip.startTimeMillis)} • {selectedClip.durationSeconds}s
                  </p>
                </div>
                <button
                  onClick={() => setSelectedClip(null)}
                  className="p-1 rounded bg-neutral-800 text-neutral-300 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Realistic Player Canvas with Dashcam HUD Overlay */}
              <div className="relative aspect-video bg-neutral-950 flex items-center justify-center overflow-hidden">
                <div className="text-center p-6">
                  <Play className="w-14 h-14 text-emerald-400 mx-auto mb-2 opacity-80" />
                  <p className="text-xs text-neutral-300 font-mono">Simulated Media3 ExoPlayer Stream</p>
                  <p className="text-[10px] text-neutral-500 font-mono mt-1">
                    Codec: H.264 / AVC • Resolution: {selectedClip.resolution} • Bitrate: 18.5 Mbps
                  </p>
                </div>

                {/* Replay HUD Overlay */}
                <div className="absolute top-3 left-3 bg-black/80 px-2 py-1 rounded text-[10px] font-mono text-cyan-300">
                  SPEED: {selectedClip.maxSpeedKmh.toFixed(0)} KM/H • GPS: {selectedClip.latitude.toFixed(4)}, {selectedClip.longitude.toFixed(4)}
                </div>

                <div className="absolute bottom-3 left-3 bg-black/80 px-2 py-1 rounded text-[10px] font-mono text-neutral-300">
                  {formatDate(selectedClip.startTimeMillis)}
                </div>
              </div>

              <div className="p-3 bg-neutral-950 flex items-center justify-between">
                <span className="text-xs text-neutral-400 font-mono">
                  {(selectedClip.fileSizeBytes / 1e6).toFixed(0)} MB MP4 Container
                </span>
                <button
                  onClick={() => {
                    alert(`Simulating Android Intent.ACTION_SEND for file: ${selectedClip.fileName}`);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Share Clip</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Alert */}
        {deleteCandidate && (
          <div className="fixed inset-0 z-60 bg-black/85 flex items-center justify-center p-4">
            <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-5 max-w-sm w-full text-center shadow-2xl">
              <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-2" />
              <h3 className="text-base font-bold text-white mb-1">
                {deleteCandidate.isProtected ? 'Delete Protected Incident Clip?' : 'Delete Recording?'}
              </h3>
              <p className="text-xs text-neutral-300 mb-4 leading-relaxed">
                {deleteCandidate.isProtected
                  ? 'CRITICAL: This footage was locked due to an impact event or manual driver command. Deleting will permanently remove it from the storage quota.'
                  : 'Permanently remove this recording file from device storage?'}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteCandidate(null)}
                  className="flex-1 py-2 rounded-lg bg-neutral-800 text-neutral-300 font-semibold text-xs border border-neutral-700"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    onDeleteClip(deleteCandidate.id);
                    setDeleteCandidate(null);
                  }}
                  className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold text-xs shadow-lg shadow-red-600/40"
                >
                  Delete Clip
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
