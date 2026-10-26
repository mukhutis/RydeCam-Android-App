import { DashcamClip, StorageStats, StorageQuotaOption, IncidentRecord } from '../types/dashcam';

const STORAGE_KEY = 'rydecam_clips_v1';
const INCIDENTS_KEY = 'rydecam_incidents_v1';

export class WebStorageManager {
  private clips: DashcamClip[] = [];
  private incidents: IncidentRecord[] = [];
  private quotaGb: StorageQuotaOption = 16;
  private readonly safetyMarginBytes = 500 * 1024 * 1024; // 500 MB

  constructor() {
    this.loadFromStorage();
    if (this.clips.length === 0) {
      this.seedInitialSampleClips();
    }
  }

  public setQuotaGb(quota: StorageQuotaOption) {
    this.quotaGb = quota;
    this.enforceFifo();
  }

  public getClips(): DashcamClip[] {
    return [...this.clips].sort((a, b) => b.startTimeMillis - a.startTimeMillis);
  }

  public getIncidents(): IncidentRecord[] {
    return [...this.incidents].sort((a, b) => b.timestampMillis - a.timestampMillis);
  }

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
    const estimatedRemainingSeconds = Math.floor(availableQuotaBytes / 2_500_000);

    return {
      quotaBytes,
      usedBytes,
      protectedBytes,
      unprotectedBytes,
      freeDeviceBytes: 42 * 1024 * 1024 * 1024,
      safetyMarginBytes: this.safetyMarginBytes,
      estimatedRemainingSeconds,
      isQuotaExhausted: usedBytes + this.safetyMarginBytes >= quotaBytes && unprotectedBytes === 0,
      isProtectedOverflow: protectedBytes + this.safetyMarginBytes >= quotaBytes,
      clipCount: this.clips.length
    };
  }

  public addClip(clip: DashcamClip): DashcamClip {
    this.clips.push(clip);
    this.enforceFifo();
    this.saveToStorage();
    return clip;
  }

  public deleteClip(clipId: string): boolean {
    const index = this.clips.findIndex(c => c.id === clipId);
    if (index !== -1) {
      this.clips.splice(index, 1);
      this.saveToStorage();
      return true;
    }
    return false;
  }

  public toggleProtection(clipId: string): boolean {
    const clip = this.clips.find(c => c.id === clipId);
    if (clip) {
      clip.isProtected = !clip.isProtected;
      this.saveToStorage();
      return clip.isProtected;
    }
    return false;
  }

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

    const windowStart = timestampMillis - (preEventSeconds * 1000);
    const windowEnd = timestampMillis + 1500;

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

  public enforceFifo(): number {
    const quotaBytes = this.quotaGb * 1024 * 1024 * 1024;
    let deletedCount = 0;
    let totalUsed = this.clips.reduce((sum, c) => sum + c.fileSizeBytes, 0);

    while (totalUsed + this.safetyMarginBytes > quotaBytes) {
      const unprotectedClips = this.clips
        .filter(c => !c.isProtected)
        .sort((a, b) => a.startTimeMillis - b.startTimeMillis);

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

  private loadFromStorage() {
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

  private saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.clips));
      localStorage.setItem(INCIDENTS_KEY, JSON.stringify(this.incidents));
    } catch (e) {
      console.warn('Could not save to localStorage', e);
    }
  }

  private seedInitialSampleClips() {
    const now = Date.now();
    const clipDuration = 120;
    const baseSizeBytes = 280 * 1024 * 1024;

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

export const webStorage = new WebStorageManager();
