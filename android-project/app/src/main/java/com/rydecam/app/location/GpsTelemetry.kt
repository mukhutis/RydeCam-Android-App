package com.rydecam.app.location

data class GpsTelemetry(
    val speedKmh: Double = 0.0,
    val speedMph: Double = 0.0,
    val tripDistanceKm: Double = 0.0,
    val tripDistanceMiles: Double = 0.0,
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
        val speed = if (unit.equals("MPH", ignoreCase = true) || unit.equals("M/HR", ignoreCase = true)) speedMph else speedKmh
        return speed.toInt().coerceAtLeast(0).toString()
    }

    fun getDisplaySpeedUnit(unit: String): String {
        return if (unit.equals("MPH", ignoreCase = true) || unit.equals("M/HR", ignoreCase = true)) "m/hr" else "km/hr"
    }

    fun getDisplayDistance(unit: String): String {
        val dist = if (unit.equals("MPH", ignoreCase = true) || unit.equals("M/HR", ignoreCase = true)) tripDistanceMiles else tripDistanceKm
        return String.format(java.util.Locale.US, "%.1f", dist)
    }

    fun getDisplayDistanceUnit(unit: String): String {
        return if (unit.equals("MPH", ignoreCase = true) || unit.equals("M/HR", ignoreCase = true)) "mi" else "km"
    }
}
