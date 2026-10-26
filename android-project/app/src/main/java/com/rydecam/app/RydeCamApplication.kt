package com.rydecam.app

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.os.Build
import com.rydecam.app.billing.BillingRepository
import com.rydecam.app.database.DashcamDatabase
import com.rydecam.app.settings.UserPreferencesRepository
import com.rydecam.app.storage.StorageQuotaManager

class RydeCamApplication : Application() {

    lateinit var database: DashcamDatabase
        private set

    lateinit var preferencesRepository: UserPreferencesRepository
        private set

    lateinit var storageQuotaManager: StorageQuotaManager
        private set

    lateinit var billingRepository: BillingRepository
        private set

    override fun onCreate() {
        super.onCreate()
        instance = this

        // Initialize Room Database
        database = DashcamDatabase.getInstance(this)

        // Initialize Preferences Repository (DataStore)
        preferencesRepository = UserPreferencesRepository(this)

        // Initialize Storage Quota & FIFO Manager
        storageQuotaManager = StorageQuotaManager(
            context = this,
            recordingDao = database.recordingDao(),
            incidentDao = database.incidentDao(),
            preferencesRepository = preferencesRepository
        )

        // Initialize Google Play Billing Repository
        billingRepository = BillingRepository(this)
        billingRepository.startConnection()

        createNotificationChannels()
    }

    private fun createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                RECORDING_NOTIFICATION_CHANNEL_ID,
                getString(R.string.notification_channel_name),
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = getString(R.string.notification_channel_desc)
                setShowBadge(false)
            }

            val incidentChannel = NotificationChannel(
                INCIDENT_NOTIFICATION_CHANNEL_ID,
                "RydeCam Incident Alerts",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Alerts triggered by crash or G-sensor impact detection"
                enableVibration(true)
            }

            val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.createNotificationChannel(channel)
            notificationManager.createNotificationChannel(incidentChannel)
        }
    }

    companion object {
        const val RECORDING_NOTIFICATION_CHANNEL_ID = "rydecam_foreground_recording"
        const val INCIDENT_NOTIFICATION_CHANNEL_ID = "rydecam_incident_detected"

        lateinit var instance: RydeCamApplication
            private set
    }
}
