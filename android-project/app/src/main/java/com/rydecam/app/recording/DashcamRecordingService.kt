package com.rydecam.app.recording

import android.app.Notification
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Binder
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import android.util.Log
import androidx.core.app.NotificationCompat
import com.rydecam.app.RydeCamApplication
import com.rydecam.app.camera.VideoResolution
import com.rydecam.app.incident.GSensorIncidentDetector
import com.rydecam.app.location.GpsSpeedProvider
import com.rydecam.app.ui.MainActivity
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch

class DashcamRecordingService : Service() {

    private val tag = "RydeCamService"
    private val binder = LocalBinder()
    private val serviceScope = CoroutineScope(Dispatchers.Main + Job())

    private var wakeLock: PowerManager.WakeLock? = null
    lateinit var segmentedRecorder: SegmentedRecorder
        private set
    lateinit var incidentDetector: GSensorIncidentDetector
        private set
    lateinit var gpsSpeedProvider: GpsSpeedProvider
        private set
    lateinit var rollingIncidentBuffer: RollingIncidentBuffer
        private set

    inner class LocalBinder : Binder() {
        fun getService(): DashcamRecordingService = this@DashcamRecordingService
    }

    override fun onBind(intent: Intent?): IBinder = binder

    override fun onCreate() {
        super.onCreate()
        val app = application as RydeCamApplication

        rollingIncidentBuffer = RollingIncidentBuffer(
            recordingDao = app.database.recordingDao(),
            incidentDao = app.database.incidentDao()
        )

        segmentedRecorder = SegmentedRecorder(
            context = this,
            recordingDao = app.database.recordingDao(),
            storageQuotaManager = app.storageQuotaManager,
            rollingIncidentBuffer = rollingIncidentBuffer
        )

        incidentDetector = GSensorIncidentDetector(
            context = this,
            preferencesRepository = app.preferencesRepository
        )

        gpsSpeedProvider = GpsSpeedProvider(context = this)

        acquireWakeLock()
        incidentDetector.startMonitoring()
        gpsSpeedProvider.startTracking()

        serviceScope.launch {
            incidentDetector.incidentEvents.collectLatest { incidentEvent ->
                Log.w(tag, "Incident event received by Service! Peak G: ${incidentEvent.peakGForce}")
                val currentTelemetry = gpsSpeedProvider.telemetry.value
                val enrichedEvent = incidentEvent.copy(
                    speedKmh = currentTelemetry.speedKmh,
                    latitude = currentTelemetry.latitude,
                    longitude = currentTelemetry.longitude
                )
                rollingIncidentBuffer.handleIncidentTrigger(enrichedEvent)
            }
        }

        serviceScope.launch {
            gpsSpeedProvider.telemetry.collectLatest { telemetry ->
                segmentedRecorder.updateTelemetry(telemetry)
            }
        }

        serviceScope.launch {
            while (isActive) {
                delay(1000)
                if (segmentedRecorder.isRecording.value) {
                    updateForegroundNotification()
                }
            }
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_START_RECORDING -> {
                val is4k = intent.getBooleanExtra(EXTRA_IS_4K, false)
                val segmentMin = intent.getIntExtra(EXTRA_SEGMENT_MINUTES, 2)
                val audio = intent.getBooleanExtra(EXTRA_AUDIO_ENABLED, false)

                startForegroundNotification()

                serviceScope.launch {
                    segmentedRecorder.startRecording(
                        segmentMinutes = segmentMin,
                        resolution = if (is4k) VideoResolution.UHD_4K else VideoResolution.FHD_1080P,
                        audioEnabled = audio
                    )
                }
            }
            ACTION_STOP_RECORDING -> {
                serviceScope.launch {
                    segmentedRecorder.stopRecording()
                    stopForeground(STOP_FOREGROUND_REMOVE)
                    stopSelf()
                }
            }
            ACTION_TRIGGER_LOCK -> {
                incidentDetector.triggerManualLock()
            }
        }
        return START_STICKY
    }

    private fun acquireWakeLock() {
        val powerManager = getSystemService(Context.POWER_SERVICE) as PowerManager
        wakeLock = powerManager.newWakeLock(
            PowerManager.PARTIAL_WAKE_LOCK,
            "RydeCam:ForegroundRecordingWakeLock"
        ).apply {
            setReferenceCounted(false)
            acquire(12 * 60 * 60 * 1000L)
        }
        Log.d(tag, "Partial WakeLock acquired.")
    }

    private fun startForegroundNotification() {
        val notification = buildNotification("RydeCam Recording Active", "Continuous road video in background")
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(
                NOTIFICATION_ID,
                notification,
                ServiceInfo.FOREGROUND_SERVICE_TYPE_CAMERA or ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION
            )
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }
    }

    private fun updateForegroundNotification() {
        val elapsed = segmentedRecorder.totalRecordingDurationSec.value
        val minutes = elapsed / 60
        val seconds = elapsed % 60
        val speedStr = gpsSpeedProvider.telemetry.value.getDisplaySpeed("KMH")
        val content = String.format("REC %02d:%02d • Speed: %s km/h", minutes, seconds, speedStr)

        val notification = buildNotification("RydeCam Dashcam", content)
        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as android.app.NotificationManager
        manager.notify(NOTIFICATION_ID, notification)
    }

    private fun buildNotification(title: String, content: String): Notification {
        val launchIntent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP
        }
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val stopIntent = Intent(this, DashcamRecordingService::class.java).apply {
            action = ACTION_STOP_RECORDING
        }
        val stopPendingIntent = PendingIntent.getService(
            this,
            1,
            stopIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val lockIntent = Intent(this, DashcamRecordingService::class.java).apply {
            action = ACTION_TRIGGER_LOCK
        }
        val lockPendingIntent = PendingIntent.getService(
            this,
            2,
            lockIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        return NotificationCompat.Builder(this, RydeCamApplication.RECORDING_NOTIFICATION_CHANNEL_ID)
            .setContentTitle(title)
            .setContentText(content)
            .setSmallIcon(android.R.drawable.ic_menu_camera)
            .setOngoing(true)
            .setContentIntent(pendingIntent)
            .addAction(android.R.drawable.ic_menu_save, "LOCK EVENT", lockPendingIntent)
            .addAction(android.R.drawable.ic_media_pause, "STOP", stopPendingIntent)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
    }

    override fun onDestroy() {
        super.onDestroy()
        serviceScope.cancel()
        incidentDetector.stopMonitoring()
        gpsSpeedProvider.stopTracking()
        try {
            if (wakeLock?.isHeld == true) {
                wakeLock?.release()
                Log.d(tag, "WakeLock released.")
            }
        } catch (e: Exception) {
            Log.e(tag, "Error releasing WakeLock", e)
        }
    }

    companion object {
        const val NOTIFICATION_ID = 1001
        const val ACTION_START_RECORDING = "com.rydecam.action.START_RECORDING"
        const val ACTION_STOP_RECORDING = "com.rydecam.action.STOP_RECORDING"
        const val ACTION_TRIGGER_LOCK = "com.rydecam.action.TRIGGER_LOCK"

        const val EXTRA_IS_4K = "extra_is_4k"
        const val EXTRA_SEGMENT_MINUTES = "extra_segment_minutes"
        const val EXTRA_AUDIO_ENABLED = "extra_audio_enabled"
    }
}
