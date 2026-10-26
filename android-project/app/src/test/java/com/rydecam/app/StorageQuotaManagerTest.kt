package com.rydecam.app

import com.rydecam.app.database.IncidentDao
import com.rydecam.app.database.RecordingDao
import com.rydecam.app.database.RecordingEntity
import com.rydecam.app.settings.UserPreferences
import com.rydecam.app.settings.UserPreferencesRepository
import com.rydecam.app.storage.StorageQuotaManager
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.mockk
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import java.io.File

class StorageQuotaManagerTest {

    private val recordingDao: RecordingDao = mockk(relaxed = true)
    private val incidentDao: IncidentDao = mockk(relaxed = true)
    private val preferencesRepository: UserPreferencesRepository = mockk(relaxed = true)
    private val mockContext: android.content.Context = mockk(relaxed = true)

    private lateinit var storageQuotaManager: StorageQuotaManager

    @Before
    fun setup() {
        coEvery { mockContext.filesDir } returns File("/data/user/0/com.rydecam.app/files")
        coEvery { preferencesRepository.userPreferencesFlow } returns flowOf(
            UserPreferences(storageQuotaGb = 16)
        )
        storageQuotaManager = StorageQuotaManager(
            context = mockContext,
            recordingDao = recordingDao,
            incidentDao = incidentDao,
            preferencesRepository = preferencesRepository
        )
    }

    @Test
    fun testFifoSelectionPurgesOldestUnprotectedFirst() = runBlocking {
        val oldestRecording = RecordingEntity(
            id = 1L,
            filePath = "/data/test_1.mp4",
            fileName = "test_1.mp4",
            fileSizeBytes = 500L * 1024 * 1024,
            startTimeMillis = 1000L,
            isProtected = false
        )

        val newerRecording = RecordingEntity(
            id = 2L,
            filePath = "/data/test_2.mp4",
            fileName = "test_2.mp4",
            fileSizeBytes = 500L * 1024 * 1024,
            startTimeMillis = 2000L,
            isProtected = false
        )

        coEvery { recordingDao.getTotalStorageUsedBytes() } returnsMany listOf(
            17L * 1024 * 1024 * 1024,
            15L * 1024 * 1024 * 1024
        )
        coEvery { recordingDao.getOldestUnprotectedRecordings(1) } returns listOf(oldestRecording)

        val result = storageQuotaManager.ensureSpaceForNextSegment(estimatedSegmentBytes = 300L * 1024 * 1024)

        assertTrue("FIFO should successfully clear space and return true", result)
        coVerify(exactly = 1) { recordingDao.deleteRecording(oldestRecording) }
    }

    @Test
    fun testProtectedIncidentVideosAreNeverDeletedByFifo() = runBlocking {
        coEvery { recordingDao.getTotalStorageUsedBytes() } returns (17L * 1024 * 1024 * 1024)
        coEvery { recordingDao.getOldestUnprotectedRecordings(1) } returns emptyList()

        val result = storageQuotaManager.ensureSpaceForNextSegment(estimatedSegmentBytes = 300L * 1024 * 1024)

        assertFalse("Should return false when quota is exhausted and all files are protected", result)
        coVerify(exactly = 0) { recordingDao.deleteRecording(any()) }
    }

    @Test
    fun testSelectedQuotaConversion() = runBlocking {
        val quotaBytes = storageQuotaManager.getSelectedQuotaBytes()
        assertEquals(16L * 1024 * 1024 * 1024, quotaBytes)
    }
}
