/**
 * @fileoverview Automotive Dashcam Domain Type Definitions and Mathematical Utilities.
 *
 * Defines the core domain models for RydeCam, including telemetry records,
 * video segment clips, collision/G-sensor incidents, storage allocation quotas,
 * speed limit signs, user cockpit preferences, and subscription entitlements.
 *
 * All time stamps are measured in Unix epoch milliseconds unless specifically
 * suffixed with `Seconds`. Speed measurements maintain dual-representation
 * or standardized km/h with explicit conversion helpers.
 *
 * @module types/dashcam
 */

/**
 * Supported video recording encoding resolutions.
 * - `1080p`: Full High Definition (1920x1080 @ 30fps), standard tier.
 * - `4K`: Ultra High Definition (3840x2160 @ 30fps), unlocked via Pro subscription.
 */
export type VideoResolutionOption = '1080p' | '4K';

/**
 * Speed and distance display units for vehicle instrumentation and OSD overlays.
 * - `KMH`: Metric units (km/h and kilometers).
 * - `MPH`: Imperial units (miles per hour and statute miles).
 */
export type SpeedUnitOption = 'KMH' | 'MPH';

/**
 * Storage quota limits (in gigabytes) allocated for dashcam video ring buffer.
 * When utilized capacity approaches this quota, FIFO pruning deletes oldest unprotected clips.
 */
export type StorageQuotaOption = 8 | 16 | 32 | 64;

/**
 * G-sensor collision and harsh braking trigger sensitivity tiers.
 * - `LOW`: ~3.5G threshold (requires heavy collision or deep pothole impact).
 * - `MEDIUM`: ~2.5G threshold (balanced sensitivity for standard passenger vehicles).
 * - `HIGH`: ~1.8G threshold (sensitive to hard emergency braking and swerving).
 * - `CUSTOM`: Configured to a user-defined threshold via `customGThreshold`.
 */
export type SensitivityOption = 'LOW' | 'MEDIUM' | 'HIGH' | 'CUSTOM';

/**
 * Screen timeout and OLED power management policies for windshield-mounted devices.
 * - `KEEP_AWAKE`: Screen remains illuminated with full telemetry HUD.
 * - `DIM_AFTER_1_MIN`: Backlight dims after 60s of inactivity to reduce windshield reflections.
 * - `BLACK_OLED_HUD`: Displays minimal clock and REC dot on pure black background to prevent OLED burn-in and overheating.
 */
export type ScreenOffOption = 'KEEP_AWAKE' | 'DIM_AFTER_1_MIN' | 'BLACK_OLED_HUD';

/**
 * User-configurable settings and hardware preferences for the dashcam cockpit.
 */
export interface DashcamSettings {
  /** Maximum storage allocation in gigabytes for the video ring buffer */
  storageQuotaGb: StorageQuotaOption;
  /** Active video capture and encoding resolution */
  videoResolution: VideoResolutionOption;
  /** Enables simultaneous dual-camera front (cabin/selfie) camera feed */
  frontCameraEnabled: boolean;
  /** Time slice rotation duration for individual MP4 clips (1, 2, or 3 minutes) */
  segmentLengthMinutes: number;
  /** Whether in-cabin audio recording is captured into the video stream */
  audioRecordingEnabled: boolean;
  /** Toggles burnt-in GPS speed, coordinate, and time watermark on the recorded video */
  gpsOverlayEnabled: boolean;
  /** Preferred measurement system for cockpit speedometer and OSD */
  speedUnit: SpeedUnitOption;
  /** Enables automatic G-sensor collision and harsh braking event detection */
  accidentDetectionEnabled: boolean;
  /** Sensitivity tier for accelerometer impact classification */
  accidentSensitivity: SensitivityOption;
  /** Custom acceleration threshold in G-force units (active when accidentSensitivity is 'CUSTOM') */
  customGThreshold: number;
  /** Duration in seconds to continue recording and lock after an incident trigger */
  postEventSeconds: number;
  /** Display power and thermal management behavior */
  screenOffBehavior: ScreenOffOption;
  /** Package identifier for third-party navigation companion (e.g., 'google_maps' | 'waze') */
  companionNavApp: string;
  /** Enables visual speedometer color shift warning when exceeding detected speed limit */
  speedLimitAlertEnabled: boolean;
  /** Enables acoustic dual-tone alert chime when exceeding detected speed limit */
  speedLimitBeepEnabled: boolean;
  /** Overspeed threshold tolerance in speed units before triggering audible alert (e.g. 5 km/h or mph) */
  speedLimitTolerance: number;
  /** Lowers UI brightness and shifts palette to high-contrast amber/red tones to preserve night vision and eliminate driver glare */
  nightModeEnabled: boolean;
  /** Ambient light automatic switching policy ('AUTO' | 'ALWAYS_ON' | 'ALWAYS_OFF') */
  nightModePreference: NightModePreference;
  /** Illuminance threshold in lux to trigger automatic night mode (standard: 25 lux) */
  autoNightLuxThreshold: number;
}

/**
 * Operating mode policy for cockpit display luminance and night mode palette.
 * - `AUTO`: Automatically switches based on ambient light sensor, camera optical luminance, or solar ephemeris.
 * - `ALWAYS_ON`: Forced high-contrast amber/red anti-glare mode.
 * - `ALWAYS_OFF`: Forced standard daylight mode.
 */
export type NightModePreference = 'AUTO' | 'ALWAYS_ON' | 'ALWAYS_OFF';

/**
 * Ambient illuminance telemetry and light sensor diagnostic snapshot.
 */
export interface AmbientLightData {
  /** Measured or estimated ambient illuminance in lux (0 - 1000+) */
  lux: number;
  /** Active sensing source */
  source: 'HARDWARE_SENSOR' | 'CAMERA_OPTICAL' | 'SOLAR_TIME' | 'SIMULATED';
  /** True if ambient light is currently below the low-light threshold */
  isLowLight: boolean;
  /** Active switching threshold in lux */
  thresholdLux: number;
  /** Timestamp of the last sensor reading in milliseconds */
  timestampMillis: number;
}

/**
 * Detected traffic speed limit sign metadata captured via Optical Traffic Sign Recognition (TSR)
 * or vehicle location map database.
 */
export interface SpeedLimitSign {
  /** Speed limit value in kilometers per hour */
  limitKmh: number;
  /** Equivalent speed limit value in miles per hour */
  limitMph: number;
  /** Unix epoch timestamp in milliseconds when the sign was recognized */
  detectedAtMillis: number;
  /** Optical character recognition confidence score (0-100%) */
  confidencePercent: number;
  /** Regulatory road classification of the speed limit */
  signType: 'STANDARD' | 'HIGHWAY' | 'SCHOOL_ZONE';
  /** Origin source of the speed limit observation */
  source: 'OPTICAL_TSR' | 'MANUAL';
}

/**
 * Immutable metadata representing an individual recorded video segment stored on disk.
 */
export interface DashcamClip {
  /** Globally unique identifier for the clip */
  id: string;
  /** Standardized dashcam filename (format: `RYDECAM_YYYYMMDD_HHMMSS_<RES>.mp4`) */
  fileName: string;
  /** Unix epoch timestamp in milliseconds when clip recording commenced */
  startTimeMillis: number;
  /** Unix epoch timestamp in milliseconds when clip recording finalized */
  endTimeMillis: number;
  /** Total elapsed recording duration in seconds */
  durationSeconds: number;
  /** Encoded MP4 file size on disk in bytes */
  fileSizeBytes: number;
  /** Video capture resolution profile */
  resolution: VideoResolutionOption;
  /** Lens angle source of the footage */
  cameraLens: 'BACK' | 'FRONT' | 'DUAL';
  /** Protection flag preventing FIFO automated circular buffer deletion */
  isProtected: boolean;
  /** Foreign key linking to an associated IncidentRecord if triggered during collision */
  incidentId?: string;
  /** Human-readable explanation for protection lock (e.g., 'Collision Impact (2.8G)', 'Driver Manual Lock') */
  triggerReason?: string;
  /** Average calculated vehicle speed during this segment in km/h */
  averageSpeedKmh: number;
  /** Maximum peak speed reached during this segment in km/h */
  maxSpeedKmh: number;
  /** Cumulative geographic distance traversed during this segment in kilometers */
  distanceCoveredKm?: number;
  /** Starting geographic latitude in decimal degrees (WGS 84) */
  latitude: number;
  /** Starting geographic longitude in decimal degrees (WGS 84) */
  longitude: number;
  /** Indicates whether an audio track was encoded into the file */
  hasAudio: boolean;
  /** Optional temporary object URL for browser video playback */
  videoBlobUrl?: string;
  /** Dominant visual color hex code used for thumbnail card rendering */
  thumbnailColor?: string;
}

/**
 * Forensic crash or driver-flagged emergency incident record.
 * Incident records safeguard surrounding video buffer clips from circular overwrite.
 */
export interface IncidentRecord {
  /** Unique incident identifier (format: `inc_<timestamp>`) */
  id: string;
  /** Unix epoch timestamp in milliseconds of impact or trigger */
  timestampMillis: number;
  /** Root trigger mechanism for the incident */
  triggerType: 'G_SENSOR' | 'MANUAL' | 'HARD_BRAKE';
  /** Peak resultant G-force recorded during impact window */
  peakGForce: number;
  /** Vehicle speed in km/h at the exact moment of incident trigger */
  speedAtImpactKmh: number;
  /** Geographic latitude at impact point */
  latitude: number;
  /** Geographic longitude at impact point */
  longitude: number;
  /** Pre-event rolling buffer duration preserved in seconds prior to impact (standard: 60s) */
  preEventSeconds: number;
  /** Post-event buffer duration preserved in seconds following impact (standard: 30s) */
  postEventSeconds: number;
  /** Lock guard status ensuring associated video files cannot be pruned */
  isLocked: boolean;
  /** Contextual notes or incident diagnostic label */
  notes: string;
}

/**
 * Real-time storage diagnostics and disk quota metrics for the circular buffer engine.
 */
export interface StorageStats {
  /** Maximum storage allocation in bytes configured by user */
  quotaBytes: number;
  /** Total bytes utilized across all recorded clips */
  usedBytes: number;
  /** Total bytes occupied by locked and emergency-protected clips */
  protectedBytes: number;
  /** Total bytes occupied by eligible recyclable clips */
  unprotectedBytes: number;
  /** Estimated raw free bytes on host device physical filesystem */
  freeDeviceBytes: number;
  /** Safety headroom in bytes (default 500 MB) reserved to prevent out-of-space crashes */
  safetyMarginBytes: number;
  /** Estimated remaining recording time in seconds before quota is saturated */
  estimatedRemainingSeconds: number;
  /** True if quota limit has been reached and no unprotected clips remain for FIFO eviction */
  isQuotaExhausted: boolean;
  /** True if protected/locked files alone exceed or crowd out the allocated quota */
  isProtectedOverflow: boolean;
  /** Total count of clips currently indexed */
  clipCount: number;
}

/**
 * High-frequency GPS telemetry and navigation sensor readings.
 */
export interface TelemetryData {
  /** Current vehicle ground speed in kilometers per hour */
  speedKmh: number;
  /** Current vehicle ground speed in miles per hour */
  speedMph: number;
  /** Cumulative trip distance in kilometers since last trip odometer reset */
  tripDistanceKm: number;
  /** Cumulative trip distance in miles since last trip odometer reset */
  tripDistanceMiles: number;
  /** Current latitude in decimal degrees (WGS 84) */
  latitude: number;
  /** Current longitude in decimal degrees (WGS 84) */
  longitude: number;
  /** Altitude in meters above mean sea level */
  altitudeMeters: number;
  /** Vehicle heading course in degrees (0-359.9°, clockwise from true north) */
  bearingDegrees: number;
  /** Estimated horizontal 1-sigma location accuracy in meters */
  accuracyMeters: number;
  /** True if GPS receiver has acquired a valid 3D satellite position fix */
  isGpsLocked: boolean;
  /** True if no fresh location update has been received within the staleness window */
  isSignalStale: boolean;
  /** Unix epoch timestamp in milliseconds of the most recent location packet */
  lastUpdateTimestamp: number;
}

/**
 * Converts a distance in kilometers to international statute miles.
 *
 * @param km - Distance in kilometers
 * @returns Equivalent distance in statute miles
 *
 * @example
 * ```ts
 * kmToMiles(100); // 62.1371
 * ```
 */
export function kmToMiles(km: number): number {
  return km * 0.621371;
}

/**
 * Converts a speed in kilometers per hour (km/h) to miles per hour (mph).
 *
 * @param kmh - Speed in kilometers per hour
 * @returns Equivalent speed in miles per hour
 *
 * @example
 * ```ts
 * kmhToMph(100); // 62.1371
 * ```
 */
export function kmhToMph(kmh: number): number {
  return kmh * 0.621371;
}

/**
 * Accelerometer and inertial measurement unit (IMU) telemetry readings.
 */
export interface SensorTelemetry {
  /** Lateral acceleration along the vehicle's transverse axis (X-axis) in Gs */
  gX: number;
  /** Longitudinal acceleration along the vehicle's forward/reverse axis (Y-axis) in Gs */
  gY: number;
  /** Vertical acceleration along the vehicle's normal axis (Z-axis) in Gs */
  gZ: number;
  /** Total resultant magnitude: sqrt(x^2 + y^2 + z^2) */
  totalG: number;
  /** Dynamic acceleration magnitude with 1.0G Earth gravity vector isolated */
  linearG: number;
  /** Rolling window of historical peak G values for waveform visualization */
  peakGHistory: number[];
}

/**
 * In-app billing tier status and feature entitlements unlocked via Google Play Billing.
 */
export interface BillingEntitlements {
  /** True if user has an active Pro subscription */
  isProUnlocked: boolean;
  /** Entitlement to expand dashcam ring buffer to 64 GB */
  canUse64GbQuota: boolean;
  /** Entitlement to record in 4K UHD 2160p resolution */
  canUse4kResolution: boolean;
  /** Entitlement to activate concurrent dual front/cabin camera recording */
  canUseFrontCamera: boolean;
  /** Active recurring subscription tier */
  activePlan: 'NONE' | 'MONTHLY' | 'ANNUAL';
}
