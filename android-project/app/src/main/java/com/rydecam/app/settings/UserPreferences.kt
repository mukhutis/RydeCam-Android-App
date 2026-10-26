package com.rydecam.app.settings

data class UserPreferences(
    val storageQuotaGb: Int = 16,
    val videoResolution: String = "1080p",
    val frontCameraEnabled: Boolean = false,
    val segmentLengthMinutes: Int = 2,
    val audioRecordingEnabled: Boolean = false,
    val gpsOverlayEnabled: Boolean = true,
    val speedUnit: String = "KMH",
    val accidentDetectionEnabled: Boolean = true,
    val accidentSensitivity: String = "MEDIUM",
    val customGThreshold: Float = 2.5f,
    val postEventSeconds: Int = 30,
    val screenOffBehavior: String = "DIM_AFTER_1_MIN",
    val autoStartOnPower: Boolean = false,
    val companionNavPackage: String = "com.google.android.apps.maps",
    val hasPurchasedPremium: Boolean = false
)
