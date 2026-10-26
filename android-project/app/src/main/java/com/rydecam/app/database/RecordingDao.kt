package com.rydecam.app.database

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import kotlinx.coroutines.flow.Flow

@Dao
interface RecordingDao {

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertRecording(recording: RecordingEntity): Long

    @Update
    suspend fun updateRecording(recording: RecordingEntity)

    @Delete
    suspend fun deleteRecording(recording: RecordingEntity)

    @Query("SELECT * FROM recordings ORDER BY startTimeMillis DESC")
    fun getAllRecordingsFlow(): Flow<List<RecordingEntity>>

    @Query("SELECT * FROM recordings WHERE isProtected = 0 ORDER BY startTimeMillis DESC")
    fun getNormalRecordingsFlow(): Flow<List<RecordingEntity>>

    @Query("SELECT * FROM recordings WHERE isProtected = 1 ORDER BY startTimeMillis DESC")
    fun getProtectedRecordingsFlow(): Flow<List<RecordingEntity>>

    @Query("SELECT * FROM recordings WHERE id = :id")
    suspend fun getRecordingById(id: Long): RecordingEntity?

    @Query("SELECT * FROM recordings WHERE filePath = :filePath LIMIT 1")
    suspend fun getRecordingByPath(filePath: String): RecordingEntity?

    @Query("SELECT * FROM recordings WHERE isProtected = 0 ORDER BY startTimeMillis ASC LIMIT :limit")
    suspend fun getOldestUnprotectedRecordings(limit: Int): List<RecordingEntity>

    @Query("SELECT COALESCE(SUM(fileSizeBytes), 0) FROM recordings")
    fun getTotalStorageUsedBytesFlow(): Flow<Long>

    @Query("SELECT COALESCE(SUM(fileSizeBytes), 0) FROM recordings")
    suspend fun getTotalStorageUsedBytes(): Long

    @Query("SELECT COALESCE(SUM(fileSizeBytes), 0) FROM recordings WHERE isProtected = 1")
    fun getProtectedStorageUsedBytesFlow(): Flow<Long>

    @Query("SELECT * FROM recordings WHERE endTimeMillis >= :windowStartMillis AND startTimeMillis <= :windowEndMillis")
    suspend fun getRecordingsInTimeWindow(windowStartMillis: Long, windowEndMillis: Long): List<RecordingEntity>

    @Query("UPDATE recordings SET isProtected = 1, incidentId = :incidentId WHERE id IN (:recordingIds)")
    suspend fun protectRecordings(recordingIds: List<Long>, incidentId: Long)

    @Query("UPDATE recordings SET isProtected = :isProtected WHERE id = :recordingId")
    suspend fun updateProtectionStatus(recordingId: Long, isProtected: Boolean)

    @Query("DELETE FROM recordings WHERE filePath = :filePath")
    suspend fun deleteByFilePath(filePath: String)

    @Query("SELECT * FROM recordings")
    suspend fun getAllRecordingsList(): List<RecordingEntity>
}
