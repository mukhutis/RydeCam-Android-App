package com.rydecam.app

import com.rydecam.app.database.IncidentDao
import com.rydecam.app.database.RecordingDao
import com.rydecam.app.database.RecordingEntity
import com.rydecam.app.incident.IncidentEvent
import com.rydecam.app.incident.TriggerSource
import com.rydecam.app.recording.RollingIncidentBuffer
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.mockk
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

class RollingIncidentBufferTest {

    private val recordingDao: RecordingDao = mockk(relaxed = true)
    private val incidentDao: IncidentDao = mockk(relaxed = true)
    private lateinit var rollingIncidentBuffer: RollingIncidentBuffer

    @Before
    fun setup() {
        coEvery { incidentDao.insertIncident(any()) } returns 42L
        rollingIncidentBuffer = RollingIncidentBuffer(recordingDao, incidentDao)
    }

    @Test
    fun testPreEvent60SecondsSegmentsAreProtected() = runBlocking {
        val impactTime = 100_000L
        val preEvent60Sec = 60

        val segmentPreEvent1 = RecordingEntity(
            id = 101L,
            filePath = "/data/rec1.mp4",
            fileName = "rec1.mp4",
            fileSizeBytes = 200_000_000L,
            startTimeMillis = 35_000L,
            endTimeMillis = 70_000L,
            isProtected = false
        )

        val segmentPreEvent2 = RecordingEntity(
            id = 102L,
            filePath = "/data/rec2.mp4",
            fileName = "rec2.mp4",
            fileSizeBytes = 200_000_000L,
            startTimeMillis = 70_001L,
            endTimeMillis = 100_000L,
            isProtected = false
        )

        coEvery {
            recordingDao.getRecordingsInTimeWindow(any(), any())
        } returns listOf(segmentPreEvent1, segmentPreEvent2)

        val event = IncidentEvent(
            timestampMillis = impactTime,
            triggerSource = TriggerSource.G_SENSOR,
            peakGForce = 3.2,
            preEventSeconds = 60,
            postEventSeconds = 30
        )

        val incidentId = rollingIncidentBuffer.handleIncidentTrigger(event)

        assertEquals(42L, incidentId)
        coVerify(exactly = 1) {
            recordingDao.protectRecordings(listOf(101L, 102L), 42L)
        }
    }

    @Test
    fun testActiveIncidentAutoProtectsNewlyFinalizedSegment() = runBlocking {
        val event = IncidentEvent(
            timestampMillis = System.currentTimeMillis(),
            triggerSource = TriggerSource.MANUAL_USER,
            peakGForce = 1.0,
            preEventSeconds = 60,
            postEventSeconds = 30
        )
        rollingIncidentBuffer.handleIncidentTrigger(event)

        val newSegment = RecordingEntity(
            id = 201L,
            filePath = "/data/new_segment.mp4",
            fileName = "new_segment.mp4",
            fileSizeBytes = 250_000_000L,
            startTimeMillis = System.currentTimeMillis(),
            isProtected = false
        )

        val finalized = rollingIncidentBuffer.onSegmentFinalized(newSegment)

        assertTrue("Newly finalized segment during active incident must be protected", finalized.isProtected)
        assertEquals(42L, finalized.incidentId)
    }
}
