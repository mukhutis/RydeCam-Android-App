package com.rydecam.app.database

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "recordings")
data class RecordingEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val filePath: String,
    val fileName: String,
    val fileSizeBytes: Long,
    val startTimeMillis: Long,
    val endTimeMillis: Long = 0,
    val durationSeconds: Int = 0,
    val resolution: String = "1080p", // 1080p or 4K
    val cameraLens: String = "BACK",   // BACK or FRONT
    val isProtected: Boolean = false,  // Protected files are NEVER removed by FIFO
    val incidentId: Long? = null,      // Linked incident if preserved
    val averageSpeedKmh: Double? = null,
    val maxSpeedKmh: Double? = null,
    val startLatitude: Double? = null,
    val startLongitude: Double? = null,
    val hasAudio: Boolean = false
)
