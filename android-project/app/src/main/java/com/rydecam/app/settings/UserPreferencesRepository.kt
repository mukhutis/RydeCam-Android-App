package com.rydecam.app.settings

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.floatPreferencesKey
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "rydecam_preferences")

class UserPreferencesRepository(private val context: Context) {

    private object PreferencesKeys {
        val STORAGE_QUOTA_GB = intPreferencesKey("storage_quota_gb")
        val VIDEO_RESOLUTION = stringPreferencesKey("video_resolution")
        val FRONT_CAMERA_ENABLED = booleanPreferencesKey("front_camera_enabled")
        val SEGMENT_LENGTH_MINUTES = intPreferencesKey("segment_length_minutes")
        val AUDIO_RECORDING_ENABLED = booleanPreferencesKey("audio_recording_enabled")
        val GPS_OVERLAY_ENABLED = booleanPreferencesKey("gps_overlay_enabled")
        val SPEED_UNIT = stringPreferencesKey("speed_unit")
        val ACCIDENT_DETECTION_ENABLED = booleanPreferencesKey("accident_detection_enabled")
        val ACCIDENT_SENSITIVITY = stringPreferencesKey("accident_sensitivity")
        val CUSTOM_G_THRESHOLD = floatPreferencesKey("custom_g_threshold")
        val POST_EVENT_SECONDS = intPreferencesKey("post_event_seconds")
        val SCREEN_OFF_BEHAVIOR = stringPreferencesKey("screen_off_behavior")
        val AUTO_START_ON_POWER = booleanPreferencesKey("auto_start_on_power")
        val COMPANION_NAV_PACKAGE = stringPreferencesKey("companion_nav_package")
        val HAS_PURCHASED_PREMIUM = booleanPreferencesKey("has_purchased_premium")
    }

    val userPreferencesFlow: Flow<UserPreferences> = context.dataStore.data.map { preferences ->
        UserPreferences(
            storageQuotaGb = preferences[PreferencesKeys.STORAGE_QUOTA_GB] ?: 16,
            videoResolution = preferences[PreferencesKeys.VIDEO_RESOLUTION] ?: "1080p",
            frontCameraEnabled = preferences[PreferencesKeys.FRONT_CAMERA_ENABLED] ?: false,
            segmentLengthMinutes = preferences[PreferencesKeys.SEGMENT_LENGTH_MINUTES] ?: 2,
            audioRecordingEnabled = preferences[PreferencesKeys.AUDIO_RECORDING_ENABLED] ?: false,
            gpsOverlayEnabled = preferences[PreferencesKeys.GPS_OVERLAY_ENABLED] ?: true,
            speedUnit = preferences[PreferencesKeys.SPEED_UNIT] ?: "KMH",
            accidentDetectionEnabled = preferences[PreferencesKeys.ACCIDENT_DETECTION_ENABLED] ?: true,
            accidentSensitivity = preferences[PreferencesKeys.ACCIDENT_SENSITIVITY] ?: "MEDIUM",
            customGThreshold = preferences[PreferencesKeys.CUSTOM_G_THRESHOLD] ?: 2.5f,
            postEventSeconds = preferences[PreferencesKeys.POST_EVENT_SECONDS] ?: 30,
            screenOffBehavior = preferences[PreferencesKeys.SCREEN_OFF_BEHAVIOR] ?: "DIM_AFTER_1_MIN",
            autoStartOnPower = preferences[PreferencesKeys.AUTO_START_ON_POWER] ?: false,
            companionNavPackage = preferences[PreferencesKeys.COMPANION_NAV_PACKAGE] ?: "com.google.android.apps.maps",
            hasPurchasedPremium = preferences[PreferencesKeys.HAS_PURCHASED_PREMIUM] ?: false
        )
    }

    suspend fun updateStorageQuota(quotaGb: Int) {
        context.dataStore.edit { preferences ->
            preferences[PreferencesKeys.STORAGE_QUOTA_GB] = quotaGb
        }
    }

    suspend fun updateVideoResolution(resolution: String) {
        context.dataStore.edit { preferences ->
            preferences[PreferencesKeys.VIDEO_RESOLUTION] = resolution
        }
    }

    suspend fun updateFrontCameraEnabled(enabled: Boolean) {
        context.dataStore.edit { preferences ->
            preferences[PreferencesKeys.FRONT_CAMERA_ENABLED] = enabled
        }
    }

    suspend fun updateSegmentLength(minutes: Int) {
        context.dataStore.edit { preferences ->
            preferences[PreferencesKeys.SEGMENT_LENGTH_MINUTES] = minutes
        }
    }

    suspend fun updateAudioRecording(enabled: Boolean) {
        context.dataStore.edit { preferences ->
            preferences[PreferencesKeys.AUDIO_RECORDING_ENABLED] = enabled
        }
    }

    suspend fun updateGpsOverlay(enabled: Boolean) {
        context.dataStore.edit { preferences ->
            preferences[PreferencesKeys.GPS_OVERLAY_ENABLED] = enabled
        }
    }

    suspend fun updateSpeedUnit(unit: String) {
        context.dataStore.edit { preferences ->
            preferences[PreferencesKeys.SPEED_UNIT] = unit
        }
    }

    suspend fun updateAccidentDetection(enabled: Boolean) {
        context.dataStore.edit { preferences ->
            preferences[PreferencesKeys.ACCIDENT_DETECTION_ENABLED] = enabled
        }
    }

    suspend fun updateAccidentSensitivity(sensitivity: String) {
        context.dataStore.edit { preferences ->
            preferences[PreferencesKeys.ACCIDENT_SENSITIVITY] = sensitivity
        }
    }

    suspend fun updateCustomGThreshold(threshold: Float) {
        context.dataStore.edit { preferences ->
            preferences[PreferencesKeys.CUSTOM_G_THRESHOLD] = threshold
        }
    }

    suspend fun updatePostEventSeconds(seconds: Int) {
        context.dataStore.edit { preferences ->
            preferences[PreferencesKeys.POST_EVENT_SECONDS] = seconds
        }
    }

    suspend fun updateScreenOffBehavior(behavior: String) {
        context.dataStore.edit { preferences ->
            preferences[PreferencesKeys.SCREEN_OFF_BEHAVIOR] = behavior
        }
    }

    suspend fun updateCompanionNavPackage(packageName: String) {
        context.dataStore.edit { preferences ->
            preferences[PreferencesKeys.COMPANION_NAV_PACKAGE] = packageName
        }
    }

    suspend fun updatePremiumPurchased(hasPurchased: Boolean) {
        context.dataStore.edit { preferences ->
            preferences[PreferencesKeys.HAS_PURCHASED_PREMIUM] = hasPurchased
        }
    }
}
