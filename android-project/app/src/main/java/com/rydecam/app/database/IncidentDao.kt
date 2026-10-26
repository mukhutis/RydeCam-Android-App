package com.rydecam.app.database

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import kotlinx.coroutines.flow.Flow

@Dao
interface IncidentDao {

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertIncident(incident: IncidentEntity): Long

    @Update
    suspend fun updateIncident(incident: IncidentEntity)

    @Delete
    suspend fun deleteIncident(incident: IncidentEntity)

    @Query("SELECT * FROM incidents ORDER BY timestampMillis DESC")
    fun getAllIncidentsFlow(): Flow<List<IncidentEntity>>

    @Query("SELECT * FROM incidents WHERE id = :id")
    suspend fun getIncidentById(id: Long): IncidentEntity?

    @Query("SELECT * FROM incidents ORDER BY timestampMillis DESC LIMIT 1")
    suspend fun getLatestIncident(): IncidentEntity?
}
