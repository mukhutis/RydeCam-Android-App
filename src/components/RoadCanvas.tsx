import React, { useEffect, useRef, useState } from 'react';
import { Camera, RefreshCw, AlertCircle, Video } from 'lucide-react';
import { SpeedUnitOption } from '../types/dashcam';

/**
 * Properties for the RoadCanvas dynamic camera preview and video stream renderer.
 */
export interface RoadCanvasProps {
  /** Current vehicle ground speed in km/h driving the animation loop frequency */
  speedKmh: number;
  /** Speed measurement unit ('KMH' | 'MPH') for burnt-in OSD watermark */
  speedUnit?: SpeedUnitOption;
  /** Cumulative trip distance in km for burnt-in OSD watermark */
  tripDistanceKm?: number;
  /** Recording state driving the red REC status watermark */
  isRecording: boolean;
  /** Toggles Picture-in-Picture (PiP) secondary cabin camera view */
  isDualCameraActive: boolean;
  /** Active speed limit in km/h for TSR sign generation and sync */
  activeSpeedLimitKmh?: number;
  /** Current battery level percentage (0-100) for OSD watermark */
  batteryLevel?: number;
  /** Power status flag indicating if device is plugged into 12V automotive power */
  isCharging?: boolean;
  /** Callback fired when an optical road sign crosses the detection horizon */
  onSignRecognized?: (limitKmh: number, limitMph: number) => void;
  /** Callback fired if physical webcam access fails or is denied */
  onWebcamError?: (err: string) => void;
}

/**
 * RoadCanvas: Dual-mode highway simulator & real webcam video stream renderer.
 *
 * Implements:
 * 1. Pseudo-3D Perspective Projection Engine: Renders an asphalt highway with lane markings,
 *    curbs, mountains, and traffic vehicles scaled dynamically using a 1/z depth equation.
 * 2. Optical Traffic Sign Recognition (TSR) Emulation: Renders roadside speed limit posts that
 *    travel towards the camera viewpoint. When depth z < 0.22, fires `onSignRecognized`.
 * 3. MediaDevices Camera Pipeline: Enables live front/back webcam streaming via `navigator.mediaDevices.getUserMedia`.
 * 4. High-contrast OSD Watermark: Standardized bottom timestamp, coordinates, speed, battery, and REC status.
 */
export const RoadCanvas: React.FC<RoadCanvasProps> = ({
  speedKmh,
  speedUnit = 'KMH',
  tripDistanceKm = 0,
  isRecording,
  isDualCameraActive,
  activeSpeedLimitKmh,
  batteryLevel = 94,
  isCharging = true,
  onSignRecognized,
  onWebcamError
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const frontVideoRef = useRef<HTMLVideoElement | null>(null);

  const [useRealCamera, setUseRealCamera] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Highway simulation state
  const animFrameRef = useRef<number | null>(null);
  const roadOffsetRef = useRef(0);
  const carPositionsRef = useRef([
    { x: -0.3, z: 0.8, speed: 0.005, color: '#e11d48' },
    { x: 0.35, z: 0.5, speed: 0.007, color: '#38bdf8' }
  ]);

  // Roadside speed limit sign state for TSR detection
  const roadsideSignRef = useRef<{
    z: number;
    x: number;
    limitKmh: number;
    limitMph: number;
    hasTriggered: boolean;
  }>({
    z: 0.85,
    x: 0.68,
    limitKmh: 60,
    limitMph: 40,
    hasTriggered: false
  });

  // Handle Real Camera toggle
  const toggleRealCamera = async () => {
    if (useRealCamera) {
      // Turn off
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
      setUseRealCamera(false);
      setCameraError(null);
      return;
    }

    setCameraLoading(true);
    setCameraError(null);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API not available in this browser environment');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setUseRealCamera(true);
    } catch (err: any) {
      console.warn('Real camera access failed, falling back to automotive simulation:', err);
      const msg = err.name === 'NotAllowedError' 
        ? 'Camera permission denied. Using high-fidelity road simulation.' 
        : (err.message || 'Unable to access camera.');
      setCameraError(msg);
      if (onWebcamError) onWebcamError(msg);
      setUseRealCamera(false);
    } finally {
      setCameraLoading(false);
    }
  };

  // Highway canvas animation
  useEffect(() => {
    if (useRealCamera) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let running = true;

    const render = () => {
      if (!running) return;

      const width = canvas.width;
      const height = canvas.height;

      // Dynamic speed multiplier
      const speedFactor = Math.max(0.1, speedKmh / 70);
      roadOffsetRef.current = (roadOffsetRef.current + 0.015 * speedFactor) % 1;

      // 1. Sky & Horizon gradient (Atmospheric twilight / night road)
      const skyGrad = ctx.createLinearGradient(0, 0, 0, height * 0.45);
      skyGrad.addColorStop(0, '#020617'); // Dark navy
      skyGrad.addColorStop(0.7, '#0f172a');
      skyGrad.addColorStop(1, '#1e1b4b'); // Horizon purple tint
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, width, height * 0.45);

      // Stars/City distant lights
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      for (let i = 0; i < 20; i++) {
        const sx = ((i * 137) % width);
        const sy = ((i * 59) % (height * 0.35));
        ctx.fillRect(sx, sy, 1.5, 1.5);
      }

      // Distant horizon mountain silhouettes
      ctx.fillStyle = '#090d16';
      ctx.beginPath();
      ctx.moveTo(0, height * 0.45);
      ctx.lineTo(width * 0.2, height * 0.41);
      ctx.lineTo(width * 0.4, height * 0.44);
      ctx.lineTo(width * 0.65, height * 0.40);
      ctx.lineTo(width * 0.85, height * 0.43);
      ctx.lineTo(width, height * 0.45);
      ctx.fill();

      // 2. Road surface perspective
      const vanishingX = width * 0.5;
      const vanishingY = height * 0.45;

      const roadGrad = ctx.createLinearGradient(0, vanishingY, 0, height);
      roadGrad.addColorStop(0, '#1c1917'); // Road asphalt
      roadGrad.addColorStop(0.5, '#18181b');
      roadGrad.addColorStop(1, '#09090b');
      ctx.fillStyle = roadGrad;

      // Road trapezoid
      const roadBottomLeft = width * 0.05;
      const roadBottomRight = width * 0.95;
      const roadTopLeft = vanishingX - width * 0.04;
      const roadTopRight = vanishingX + width * 0.04;

      ctx.beginPath();
      ctx.moveTo(roadTopLeft, vanishingY);
      ctx.lineTo(roadTopRight, vanishingY);
      ctx.lineTo(roadBottomRight, height);
      ctx.lineTo(roadBottomLeft, height);
      ctx.closePath();
      ctx.fill();

      // Road grass/barriers
      ctx.fillStyle = '#041008'; // Left terrain
      ctx.beginPath();
      ctx.moveTo(0, vanishingY);
      ctx.lineTo(roadTopLeft, vanishingY);
      ctx.lineTo(roadBottomLeft, height);
      ctx.lineTo(0, height);
      ctx.fill();

      ctx.beginPath(); // Right terrain
      ctx.moveTo(roadTopRight, vanishingY);
      ctx.lineTo(width, vanishingY);
      ctx.lineTo(width, height);
      ctx.lineTo(roadBottomRight, height);
      ctx.fill();

      // Guardrails
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(roadTopLeft, vanishingY);
      ctx.lineTo(roadBottomLeft, height);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(roadTopRight, vanishingY);
      ctx.lineTo(roadBottomRight, height);
      ctx.stroke();

      // 3. Lane Markings
      const numSegments = 12;
      ctx.fillStyle = '#facc15'; // Yellow center double line
      for (let i = 0; i < numSegments; i++) {
        const p1 = (i / numSegments + roadOffsetRef.current / numSegments) % 1;
        const p2 = Math.min(1, p1 + 0.045);
        if (p1 > p2) continue;

        // Exponential perspective calculation
        const y1 = vanishingY + Math.pow(p1, 2.5) * (height - vanishingY);
        const y2 = vanishingY + Math.pow(p2, 2.5) * (height - vanishingY);
        const w1 = Math.pow(p1, 2.2) * 5;
        const w2 = Math.pow(p2, 2.2) * 8;

        // Double yellow line
        ctx.beginPath();
        ctx.moveTo(vanishingX - w1 - 2, y1);
        ctx.lineTo(vanishingX - w2 - 2, y2);
        ctx.lineTo(vanishingX - w2 - 1, y2);
        ctx.lineTo(vanishingX - w1 - 1, y1);
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(vanishingX + 1, y1);
        ctx.lineTo(vanishingX + 1, y2);
        ctx.lineTo(vanishingX + w2 + 1, y2);
        ctx.lineTo(vanishingX + w1 + 1, y1);
        ctx.fill();
      }

      // White lane dividers (left and right)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      for (let i = 0; i < numSegments; i++) {
        const p1 = (i / numSegments + roadOffsetRef.current / numSegments) % 1;
        const p2 = Math.min(1, p1 + 0.035);
        if (p1 > p2) continue;

        const y1 = vanishingY + Math.pow(p1, 2.4) * (height - vanishingY);
        const y2 = vanishingY + Math.pow(p2, 2.4) * (height - vanishingY);

        // Left lane
        const leftX1 = vanishingX - (vanishingX - roadTopLeft) * 0.5 - Math.pow(p1, 2) * (vanishingX - roadBottomLeft) * 0.48;
        const leftX2 = vanishingX - (vanishingX - roadTopLeft) * 0.5 - Math.pow(p2, 2) * (vanishingX - roadBottomLeft) * 0.48;
        ctx.fillRect(leftX1 - 1, y1, Math.max(1, p1 * 4), Math.max(2, y2 - y1));

        // Right lane
        const rightX1 = vanishingX + (roadTopRight - vanishingX) * 0.5 + Math.pow(p1, 2) * (roadBottomRight - vanishingX) * 0.48;
        const rightX2 = vanishingX + (roadTopRight - vanishingX) * 0.5 + Math.pow(p2, 2) * (roadBottomRight - vanishingX) * 0.48;
        ctx.fillRect(rightX1 - 1, y1, Math.max(1, p1 * 4), Math.max(2, y2 - y1));
      }

      // 4. Passing cars in front
      carPositionsRef.current.forEach(car => {
        car.z = (car.z - car.speed * speedFactor);
        if (car.z <= 0.1) car.z = 0.95;

        const cz = 1 - car.z; // closer = larger
        const cy = vanishingY + Math.pow(cz, 2.2) * (height - vanishingY) * 0.75;
        const cx = vanishingX + car.x * Math.pow(cz, 1.8) * width * 0.7;
        const cw = Math.max(8, cz * 60);
        const ch = Math.max(5, cz * 35);

        // Car chassis
        ctx.fillStyle = car.color;
        ctx.fillRect(cx - cw / 2, cy - ch, cw, ch * 0.7);

        // Tail lights
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(cx - cw / 2 + 2, cy - ch * 0.4, cw * 0.2, ch * 0.3);
        ctx.fillRect(cx + cw / 2 - cw * 0.2 - 2, cy - ch * 0.4, cw * 0.2, ch * 0.3);
      });

      // 5. Roadside Speed Limit Sign with Traffic Sign Recognition (TSR)
      const sign = roadsideSignRef.current;
      sign.z = sign.z - 0.003 * speedFactor;

      if (sign.z <= 0.05) {
        sign.z = 0.96;
        sign.hasTriggered = false;
        // Cycle to next realistic road limit
        const nextKmh = [50, 60, 70, 80, 60, 90, 100];
        const nextMph = [30, 40, 45, 50, 40, 55, 65];
        const idx = Math.floor(Math.random() * nextKmh.length);
        sign.limitKmh = nextKmh[idx];
        sign.limitMph = nextMph[idx];
      }

      const sz = 1 - sign.z; // 0 to 1 (closer = larger)
      if (sz > 0.08 && sz < 0.98) {
        const sy = vanishingY + Math.pow(sz, 2.2) * (height - vanishingY) * 0.85;
        const sx = vanishingX + sign.x * Math.pow(sz, 1.8) * width * 0.72;
        const radius = Math.max(7, sz * 26);
        const poleHeight = radius * 2.8;

        // Ground post
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = Math.max(2, sz * 4);
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx, sy - poleHeight);
        ctx.stroke();

        // Circular speed limit sign (white background + red outer ring)
        const signCenterY = sy - poleHeight;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(sx, signCenterY, radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#dc2626'; // Bold red ring
        ctx.lineWidth = Math.max(2.5, radius * 0.22);
        ctx.stroke();

        // Number on sign
        const displayLimit = speedUnit === 'MPH' ? sign.limitMph : sign.limitKmh;
        ctx.fillStyle = '#000000';
        ctx.font = `900 ${Math.round(radius * 0.95)}px "JetBrains Mono", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${displayLimit}`, sx, signCenterY);

        // Optical Camera TSR Detection Bounding Box (when in camera focal range)
        if (sz >= 0.32 && sz <= 0.78) {
          const boxPad = radius * 1.4;
          ctx.strokeStyle = '#06b6d4';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(sx - boxPad, signCenterY - boxPad, boxPad * 2, boxPad * 2);

          // Corner brackets
          const bl = 6;
          ctx.strokeStyle = '#22d3ee';
          ctx.lineWidth = 2.5;
          // top-left
          ctx.beginPath(); ctx.moveTo(sx - boxPad, signCenterY - boxPad + bl); ctx.lineTo(sx - boxPad, signCenterY - boxPad); ctx.lineTo(sx - boxPad + bl, signCenterY - boxPad); ctx.stroke();
          // bottom-right
          ctx.beginPath(); ctx.moveTo(sx + boxPad, signCenterY + boxPad - bl); ctx.lineTo(sx + boxPad, signCenterY + boxPad); ctx.lineTo(sx + boxPad - bl, signCenterY + boxPad); ctx.stroke();

          // TSR Detection Tag
          ctx.fillStyle = 'rgba(8, 145, 178, 0.9)';
          ctx.fillRect(sx - boxPad, signCenterY - boxPad - 16, 88, 14);
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 8.5px "JetBrains Mono", monospace';
          ctx.textAlign = 'left';
          ctx.fillText(`TSR: ${displayLimit} (98%)`, sx - boxPad + 3, signCenterY - boxPad - 5);

          // Fire sign recognized callback once per approach
          if (sz >= 0.42 && !sign.hasTriggered) {
            sign.hasTriggered = true;
            if (onSignRecognized) {
              onSignRecognized(sign.limitKmh, sign.limitMph);
            }
          }
        }
      }

      // 6. Headlight beam reflection on road
      const beamGrad = ctx.createRadialGradient(
        vanishingX, height, 50,
        vanishingX, height * 0.65, width * 0.4
      );
      beamGrad.addColorStop(0, 'rgba(255, 255, 230, 0.18)');
      beamGrad.addColorStop(0.5, 'rgba(255, 255, 210, 0.08)');
      beamGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = beamGrad;
      ctx.fillRect(0, vanishingY, width, height - vanishingY);

      // Dashcam windshield watermark / subtle edge vignette
      const vignette = ctx.createRadialGradient(
        width / 2, height / 2, width * 0.35,
        width / 2, height / 2, width * 0.65
      );
      vignette.addColorStop(0, 'transparent');
      vignette.addColorStop(1, 'rgba(0, 0, 0, 0.45)');
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, width, height);

      // Dashcam bottom OSD watermark
      const speedTxt = speedUnit === 'MPH' ? `${Math.round(speedKmh * 0.621371)} M/HR` : `${Math.round(speedKmh)} KM/HR`;
      const distTxt = speedUnit === 'MPH' ? `${(tripDistanceKm * 0.621371).toFixed(1)} MI` : `${tripDistanceKm.toFixed(1)} KM`;
      const limitVal = activeSpeedLimitKmh ? (speedUnit === 'MPH' ? Math.round(activeSpeedLimitKmh * 0.621371) : activeSpeedLimitKmh) : null;
      const limitTxt = limitVal ? ` • LIMIT: ${limitVal}` : '';
      const batTxt = ` • BAT: ${batteryLevel}%${isCharging ? ' ⚡' : ''}`;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
      ctx.fillRect(16, height - 34, Math.min(width - 32, 600), 22);
      ctx.fillStyle = '#6ee7b7';
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(`RYDECAM • ${speedTxt}${limitTxt} • TRIP: ${distTxt}${batTxt} • 37.7749°N 122.4194°W`, 24, height - 23);

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      running = false;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [useRealCamera, speedKmh, speedUnit, tripDistanceKm, activeSpeedLimitKmh, onSignRecognized, batteryLevel, isCharging]);

  // Handle window resizing for sharp canvas
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = canvasRef.current.clientWidth;
        canvasRef.current.height = canvasRef.current.clientHeight;
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="relative w-full h-full bg-neutral-950 overflow-hidden select-none">
      {/* Real Video Element (Hidden or visible) */}
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
          useRealCamera ? 'opacity-100 z-0' : 'opacity-0 -z-10'
        }`}
      />

      {/* Simulated Road Canvas */}
      {!useRealCamera && (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full object-cover z-0"
        />
      )}

      {/* Camera Toggle Button in Top Right */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
        <button
          onClick={toggleRealCamera}
          disabled={cameraLoading}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold backdrop-blur-md transition-all ${
            useRealCamera
              ? 'bg-emerald-600/80 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/40'
              : 'bg-neutral-900/80 hover:bg-neutral-800 text-neutral-300 border border-neutral-700/60'
          }`}
          title="Switch between Real Webcam and Highway Simulation"
        >
          {cameraLoading ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-neutral-400" />
          ) : useRealCamera ? (
            <Camera className="w-3.5 h-3.5 text-emerald-300" />
          ) : (
            <Video className="w-3.5 h-3.5 text-cyan-400" />
          )}
          <span>{useRealCamera ? 'Using Camera' : 'Road Sim (Click for Cam)'}</span>
        </button>
      </div>

      {/* Dual Cabin Selfie Camera Picture-in-Picture (PiP) */}
      {isDualCameraActive && (
        <div className="absolute bottom-24 right-4 z-20 w-44 h-28 rounded-lg overflow-hidden border-2 border-cyan-500/80 shadow-2xl bg-neutral-900/90 backdrop-blur-md flex flex-col">
          <div className="px-2 py-1 bg-neutral-950/80 text-[10px] font-bold text-cyan-300 flex items-center justify-between border-b border-neutral-800">
            <span>CABIN DUAL CAM</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          </div>
          <div className="relative flex-1 bg-neutral-900 flex items-center justify-center">
            {/* Selfie interior visualizer */}
            <div className="text-center p-2">
              <div className="w-8 h-8 rounded-full bg-neutral-800 border border-neutral-700 mx-auto mb-1 flex items-center justify-center">
                <Camera className="w-4 h-4 text-cyan-400" />
              </div>
              <p className="text-[10px] text-neutral-400 font-medium">Front Camera Stream</p>
              <p className="text-[9px] text-neutral-500">1080p Cabin Active</p>
            </div>
          </div>
        </div>
      )}

      {/* Real camera Optical TSR scanning reticle & live watermark */}
      {useRealCamera && (
        <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-6 z-10">
          <div className="mt-14 self-center px-3 py-1 rounded bg-black/70 border border-cyan-500/60 text-cyan-300 font-mono text-[10px] flex items-center gap-1.5 backdrop-blur-sm">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span>OPTICAL TSR SIGN RECOGNITION ACTIVE</span>
          </div>

          <div className="self-center w-64 h-36 border border-cyan-500/30 rounded-xl relative flex items-center justify-center">
            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-cyan-400" />
            <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-cyan-400" />
            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-cyan-400" />
            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-cyan-400" />
            <span className="text-[10px] text-cyan-400/70 font-mono">TSR SCAN REGION</span>
          </div>

          <div className="bg-black/75 px-3 py-1.5 rounded text-[10px] font-mono text-emerald-400 self-start">
            RYDECAM LIVE • {speedUnit === 'MPH' ? `${Math.round(speedKmh * 0.621371)} M/HR` : `${Math.round(speedKmh)} KM/HR`} {activeSpeedLimitKmh ? `• LIMIT: ${speedUnit === 'MPH' ? Math.round(activeSpeedLimitKmh * 0.621371) : activeSpeedLimitKmh}` : ''} • BAT: {batteryLevel}% {isCharging ? '⚡ CHG' : ''}
          </div>
        </div>
      )}

      {/* Camera error pill if permission failed */}
      {cameraError && (
        <div className="absolute top-16 right-4 z-20 max-w-xs bg-red-950/90 border border-red-700 text-red-200 text-xs px-3 py-2 rounded shadow-lg flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <span>{cameraError}</span>
        </div>
      )}
    </div>
  );
};
