package com.rydecam.app.database

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase

@Database(
    entities = [
        RecordingEntity::class,
        IncidentEntity::class
    ],
    version = 1,
    exportSchema = false
)
abstract class DashcamDatabase : RoomDatabase() {

    abstract fun recordingDao(): RecordingDao
    abstract fun incidentDao(): IncidentDao

    companion object {
        @Volatile
        private var INSTANCE: DashcamDatabase? = null

        fun getInstance(context: Context): DashcamDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    DashcamDatabase::class.java,
                    "rydecam_dashcam.db"
                )
                    .fallbackToDestructiveMigration()
                    .build()
                INSTANCE = instance
                instance
            }
        }
    }
}
