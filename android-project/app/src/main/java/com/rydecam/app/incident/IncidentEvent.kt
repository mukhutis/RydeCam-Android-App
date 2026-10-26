package com.rydecam.app.incident

data class IncidentEvent(
    val id: Long = 0,
    val timestampMillis: Long = System.currentTimeMillis(),
    val triggerSource: TriggerSource,
    val peakGForce: Double,
    val speedKmh: Double? = null,
    val latitude: Double? = null,
    val longitude: Double? = null,
    val preEventSeconds: Int = 60,
    val postEventSeconds: Int = 30
)

enum class TriggerSource {
    G_SENSOR,
    HARD_BRAKE,
    MANUAL_USER
}

enum class SensitivityLevel(val thresholdG: Float) {
    LOW(3.5f),      // Only major impacts
    MEDIUM(2.5f),   // Standard collision threshold
    HIGH(1.8f)      // More sensitive, firm road shocks
}

data class SensorReading(
    val timestampMillis: Long,
    val x: Float,
    val y: Float,
    val z: Float,
    val totalG: Float
)
