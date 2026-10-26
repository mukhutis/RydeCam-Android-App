package com.rydecam.app.recording

import android.util.Log
import com.rydecam.app.database.IncidentDao
import com.rydecam.app.database.IncidentEntity
import com.rydecam.app.database.RecordingDao
import com.rydecam.app.database.RecordingEntity
import com.rydecam.app.incident.IncidentEvent
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

class RollingIncidentBuffer(
    private val recordingDao: RecordingDao,
    private val incidentDao: IncidentDao,
    private val scope: CoroutineScope = CoroutineScope(Dispatchers.IO)
) {
    private val tag = "RydeCamRollingBuffer"
    private val mutex = Mutex()

    private val _activePendingIncident = MutableStateFlow<IncidentEntity?>(null)
    val activePendingIncident: StateFlow<IncidentEntity?> = _activePendingIncident.asStateFlow()

    suspend fun handleIncidentTrigger(
        event: IncidentEvent,
        currentlyRecordingSegmentStartMillis: Long? = null
    ): Long = mutex.withLock {
        Log.i(tag, "Handling incident at ${event.timestampMillis}, trigger: ${event.triggerSource}")

        val incidentEntity = IncidentEntity(
            timestampMillis = event.timestampMillis,
            triggerType = event.triggerSource.name,
            peakGForce = event.peakGForce,
            speedAtImpactKmh = event.speedKmh,
            latitude = event.latitude,
            longitude = event.longitude,
            preEventSeconds = event.preEventSeconds,
            postEventSeconds = event.postEventSeconds,
            isLocked = true,
            notes = "RydeCam incident preserved with 60s pre-buffer"
        )
        val incidentId = incidentDao.insertIncident(incidentEntity)
        val persistedIncident = incidentEntity.copy(id = incidentId)
        _activePendingIncident.value = persistedIncident

        val windowStartMillis = event.timestampMillis - (event.preEventSeconds * 1000L)
        val windowEndMillis = event.timestampMillis + 1000L

        val historicalRecordings = recordingDao.getRecordingsInTimeWindow(windowStartMillis, windowEndMillis)
        if (historicalRecordings.isNotEmpty()) {
            val idsToProtect = historicalRecordings.map { it.id }
            recordingDao.protectRecordings(idsToProtect, incidentId)
            Log.d(tag, "Protected ${idsToProtect.size} pre-event recording segments: $idsToProtect")
        }

        scope.launch {
            monitorPostEventFinalization(persistedIncident)
        }

        return@withLock incidentId
    }

    private suspend fun monitorPostEventFinalization(incident: IncidentEntity) {
        val postEventMillis = incident.postEventSeconds * 1000L
        delay(postEventMillis)

        mutex.withLock {
            val eventTime = incident.timestampMillis
            val windowEnd = eventTime + postEventMillis + 2000L

            val postSegments = recordingDao.getRecordingsInTimeWindow(eventTime, windowEnd)
            if (postSegments.isNotEmpty()) {
                val ids = postSegments.map { it.id }
                recordingDao.protectRecordings(ids, incident.id)
                Log.d(tag, "Post-event finished. Protected ${ids.size} post-event segments: $ids")
            }

            if (_activePendingIncident.value?.id == incident.id) {
                _activePendingIncident.value = null
            }
        }
    }

    suspend fun onSegmentFinalized(segment: RecordingEntity): RecordingEntity {
        val active = _activePendingIncident.value
        return if (active != null) {
            val protected = segment.copy(isProtected = true, incidentId = active.id)
            recordingDao.updateRecording(protected)
            Log.d(tag, "Auto-protected newly finalized segment ${segment.fileName} for incident ${active.id}")
            protected
        } else {
            segment
        }
    }
}
