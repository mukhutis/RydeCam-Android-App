package com.rydecam.app.storage

import android.content.Context
import android.os.StatFs
import android.util.Log
import com.rydecam.app.database.IncidentDao
import com.rydecam.app.database.RecordingDao
import com.rydecam.app.database.RecordingEntity
import com.rydecam.app.settings.UserPreferencesRepository
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import java.io.File

class StorageQuotaManager(
    private val context: Context,
    private val recordingDao: RecordingDao,
    private val incidentDao: IncidentDao,
    private val preferencesRepository: UserPreferencesRepository,
    private val scope: CoroutineScope = CoroutineScope(Dispatchers.IO)
) {
    private val mutex = Mutex()
    private val tag = "RydeCamStorageQuota"

    val safetyMarginBytes: Long = 500L * 1024L * 1024L // 500 MB

    private val bytesPerSecond1080p: Long = 2_500_000L
    private val bytesPerSecond4K: Long = 6_000_000L

    private val _storageStats = MutableStateFlow(
        StorageStats(
            quotaBytes = 16L * 1024L * 1024L * 1024L,
            usedBytes = 0L,
            protectedBytes = 0L,
            unprotectedBytes = 0L,
            freeDeviceBytes = 0L,
            safetyMarginBytes = safetyMarginBytes,
            estimatedRemainingSeconds = 0L,
            isQuotaExhausted = false,
            isProtectedOverflow = false
        )
    )
    val storageStats: StateFlow<StorageStats> = _storageStats.asStateFlow()

    private val _storageAlerts = MutableSharedFlow<StorageAlert>()
    val storageAlerts: SharedFlow<StorageAlert> = _storageAlerts.asSharedFlow()

    init {
        scope.launch {
            reconcileStorage()
            refreshStats()
        }
    }

    suspend fun getSelectedQuotaBytes(): Long {
        val prefs = preferencesRepository.userPreferencesFlow.first()
        return prefs.storageQuotaGb.toLong() * 1024L * 1024L * 1024L
    }

    suspend fun refreshStats(): StorageStats = mutex.withLock {
        val quotaBytes = getSelectedQuotaBytes()
        val totalUsedBytes = recordingDao.getTotalStorageUsedBytes()
        val allRecordings = recordingDao.getAllRecordingsList()
        val protectedBytes = allRecordings.filter { it.isProtected }.sumOf { it.fileSizeBytes }
        val unprotectedBytes = totalUsedBytes - protectedBytes

        val freeDeviceBytes = getAvailableInternalStorageBytes()
        val currentBitrate = getCurrentEstimatedBytesPerSecond()

        val availableQuotaBytes = (quotaBytes - totalUsedBytes - safetyMarginBytes).coerceAtLeast(0L)
        val effectiveAvailableBytes = minOf(availableQuotaBytes, (freeDeviceBytes - safetyMarginBytes).coerceAtLeast(0L))
        val estimatedRemainingSec = if (currentBitrate > 0) effectiveAvailableBytes / currentBitrate else 0L

        val isProtectedOverflow = (protectedBytes + safetyMarginBytes) >= quotaBytes
        val isQuotaExhausted = (totalUsedBytes + safetyMarginBytes) >= quotaBytes && unprotectedBytes == 0L

        val stats = StorageStats(
            quotaBytes = quotaBytes,
            usedBytes = totalUsedBytes,
            protectedBytes = protectedBytes,
            unprotectedBytes = unprotectedBytes,
            freeDeviceBytes = freeDeviceBytes,
            safetyMarginBytes = safetyMarginBytes,
            estimatedRemainingSeconds = estimatedRemainingSec,
            isQuotaExhausted = isQuotaExhausted,
            isProtectedOverflow = isProtectedOverflow
        )
        _storageStats.value = stats
        return@withLock stats
    }

    suspend fun ensureSpaceForNextSegment(estimatedSegmentBytes: Long = 300L * 1024L * 1024L): Boolean = mutex.withLock {
        val quotaBytes = getSelectedQuotaBytes()
        val deviceFreeBytes = getAvailableInternalStorageBytes()

        if (deviceFreeBytes < safetyMarginBytes) {
            _storageAlerts.emit(StorageAlert.LowDeviceStorage(deviceFreeBytes / (1024 * 1024)))
            return false
        }

        var currentTotalBytes = recordingDao.getTotalStorageUsedBytes()
        val requiredHeadroom = estimatedSegmentBytes + safetyMarginBytes

        while ((currentTotalBytes + requiredHeadroom) > quotaBytes) {
            val candidates = recordingDao.getOldestUnprotectedRecordings(limit = 1)
            if (candidates.isEmpty()) {
                Log.w(tag, "Storage quota reached but all remaining recordings are PROTECTED incidents.")
                _storageAlerts.emit(
                    StorageAlert.ProtectedStorageFull(
                        "Protected incident clips are occupying the quota limit. Please review or free space in Library."
                    )
                )
                return false
            }

            val oldest = candidates.first()
            deleteRecordingFileAndRecord(oldest)
            _storageAlerts.emit(StorageAlert.OldestSegmentPurged)
            currentTotalBytes = recordingDao.getTotalStorageUsedBytes()
        }

        return true
    }

    suspend fun deleteRecordingFileAndRecord(recording: RecordingEntity): Boolean {
        return try {
            val file = File(recording.filePath)
            if (file.exists()) {
                file.delete()
            }
            recordingDao.deleteRecording(recording)
            Log.d(tag, "FIFO pruned recording: ${recording.fileName} (${recording.fileSizeBytes / 1024 / 1024} MB)")
            true
        } catch (e: Exception) {
            Log.e(tag, "Failed to delete recording file: ${recording.filePath}", e)
            false
        }
    }

    suspend fun reconcileStorage() = mutex.withLock {
        try {
            val allRecordings = recordingDao.getAllRecordingsList()
            for (recording in allRecordings) {
                val file = File(recording.filePath)
                if (!file.exists()) {
                    Log.i(tag, "Reconciling: removing missing file record from DB: ${recording.filePath}")
                    recordingDao.deleteRecording(recording)
                } else {
                    if (file.length() != recording.fileSizeBytes && file.length() > 0) {
                        recordingDao.updateRecording(recording.copy(fileSizeBytes = file.length()))
                    }
                }
            }
        } catch (e: Exception) {
            Log.e(tag, "Storage reconciliation error", e)
        }
    }

    fun getRecordingsDirectory(): File {
        val dir = File(context.filesDir, "rydecam_recordings")
        if (!dir.exists()) {
            dir.mkdirs()
        }
        return dir
    }

    fun getIncidentRecordingsDirectory(): File {
        val dir = File(context.filesDir, "rydecam_incidents")
        if (!dir.exists()) {
            dir.mkdirs()
        }
        return dir
    }

    private fun getAvailableInternalStorageBytes(): Long {
        return try {
            val stat = StatFs(context.filesDir.absolutePath)
            stat.availableBytes
        } catch (e: Exception) {
            Long.MAX_VALUE
        }
    }

    private suspend fun getCurrentEstimatedBytesPerSecond(): Long {
        val prefs = preferencesRepository.userPreferencesFlow.first()
        val is4k = prefs.videoResolution.equals("4K", ignoreCase = true)
        val base = if (is4k) bytesPerSecond4K else bytesPerSecond1080p
        return if (prefs.frontCameraEnabled) (base * 1.6).toLong() else base
    }
}
