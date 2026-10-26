package com.rydecam.app.database

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "incidents")
data class IncidentEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val timestampMillis: Long,
    val triggerType: String, // "G_SENSOR", "MANUAL", "HARD_BRAKE"
    val peakGForce: Double,
    val speedAtImpactKmh: Double? = null,
    val latitude: Double? = null,
    val longitude: Double? = null,
    val preEventSeconds: Int = 60,
    val postEventSeconds: Int = 30,
    val isLocked: Boolean = true,
    val notes: String? = null
)
