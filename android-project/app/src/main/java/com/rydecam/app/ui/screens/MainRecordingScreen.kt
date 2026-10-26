package com.rydecam.app.ui.screens

import android.content.Intent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Emergency
import androidx.compose.material.icons.filled.Folder
import androidx.compose.material.icons.filled.Map
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.MicOff
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Security
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Stop
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.rydecam.app.RydeCamApplication
import com.rydecam.app.recording.DashcamRecordingService
import com.rydecam.app.ui.MainActivity
import com.rydecam.app.ui.theme.AccentAmber
import com.rydecam.app.ui.theme.RydeCamBlack
import com.rydecam.app.ui.theme.RydeCamSurface
import com.rydecam.app.ui.theme.HudCyan
import com.rydecam.app.ui.theme.RecRed
import com.rydecam.app.ui.theme.SpeedometerGreen
import com.rydecam.app.ui.theme.TextMuted

@Composable
fun MainRecordingScreen(
    activity: MainActivity,
    service: DashcamRecordingService?,
    onOpenSettings: () -> Unit,
    onOpenLibrary: () -> Unit,
    onOpenNavigationCompanion: () -> Unit
) {
    val app = RydeCamApplication.instance
    val prefs by app.preferencesRepository.userPreferencesFlow.collectAsState(initial = com.rydecam.app.settings.UserPreferences())
    val storageStats by app.storageQuotaManager.storageStats.collectAsState()

    val isRecording = service?.segmentedRecorder?.isRecording?.collectAsState()?.value ?: false
    val totalSec = service?.segmentedRecorder?.totalRecordingDurationSec?.collectAsState()?.value ?: 0L
    val telemetry = service?.gpsSpeedProvider?.telemetry?.collectAsState()?.value ?: com.rydecam.app.location.GpsTelemetry()
    val gForce = service?.incidentDetector?.currentGForce?.collectAsState()?.value ?: 1.0f

    var showStopConfirmation by remember { mutableStateOf(false) }

    val infiniteTransition = rememberInfiniteTransition(label = "rec_blink")
    val recAlpha by infiniteTransition.animateFloat(
        initialValue = 1f,
        targetValue = if (isRecording) 0.2f else 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 600),
            repeatMode = RepeatMode.Reverse
        ),
        label = "alpha"
    )

    Box(modifier = Modifier.fillMaxSize().background(RydeCamBlack)) {

        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.verticalGradient(
                        colors = listOf(Color(0xFF0F172A), Color(0xFF020617))
                    )
                ),
            contentAlignment = Alignment.Center
        ) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(
                    text = "RYDECAM ROAD FEED",
                    color = Color.White.copy(alpha = 0.2f),
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 2.sp
                )
                Text(
                    text = "CameraX 1080p continuous stream active",
                    color = Color.White.copy(alpha = 0.15f),
                    fontSize = 12.sp
                )
            }
        }

        // HUD TOP BAR
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .background(
                    Brush.verticalGradient(
                        colors = listOf(Color.Black.copy(alpha = 0.85f), Color.Transparent)
                    )
                )
                .padding(horizontal = 16.dp, vertical = 12.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(12.dp)
                            .alpha(if (isRecording) recAlpha else 0.4f)
                            .clip(CircleShape)
                            .background(if (isRecording) RecRed else TextMuted)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = if (isRecording) "REC" else "STANDBY",
                        color = if (isRecording) RecRed else TextMuted,
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp
                    )
                    Spacer(modifier = Modifier.width(12.dp))
                    val min = totalSec / 60
                    val sec = totalSec % 60
                    Text(
                        text = String.format("%02d:%02d", min, sec),
                        color = Color.White,
                        fontSize = 15.sp,
                        fontFamily = FontFamily.Monospace,
                        fontWeight = FontWeight.SemiBold
                    )
                }

                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(4.dp))
                            .background(Color.White.copy(alpha = 0.12f))
                            .padding(horizontal = 6.dp, vertical = 2.dp)
                    ) {
                        Text(
                            text = prefs.videoResolution,
                            color = HudCyan,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }

                    Spacer(modifier = Modifier.width(8.dp))

                    Icon(
                        imageVector = if (prefs.audioRecordingEnabled) Icons.Default.Mic else Icons.Default.MicOff,
                        contentDescription = "Microphone",
                        tint = if (prefs.audioRecordingEnabled) SpeedometerGreen else TextMuted,
                        modifier = Modifier.size(16.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                val usedGb = storageStats.usedBytes.toDouble() / (1024 * 1024 * 1024)
                val totalGb = storageStats.quotaBytes.toDouble() / (1024 * 1024 * 1024)
                val remainingMin = storageStats.estimatedRemainingSeconds / 60

                Text(
                    text = String.format("STORAGE: %.1f / %.0f GB (FIFO)", usedGb, totalGb),
                    color = TextMuted,
                    fontSize = 11.sp
                )
                Text(
                    text = "REMAINING: ~${remainingMin / 60}h ${remainingMin % 60}m",
                    color = TextMuted,
                    fontSize = 11.sp
                )
            }
            Spacer(modifier = Modifier.height(4.dp))
            LinearProgressIndicator(
                progress = storageStats.usagePercentage,
                modifier = Modifier.fillMaxWidth().height(4.dp).clip(RoundedCornerShape(2.dp)),
                color = if (storageStats.usagePercentage > 0.9f) AccentAmber else HudCyan,
                trackColor = Color.White.copy(alpha = 0.1f)
            )
        }

        // SPEEDOMETER HUD CENTER
        Box(
            modifier = Modifier
                .align(Alignment.Center)
                .padding(bottom = 40.dp)
        ) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Row(
                    verticalAlignment = Alignment.Bottom,
                    horizontalArrangement = Arrangement.Center
                ) {
                    Text(
                        text = telemetry.getDisplaySpeed(prefs.speedUnit),
                        color = SpeedometerGreen,
                        fontSize = 82.sp,
                        fontWeight = FontWeight.Bold,
                        fontFamily = FontFamily.Monospace,
                        letterSpacing = (-2).sp
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = telemetry.getDisplaySpeedUnit(prefs.speedUnit),
                        color = SpeedometerGreen.copy(alpha = 0.8f),
                        fontSize = 20.sp,
                        fontWeight = FontWeight.SemiBold,
                        modifier = Modifier.padding(bottom = 16.dp)
                    )
                }

                // Trip Distance Odometer
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.Center,
                    modifier = Modifier.padding(top = 2.dp, bottom = 6.dp)
                ) {
                    Text(
                        text = "TRIP: ${telemetry.getDisplayDistance(prefs.speedUnit)} ${telemetry.getDisplayDistanceUnit(prefs.speedUnit)}",
                        color = Color.White.copy(alpha = 0.85f),
                        fontSize = 13.sp,
                        fontFamily = FontFamily.Monospace,
                        fontWeight = FontWeight.SemiBold
                    )
                }

                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.Center
                ) {
                    Box(
                        modifier = Modifier
                            .size(8.dp)
                            .clip(CircleShape)
                            .background(if (telemetry.isGpsLocked && !telemetry.isSignalStale) SpeedometerGreen else RecRed)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = if (telemetry.isGpsLocked && !telemetry.isSignalStale) "GPS LOCKED" else "ACQUIRING GPS...",
                        color = Color.White.copy(alpha = 0.7f),
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Medium
                    )
                    Spacer(modifier = Modifier.width(16.dp))
                    Text(
                        text = String.format("G-FORCE: %.2f G", gForce),
                        color = if (gForce > 2.0f) AccentAmber else TextMuted,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.SemiBold
                    )
                }
            }
        }

        // BOTTOM CONTROL DOCK
        Column(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .fillMaxWidth()
                .background(
                    Brush.verticalGradient(
                        colors = listOf(Color.Transparent, Color.Black.copy(alpha = 0.92f))
                    )
                )
                .padding(horizontal = 16.dp, vertical = 20.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceEvenly,
                verticalAlignment = Alignment.CenterVertically
            ) {
                DockIconButton(
                    icon = Icons.Default.Map,
                    label = "NAV",
                    tint = HudCyan,
                    onClick = onOpenNavigationCompanion
                )

                DockIconButton(
                    icon = Icons.Default.Security,
                    label = "LOCK",
                    tint = AccentAmber,
                    isProminent = true,
                    onClick = {
                        service?.incidentDetector?.triggerManualLock()
                    }
                )

                Box(
                    modifier = Modifier
                        .size(72.dp)
                        .clip(CircleShape)
                        .background(if (isRecording) RecRed else Color(0xFF22C55E))
                        .clickable {
                            if (isRecording) {
                                showStopConfirmation = true
                            } else {
                                val intent = Intent(activity, DashcamRecordingService::class.java).apply {
                                    action = DashcamRecordingService.ACTION_START_RECORDING
                                    putExtra(DashcamRecordingService.EXTRA_IS_4K, prefs.videoResolution == "4K")
                                    putExtra(DashcamRecordingService.EXTRA_SEGMENT_MINUTES, prefs.segmentLengthMinutes)
                                    putExtra(DashcamRecordingService.EXTRA_AUDIO_ENABLED, prefs.audioRecordingEnabled)
                                }
                                activity.startService(intent)
                            }
                        },
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = if (isRecording) Icons.Default.Stop else Icons.Default.PlayArrow,
                        contentDescription = "Record",
                        tint = Color.White,
                        modifier = Modifier.size(36.dp)
                    )
                }

                DockIconButton(
                    icon = Icons.Default.Folder,
                    label = "CLIPS",
                    tint = Color.White,
                    onClick = onOpenLibrary
                )

                DockIconButton(
                    icon = Icons.Default.Settings,
                    label = "SETUP",
                    tint = TextMuted,
                    onClick = onOpenSettings
                )
            }
        }

        if (showStopConfirmation) {
            AlertDialog(
                onDismissRequest = { showStopConfirmation = false },
                title = { Text("Stop RydeCam Recording?") },
                text = { Text("Are you sure you want to stop continuous dashcam recording? Video footage will not be preserved while stopped.") },
                confirmButton = {
                    Button(
                        onClick = {
                            showStopConfirmation = false
                            val intent = Intent(activity, DashcamRecordingService::class.java).apply {
                                action = DashcamRecordingService.ACTION_STOP_RECORDING
                            }
                            activity.startService(intent)
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = RecRed)
                    ) {
                        Text("Stop Recording")
                    }
                },
                dismissButton = {
                    TextButton(onClick = { showStopConfirmation = false }) {
                        Text("Keep Recording")
                    }
                }
            )
        }
    }
}

@Composable
fun DockIconButton(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
    tint: Color,
    isProminent: Boolean = false,
    onClick: () -> Unit
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier.clickable(onClick = onClick)
    ) {
        Box(
            modifier = Modifier
                .size(48.dp)
                .clip(CircleShape)
                .background(if (isProminent) AccentAmber.copy(alpha = 0.2f) else RydeCamSurface)
                .border(
                    width = 1.dp,
                    color = if (isProminent) AccentAmber else Color.White.copy(alpha = 0.15f),
                    shape = CircleShape
                ),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = icon,
                contentDescription = label,
                tint = tint,
                modifier = Modifier.size(24.dp)
            )
        }
        Spacer(modifier = Modifier.height(4.dp))
        Text(
            text = label,
            color = tint,
            fontSize = 10.sp,
            fontWeight = FontWeight.Bold
        )
    }
}
