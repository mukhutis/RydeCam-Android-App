import React, { useEffect, useRef, useState } from 'react';
import { Camera, RefreshCw, AlertCircle, Video } from 'lucide-react';

interface RoadCanvasProps {
  speedKmh: number;
  isRecording: boolean;
  isDualCameraActive: boolean;
  onWebcamError?: (err: string) => void;
}

export const RoadCanvas: React.FC<RoadCanvasProps> = ({
  speedKmh,
  isRecording,
  isDualCameraActive,
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

      // 5. Headlight beam reflection on road
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

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      running = false;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [useRealCamera, speedKmh]);

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
