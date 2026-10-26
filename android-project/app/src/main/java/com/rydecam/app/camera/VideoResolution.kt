package com.rydecam.app.camera

import androidx.camera.video.Quality

enum class VideoResolution(val label: String, val width: Int, val height: Int, val quality: Quality, val isPremium: Boolean) {
    FHD_1080P("1080p Full HD", 1920, 1080, Quality.FHD, false),
    UHD_4K("4K Ultra HD", 3840, 2160, Quality.UHD, true)
}

data class CameraHardwareCapabilities(
    val supports4K: Boolean,
    val supportsConcurrentDualCamera: Boolean,
    val hasFrontCamera: Boolean,
    val maxFps: Int = 30
)

sealed class CameraStatus {
    object Idle : CameraStatus()
    object Initializing : CameraStatus()
    object Streaming : CameraStatus()
    data class Recording(val durationSeconds: Long) : CameraStatus()
    data class Error(val message: String, val isRecoverable: Boolean = true) : CameraStatus()
    data class ThermalThrottled(val message: String) : CameraStatus()
}
