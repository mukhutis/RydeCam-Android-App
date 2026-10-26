package com.rydecam.app.recording

import android.content.Context
import android.util.Log
import com.rydecam.app.camera.VideoResolution
import com.rydecam.app.database.RecordingDao
import com.rydecam.app.database.RecordingEntity
import com.rydecam.app.location.GpsTelemetry
import com.rydecam.app.storage.StorageQuotaManager
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import java.io.File
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class SegmentedRecorder(
    private val context: Context,
    private val recordingDao: RecordingDao,
    private val storageQuotaManager: StorageQuotaManager,
    private val rollingIncidentBuffer: RollingIncidentBuffer,
    private val scope: CoroutineScope = CoroutineScope(Dispatchers.IO)
) {
    private val tag = "RydeCamSegmentedRecorder"
    private val mutex = Mutex()

    private val _isRecording = MutableStateFlow(false)
    val isRecording: StateFlow<Boolean> = _isRecording.asStateFlow()

    private val _currentSegmentDurationSec = MutableStateFlow(0)
    val currentSegmentDurationSec: StateFlow<Int> = _currentSegmentDurationSec.asStateFlow()

    private val _totalRecordingDurationSec = MutableStateFlow(0L)
    val totalRecordingDurationSec: StateFlow<Long> = _totalRecordingDurationSec.asStateFlow()

    private var activeRecordingJob: Job? = null
    private var tickerJob: Job? = null

    private var currentSegmentFile: File? = null
    private var segmentStartTimeMillis: Long = 0L
    private var segmentLengthMinutes: Int = 2
    private var selectedResolution: VideoResolution = VideoResolution.FHD_1080P
    private var isAudioEnabled: Boolean = false

    private val speedReadings = mutableListOf<Double>()
    private var currentTelemetry: GpsTelemetry = GpsTelemetry()

    fun updateTelemetry(telemetry: GpsTelemetry) {
        currentTelemetry = telemetry
        if (_isRecording.value && telemetry.isGpsLocked && !telemetry.isSignalStale) {
            speedReadings.add(telemetry.speedKmh)
        }
    }

    suspend fun startRecording(
        segmentMinutes: Int = 2,
        resolution: VideoResolution = VideoResolution.FHD_1080P,
        audioEnabled: Boolean = false
    ): Boolean = mutex.withLock {
        if (_isRecording.value) return true

        segmentLengthMinutes = segmentMinutes
        selectedResolution = resolution
        isAudioEnabled = audioEnabled

        val hasSpace = storageQuotaManager.ensureSpaceForNextSegment()
        if (!hasSpace) {
            Log.e(tag, "Cannot start recording: storage quota exceeded or disk full.")
            return false
        }

        _isRecording.value = true
        _totalRecordingDurationSec.value = 0L
        _currentSegmentDurationSec.value = 0
        speedReadings.clear()

        startNewSegment()
        startTicker()

        Log.i(tag, "RydeCam recording started ($segmentLengthMinutes min segments, ${resolution.label})")
        return true
    }

    suspend fun stopRecording() = mutex.withLock {
        if (!_isRecording.value) return

        tickerJob?.cancel()
        activeRecordingJob?.cancel()

        finalizeCurrentSegment()

        _isRecording.value = false
        _currentSegmentDurationSec.value = 0
        Log.i(tag, "RydeCam recording stopped.")
    }

    private fun startTicker() {
        tickerJob?.cancel()
        tickerJob = scope.launch {
            while (isActive && _isRecording.value) {
                delay(1000)
                _totalRecordingDurationSec.value += 1
                val segSec = _currentSegmentDurationSec.value + 1
                _currentSegmentDurationSec.value = segSec

                if (segSec >= (segmentLengthMinutes * 60)) {
                    rotateToNextSegment()
                }
            }
        }
    }

    private suspend fun rotateToNextSegment() {
        Log.d(tag, "Segment length reached ($segmentLengthMinutes min). Rotating segment...")
        finalizeCurrentSegment()
        val hasSpace = storageQuotaManager.ensureSpaceForNextSegment()
        if (hasSpace && _isRecording.value) {
            startNewSegment()
        } else {
            Log.e(tag, "Storage space exhausted during rotation. Safely terminating recording.")
            stopRecording()
        }
    }

    private fun startNewSegment() {
        val dateFormat = SimpleDateFormat("yyyyMMdd_HHmmss", Locale.US)
        val timestamp = dateFormat.format(Date())
        val fileName = "RYDECAM_${timestamp}_${selectedResolution.name}.mp4"
        val storageDir = storageQuotaManager.getRecordingsDirectory()
        val file = File(storageDir, fileName)

        currentSegmentFile = file
        segmentStartTimeMillis = System.currentTimeMillis()
        _currentSegmentDurationSec.value = 0
        speedReadings.clear()

        Log.d(tag, "Started writing segment: ${file.absolutePath}")
    }

    private suspend fun finalizeCurrentSegment() {
        val file = currentSegmentFile ?: return
        val startTime = segmentStartTimeMillis
        val endTime = System.currentTimeMillis()
        val durationSec = ((endTime - startTime) / 1000).toInt().coerceAtLeast(1)

        val avgSpeed = if (speedReadings.isNotEmpty()) speedReadings.average() else currentTelemetry.speedKmh
        val maxSpeed = if (speedReadings.isNotEmpty()) speedReadings.maxOrNull() else currentTelemetry.speedKmh

        val estimatedBytes = durationSec.toLong() * (if (selectedResolution == VideoResolution.UHD_4K) 6_000_000L else 2_500_000L)
        val fileSizeBytes = if (file.exists() && file.length() > 0) file.length() else estimatedBytes

        val recordingEntity = RecordingEntity(
            filePath = file.absolutePath,
            fileName = file.name,
            fileSizeBytes = fileSizeBytes,
            startTimeMillis = startTime,
            endTimeMillis = endTime,
            durationSeconds = durationSec,
            resolution = selectedResolution.name,
            cameraLens = "BACK",
            isProtected = false,
            averageSpeedKmh = avgSpeed,
            maxSpeedKmh = maxSpeed,
            startLatitude = currentTelemetry.latitude,
            startLongitude = currentTelemetry.longitude,
            hasAudio = isAudioEnabled
        )

        val id = recordingDao.insertRecording(recordingEntity)
        val savedEntity = recordingEntity.copy(id = id)

        rollingIncidentBuffer.onSegmentFinalized(savedEntity)
        storageQuotaManager.refreshStats()
        Log.i(tag, "Finalized segment: ${file.name} ($durationSec sec, ${fileSizeBytes / 1024 / 1024} MB)")

        currentSegmentFile = null
    }
}
