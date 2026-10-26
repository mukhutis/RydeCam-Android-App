export type VideoResolutionOption = '1080p' | '4K';
export type SpeedUnitOption = 'KMH' | 'MPH';
export type StorageQuotaOption = 8 | 16 | 32 | 64;
export type SensitivityOption = 'LOW' | 'MEDIUM' | 'HIGH' | 'CUSTOM';
export type ScreenOffOption = 'KEEP_AWAKE' | 'DIM_AFTER_1_MIN' | 'BLACK_OLED_HUD';

export interface DashcamSettings {
  storageQuotaGb: StorageQuotaOption;
  videoResolution: VideoResolutionOption;
  frontCameraEnabled: boolean;
  segmentLengthMinutes: number; // 1, 2, or 3
  audioRecordingEnabled: boolean;
  gpsOverlayEnabled: boolean;
  speedUnit: SpeedUnitOption;
  accidentDetectionEnabled: boolean;
  accidentSensitivity: SensitivityOption;
  customGThreshold: number;
  postEventSeconds: number; // 15, 30, 60
  screenOffBehavior: ScreenOffOption;
  companionNavApp: string; // 'google_maps' | 'waze' | 'browser'
}

export interface DashcamClip {
  id: string;
  fileName: string;
  startTimeMillis: number;
  endTimeMillis: number;
  durationSeconds: number;
  fileSizeBytes: number;
  resolution: VideoResolutionOption;
  cameraLens: 'BACK' | 'FRONT' | 'DUAL';
  isProtected: boolean;
  incidentId?: string;
  triggerReason?: string;
  averageSpeedKmh: number;
  maxSpeedKmh: number;
  latitude: number;
  longitude: number;
  hasAudio: boolean;
  videoBlobUrl?: string;
  thumbnailColor?: string;
}

export interface IncidentRecord {
  id: string;
  timestampMillis: number;
  triggerType: 'G_SENSOR' | 'MANUAL' | 'HARD_BRAKE';
  peakGForce: number;
  speedAtImpactKmh: number;
  latitude: number;
  longitude: number;
  preEventSeconds: number;
  postEventSeconds: number;
  isLocked: boolean;
  notes: string;
}

export interface StorageStats {
  quotaBytes: number;
  usedBytes: number;
  protectedBytes: number;
  unprotectedBytes: number;
  freeDeviceBytes: number;
  safetyMarginBytes: number;
  estimatedRemainingSeconds: number;
  isQuotaExhausted: boolean;
  isProtectedOverflow: boolean;
  clipCount: number;
}

export interface TelemetryData {
  speedKmh: number;
  speedMph: number;
  latitude: number;
  longitude: number;
  altitudeMeters: number;
  bearingDegrees: number;
  accuracyMeters: number;
  isGpsLocked: boolean;
  isSignalStale: boolean;
  lastUpdateTimestamp: number;
}

export interface SensorTelemetry {
  gX: number;
  gY: number;
  gZ: number;
  totalG: number;
  linearG: number;
  peakGHistory: number[];
}

export interface BillingEntitlements {
  isProUnlocked: boolean;
  canUse64GbQuota: boolean;
  canUse4kResolution: boolean;
  canUseFrontCamera: boolean;
  activePlan: 'NONE' | 'MONTHLY' | 'ANNUAL';
}
