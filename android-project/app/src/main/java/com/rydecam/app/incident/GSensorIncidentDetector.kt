package com.rydecam.app.incident

import android.content.Context
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.util.Log
import com.rydecam.app.settings.UserPreferencesRepository
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlin.math.sqrt

class GSensorIncidentDetector(
    private val context: Context,
    private val preferencesRepository: UserPreferencesRepository,
    private val scope: CoroutineScope = CoroutineScope(Dispatchers.Default)
) : SensorEventListener {

    private val tag = "RydeCamGSensor"
    private val sensorManager = context.getSystemService(Context.SENSOR_SERVICE) as SensorManager
    private val accelerometer: Sensor? = sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)

    private val _currentGForce = MutableStateFlow(1.0f)
    val currentGForce: StateFlow<Float> = _currentGForce.asStateFlow()

    private val _incidentEvents = MutableSharedFlow<IncidentEvent>(replay = 0)
    val incidentEvents: SharedFlow<IncidentEvent> = _incidentEvents.asSharedFlow()

    private var gravityX = 0f
    private var gravityY = 0f
    private var gravityZ = 9.81f
    private val alpha = 0.8f

    private var lastTriggerTimestampMillis = 0L
    private val debounceCooldownMillis = 10_000L

    private var isMonitoring = false

    fun startMonitoring() {
        if (isMonitoring) return
        isMonitoring = true
        accelerometer?.let {
            sensorManager.registerListener(this, it, SensorManager.SENSOR_DELAY_GAME)
            Log.d(tag, "Accelerometer monitoring started.")
        }
    }

    fun stopMonitoring() {
        if (!isMonitoring) return
        isMonitoring = false
        sensorManager.unregisterListener(this)
        Log.d(tag, "Accelerometer monitoring stopped.")
    }

    override fun onSensorChanged(event: SensorEvent?) {
        if (event == null || event.sensor.type != Sensor.TYPE_ACCELEROMETER) return

        val rawX = event.values[0]
        val rawY = event.values[1]
        val rawZ = event.values[2]

        gravityX = alpha * gravityX + (1 - alpha) * rawX
        gravityY = alpha * gravityY + (1 - alpha) * rawY
        gravityZ = alpha * gravityZ + (1 - alpha) * rawZ

        val linearX = rawX - gravityX
        val linearY = rawY - gravityY
        val linearZ = rawZ - gravityZ

        val rawMagnitude = sqrt(rawX * rawX + rawY * rawY + rawZ * rawZ)
        val totalG = rawMagnitude / 9.80665f
        _currentGForce.value = totalG

        val linearMagnitudeG = sqrt(linearX * linearX + linearY * linearY + linearZ * linearZ) / 9.80665f

        scope.launch {
            checkShockThreshold(linearMagnitudeG, totalG)
        }
    }

    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {}

    private suspend fun checkShockThreshold(linearG: Float, totalG: Float) {
        val now = System.currentTimeMillis()
        if (now - lastTriggerTimestampMillis < debounceCooldownMillis) {
            return
        }

        val prefs = preferencesRepository.userPreferencesFlow.first()
        if (!prefs.accidentDetectionEnabled) return

        val thresholdG = when (prefs.accidentSensitivity.uppercase()) {
            "LOW" -> SensitivityLevel.LOW.thresholdG
            "HIGH" -> SensitivityLevel.HIGH.thresholdG
            "CUSTOM" -> prefs.customGThreshold
            else -> SensitivityLevel.MEDIUM.thresholdG
        }

        if (linearG >= thresholdG || totalG >= (thresholdG + 1.0f)) {
            lastTriggerTimestampMillis = now
            Log.w(tag, "IMPACT DETECTED! Linear G: $linearG, Total G: $totalG, Threshold: $thresholdG")

            val incident = IncidentEvent(
                timestampMillis = now,
                triggerSource = TriggerSource.G_SENSOR,
                peakGForce = linearG.toDouble(),
                preEventSeconds = 60,
                postEventSeconds = prefs.postEventSeconds
            )
            _incidentEvents.emit(incident)
        }
    }

    fun triggerManualLock() {
        val now = System.currentTimeMillis()
        scope.launch {
            val prefs = preferencesRepository.userPreferencesFlow.first()
            val incident = IncidentEvent(
                timestampMillis = now,
                triggerSource = TriggerSource.MANUAL_USER,
                peakGForce = _currentGForce.value.toDouble(),
                preEventSeconds = 60,
                postEventSeconds = prefs.postEventSeconds
            )
            _incidentEvents.emit(incident)
        }
    }
}
