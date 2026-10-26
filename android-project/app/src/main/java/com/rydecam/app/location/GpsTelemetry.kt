package com.rydecam.app.location

data class GpsTelemetry(
    val speedKmh: Double = 0.0,
    val speedMph: Double = 0.0,
    val latitude: Double? = null,
    val longitude: Double? = null,
    val altitudeMeters: Double? = null,
    val bearingDegrees: Float? = null,
    val accuracyMeters: Float? = null,
    val isGpsLocked: Boolean = false,
    val lastUpdateTimestampMillis: Long = 0L,
    val isSignalStale: Boolean = true
) {
    fun getDisplaySpeed(unit: String): String {
        if (!isGpsLocked || isSignalStale) return "--"
        val speed = if (unit.equals("MPH", ignoreCase = true)) speedMph else speedKmh
        return speed.toInt().coerceAtLeast(0).toString()
    }
}
