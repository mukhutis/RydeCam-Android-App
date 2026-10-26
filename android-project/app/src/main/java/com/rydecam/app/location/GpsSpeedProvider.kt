package com.rydecam.app.location

import android.annotation.SuppressLint
import android.content.Context
import android.location.Location
import android.os.Looper
import android.util.Log
import com.google.android.gms.location.FusedLocationProviderClient
import com.google.android.gms.location.LocationCallback
import com.google.android.gms.location.LocationRequest
import com.google.android.gms.location.LocationResult
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch

class GpsSpeedProvider(
    private val context: Context,
    private val scope: CoroutineScope = CoroutineScope(Dispatchers.Default)
) {
    private val tag = "RydeCamGpsSpeed"
    private val fusedClient: FusedLocationProviderClient = LocationServices.getFusedLocationProviderClient(context)

    private val _telemetry = MutableStateFlow(GpsTelemetry())
    val telemetry: StateFlow<GpsTelemetry> = _telemetry.asStateFlow()

    private var isTracking = false
    private val maxAcceptableAccuracyMeters = 35.0f
    private val stalenessThresholdMillis = 4000L

    private val locationCallback = object : LocationCallback() {
        override fun onLocationResult(result: LocationResult) {
            result.lastLocation?.let { location ->
                processLocationUpdate(location)
            }
        }
    }

    init {
        scope.launch {
            while (isActive) {
                delay(1000)
                val current = _telemetry.value
                val now = System.currentTimeMillis()
                if (current.isGpsLocked && (now - current.lastUpdateTimestampMillis) > stalenessThresholdMillis) {
                    _telemetry.value = current.copy(isSignalStale = true)
                }
            }
        }
    }

    @SuppressLint("MissingPermission")
    fun startTracking() {
        if (isTracking) return
        isTracking = true

        val request = LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, 1000L)
            .setMinUpdateIntervalMillis(500L)
            .setMinUpdateDistanceMeters(0f)
            .build()

        try {
            fusedClient.requestLocationUpdates(request, locationCallback, Looper.getMainLooper())
            Log.d(tag, "GPS High Accuracy updates requested.")
        } catch (e: SecurityException) {
            Log.e(tag, "Location permission missing", e)
        }
    }

    fun stopTracking() {
        if (!isTracking) return
        isTracking = false
        fusedClient.removeLocationUpdates(locationCallback)
        _telemetry.value = GpsTelemetry()
        Log.d(tag, "GPS updates stopped.")
    }

    private fun processLocationUpdate(location: Location) {
        val now = System.currentTimeMillis()
        val accuracy = location.accuracy

        if (accuracy > maxAcceptableAccuracyMeters) {
            Log.w(tag, "GPS reading discarded due to poor accuracy: $accuracy meters")
            return
        }

        val speedMps = if (location.hasSpeed()) location.speed.toDouble() else 0.0
        val speedKmh = (speedMps * 3.6).coerceAtLeast(0.0)
        val speedMph = (speedKmh * 0.621371).coerceAtLeast(0.0)

        _telemetry.value = GpsTelemetry(
            speedKmh = speedKmh,
            speedMph = speedMph,
            latitude = location.latitude,
            longitude = location.longitude,
            altitudeMeters = if (location.hasAltitude()) location.altitude else null,
            bearingDegrees = if (location.hasBearing()) location.bearing else null,
            accuracyMeters = accuracy,
            isGpsLocked = true,
            lastUpdateTimestampMillis = now,
            isSignalStale = false
        )
    }
}
