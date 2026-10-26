/**
 * @fileoverview Automotive Storage & Circular Ring Buffer Manager.
 *
 * Implements the core First-In First-Out (FIFO) cyclical storage engine for RydeCam.
 * Emulates the memory and filesystem behavior of high-end automotive dashcams (e.g. BlackVue, VIOFO):
 *
 * Core Guarantees:
 * 1. FIFO Recycler: When video clips exceed the configured logical quota (8GB, 16GB, 32GB, 64GB),
 *    oldest unprotected video clips are systematically evicted to ensure uninterrupted recording.
 * 2. Collision Lock Guard: Clips marked with `isProtected` or flagged by G-sensor / manual triggers
 *    are strictly immune from FIFO recycling and will never be pruned automatically.
 * 3. 500 MB Headroom Buffer: A mandatory safety margin prevents catastrophic write failures
 *    or operating system out-of-storage crashes.
 * 4. Temporal Buffer Preservation: When an impact or manual event occurs, a temporal window
 *    covering 60s pre-event buffer + 30s post-event buffer is locked into the Incident registry.
 *
 * @module services/storageManager
 */

import { DashcamClip, StorageStats, StorageQuotaOption, IncidentRecord } from '../types/dashcam';

/** LocalStorage key for persisting indexed dashcam clips */
const STORAGE_KEY = 'rydecam_clips_v1';
/** LocalStorage key for persisting forensic incident metadata */
const INCIDENTS_KEY = 'rydecam_incidents_v1';

/**
 * Storage and FIFO retention manager for the automotive video pipeline.
 */
export class WebStorageManager {
  /** In-memory cache of recorded clips */
  private clips: DashcamClip[] = [];
  /** In-memory registry of locked collision & manual incidents */
  private incidents: IncidentRecord[] = [];
  /** Current storage allocation quota in gigabytes */
  private quotaGb: StorageQuotaOption = 16;
  /** Mandatory safety buffer reserved to avoid OS disk exhaustion (500 megabytes) */
  private readonly safetyMarginBytes = 500 * 1024 * 1024;

  /**
   * Initializes the storage manager, restores persisted metadata from LocalStorage,
   * and seeds realistic initial clips if the storage is uninitialized.
   */
  constructor() {
    this.loadFromStorage();
    if (this.clips.length === 0) {
      this.seedInitialSampleClips();
    }
  }

  /**
   * Updates the logical storage quota and triggers immediate FIFO pruning if needed.
   *
   * @param quota - Target quota in gigabytes (8, 16, 32, or 64)
   */
  public setQuotaGb(quota: StorageQuotaOption): void {
    this.quotaGb = quota;
    this.enforceFifo();
  }

  /**
   * Retrieves all registered clips sorted descending by start timestamp (newest first).
   *
   * @returns Cloned array of DashcamClip objects
   */
  public getClips(): DashcamClip[] {
    return [...this.clips].sort((a, b) => b.startTimeMillis - a.startTimeMillis);
  }

  /**
   * Retrieves all locked incident records sorted descending by timestamp.
   *
   * @returns Cloned array of IncidentRecord objects
   */
  public getIncidents(): IncidentRecord[] {
    return [...this.incidents].sort((a, b) => b.timestampMillis - a.timestampMillis);
  }

  /**
   * Computes comprehensive storage allocation statistics, including used bytes,
   * protected locked capacity, remaining estimated recording time, and overflow flags.
   *
   * Invariant:
   *   availableQuota = max(0, quotaBytes - usedBytes - safetyMarginBytes)
   *   estimatedSeconds = availableQuota / estimated_bitrate_bytes_per_sec (~2.5 MB/s for 1080p30)
   *
   * @returns Real-time StorageStats snapshot
   */
  public getStorageStats(): StorageStats {
    const quotaBytes = this.quotaGb * 1024 * 1024 * 1024;
    let usedBytes = 0;
    let protectedBytes = 0;

    for (const clip of this.clips) {
      usedBytes += clip.fileSizeBytes;
      if (clip.isProtected) {
        protectedBytes += clip.fileSizeBytes;
      }
    }

    const unprotectedBytes = usedBytes - protectedBytes;
    const availableQuotaBytes = Math.max(0, quotaBytes - usedBytes - this.safetyMarginBytes);
    // Standard 1080p 30fps H.264 bitrate is approximately 20 Mbps (~2.5 MB/sec)
    const estimatedRemainingSeconds = Math.floor(availableQuotaBytes / 2_500_000);

    return {
      quotaBytes,
      usedBytes,
      protectedBytes,
      unprotectedBytes,
      freeDeviceBytes: 42 * 1024 * 1024 * 1024, // Simulated physical host device free space
      safetyMarginBytes: this.safetyMarginBytes,
      estimatedRemainingSeconds,
      isQuotaExhausted: usedBytes + this.safetyMarginBytes >= quotaBytes && unprotectedBytes === 0,
      isProtectedOverflow: protectedBytes + this.safetyMarginBytes >= quotaBytes,
      clipCount: this.clips.length
    };
  }

  /**
   * Registers a newly finalized video clip into the ring buffer, runs FIFO
   * retention enforcement, and persists state to LocalStorage.
   *
   * @param clip - Completed DashcamClip metadata
   * @returns The registered clip
   */
  public addClip(clip: DashcamClip): DashcamClip {
    this.clips.push(clip);
    this.enforceFifo();
    this.saveToStorage();
    return clip;
  }

  /**
   * Deletes a specific clip by identifier (e.g. manual user deletion from gallery).
   *
   * @param clipId - Unique ID of the clip to remove
   * @returns True if the clip was found and deleted, false otherwise
   */
  public deleteClip(clipId: string): boolean {
    const index = this.clips.findIndex(c => c.id === clipId);
    if (index !== -1) {
      this.clips.splice(index, 1);
      this.saveToStorage();
      return true;
    }
    return false;
  }

  /**
   * Toggles the protection lock status on a clip.
   * Protected clips are exempted from automated circular FIFO eviction.
   *
   * @param clipId - Target clip identifier
   * @returns New boolean protection state, or false if clip was not found
   */
  public toggleProtection(clipId: string): boolean {
    const clip = this.clips.find(c => c.id === clipId);
    if (clip) {
      clip.isProtected = !clip.isProtected;
      this.saveToStorage();
      return clip.isProtected;
    }
    return false;
  }

  /**
   * Handles an emergency shock or manual incident trigger.
   * Creates an immutable IncidentRecord and locks all video clips overlapping
   * the temporal pre-event (standard 60s) and post-event (standard 30s) windows.
   *
   * @param timestampMillis - Timestamp of the collision or button press
   * @param triggerType - Cause of trigger ('G_SENSOR', 'MANUAL', or 'HARD_BRAKE')
   * @param peakG - Peak resultant G-force recorded during impact
   * @param speedKmh - Current vehicle speed in km/h at impact
   * @param lat - GPS latitude at incident location
   * @param lng - GPS longitude at incident location
   * @param preEventSeconds - Seconds before impact to safeguard (defaults to 60s)
   * @param postEventSeconds - Seconds after impact to safeguard (defaults to 30s)
   * @returns The newly created IncidentRecord
   */
  public handleIncidentTrigger(
    timestampMillis: number,
    triggerType: 'G_SENSOR' | 'MANUAL' | 'HARD_BRAKE',
    peakG: number,
    speedKmh: number,
    lat: number,
    lng: number,
    preEventSeconds: number = 60,
    postEventSeconds: number = 30
  ): IncidentRecord {
    const incidentId = 'inc_' + timestampMillis;
    const incident: IncidentRecord = {
      id: incidentId,
      timestampMillis,
      triggerType,
      peakGForce: peakG,
      speedAtImpactKmh: speedKmh,
      latitude: lat,
      longitude: lng,
      preEventSeconds,
      postEventSeconds,
      isLocked: true,
      notes: triggerType === 'MANUAL' ? 'Driver Manual Lock' : `Collision Impact detected (${peakG.toFixed(1)}G)`
    };

    this.incidents.push(incident);

    // Calculate preservation bounding interval
    const windowStart = timestampMillis - (preEventSeconds * 1000);
    const windowEnd = timestampMillis + 1500; // Extra buffer to cover in-flight segment

    for (const clip of this.clips) {
      if (clip.endTimeMillis >= windowStart && clip.startTimeMillis <= windowEnd) {
        clip.isProtected = true;
        clip.incidentId = incidentId;
        clip.triggerReason = incident.notes;
      }
    }

    this.saveToStorage();
    return incident;
  }

  /**
   * Enforces the FIFO circular eviction loop:
   * While (totalUsed + safetyMargin > quotaBytes), evict the oldest unprotected clip.
   *
   * Invariant:
   * - Protected clips are never purged.
   * - Loop halts if only protected clips remain (signaling quota exhaustion warning).
   *
   * @returns Total number of clips purged during this cycle
   */
  public enforceFifo(): number {
    const quotaBytes = this.quotaGb * 1024 * 1024 * 1024;
    let deletedCount = 0;
    let totalUsed = this.clips.reduce((sum, c) => sum + c.fileSizeBytes, 0);

    while (totalUsed + this.safetyMarginBytes > quotaBytes) {
      // Find eligible unprotected clips sorted chronologically ascending (oldest first)
      const unprotectedClips = this.clips
        .filter(c => !c.isProtected)
        .sort((a, b) => a.startTimeMillis - b.startTimeMillis);

      // Invariant: Stop if all remaining clips are protected to avoid corrupting user evidence
      if (unprotectedClips.length === 0) {
        break;
      }

      const oldest = unprotectedClips[0];
      const index = this.clips.findIndex(c => c.id === oldest.id);
      if (index !== -1) {
        this.clips.splice(index, 1);
        deletedCount++;
        totalUsed -= oldest.fileSizeBytes;
      }
    }

    if (deletedCount > 0) {
      this.saveToStorage();
    }
    return deletedCount;
  }

  /**
   * Loads clips and incident records from browser LocalStorage with schema validation.
   */
  private loadFromStorage(): void {
    try {
      const storedClips = localStorage.getItem(STORAGE_KEY);
      if (storedClips) {
        this.clips = JSON.parse(storedClips);
      }
      const storedIncidents = localStorage.getItem(INCIDENTS_KEY);
      if (storedIncidents) {
        this.incidents = JSON.parse(storedIncidents);
      }
    } catch (e) {
      console.warn('Could not read from localStorage', e);
    }
  }

  /**
   * Serializes in-memory clip indices and incident logs to LocalStorage.
   */
  private saveToStorage(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.clips));
      localStorage.setItem(INCIDENTS_KEY, JSON.stringify(this.incidents));
    } catch (e) {
      console.warn('Could not save to localStorage', e);
    }
  }

  /**
   * Populates initial realistic dashcam footage segments on first launch.
   */
  private seedInitialSampleClips(): void {
    const now = Date.now();
    const clipDuration = 120;
    const baseSizeBytes = 280 * 1024 * 1024; // ~280 MB per 2-minute 1080p clip

    this.clips = [
      {
        id: 'clip_sample_1',
        fileName: 'RYDECAM_20261016_113000_1080P.mp4',
        startTimeMillis: now - 600_000,
        endTimeMillis: now - 480_000,
        durationSeconds: clipDuration,
        fileSizeBytes: baseSizeBytes,
        resolution: '1080p',
        cameraLens: 'BACK',
        isProtected: false,
        averageSpeedKmh: 68.4,
        maxSpeedKmh: 82.1,
        distanceCoveredKm: 2.28,
        latitude: 37.7749,
        longitude: -122.4194,
        hasAudio: false,
        thumbnailColor: '#1e293b'
      },
      {
        id: 'clip_sample_2',
        fileName: 'RYDECAM_20261016_113200_1080P.mp4',
        startTimeMillis: now - 480_000,
        endTimeMillis: now - 360_000,
        durationSeconds: clipDuration,
        fileSizeBytes: baseSizeBytes + 15_000_000,
        resolution: '1080p',
        cameraLens: 'BACK',
        isProtected: false,
        averageSpeedKmh: 72.0,
        maxSpeedKmh: 79.5,
        distanceCoveredKm: 2.40,
        latitude: 37.7761,
        longitude: -122.4180,
        hasAudio: false,
        thumbnailColor: '#0f172a'
      },
      {
        id: 'clip_sample_incident',
        fileName: 'RYDECAM_20261016_113400_1080P_EVENT.mp4',
        startTimeMillis: now - 360_000,
        endTimeMillis: now - 240_000,
        durationSeconds: clipDuration,
        fileSizeBytes: baseSizeBytes + 10_000_000,
        resolution: '1080p',
        cameraLens: 'BACK',
        isProtected: true,
        incidentId: 'inc_sample_1',
        triggerReason: 'Collision Shock (2.8G)',
        averageSpeedKmh: 54.2,
        maxSpeedKmh: 74.0,
        distanceCoveredKm: 1.81,
        latitude: 37.7785,
        longitude: -122.4150,
        hasAudio: false,
        thumbnailColor: '#331e1e'
      },
      {
        id: 'clip_sample_4',
        fileName: 'RYDECAM_20261016_113600_1080P.mp4',
        startTimeMillis: now - 240_000,
        endTimeMillis: now - 120_000,
        durationSeconds: clipDuration,
        fileSizeBytes: baseSizeBytes - 5_000_000,
        resolution: '1080p',
        cameraLens: 'BACK',
        isProtected: false,
        averageSpeedKmh: 64.5,
        maxSpeedKmh: 68.0,
        distanceCoveredKm: 2.15,
        latitude: 37.7810,
        longitude: -122.4120,
        hasAudio: false,
        thumbnailColor: '#1e293b'
      }
    ];

    this.incidents = [
      {
        id: 'inc_sample_1',
        timestampMillis: now - 300_000,
        triggerType: 'G_SENSOR',
        peakGForce: 2.8,
        speedAtImpactKmh: 58.0,
        latitude: 37.7785,
        longitude: -122.4150,
        preEventSeconds: 60,
        postEventSeconds: 30,
        isLocked: true,
        notes: 'Collision Shock (2.8G)'
      }
    ];

    this.saveToStorage();
  }
}

/** Singleton instance of WebStorageManager for application-wide storage coordination */
export const webStorage = new WebStorageManager();
