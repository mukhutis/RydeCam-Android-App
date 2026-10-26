package com.rydecam.app.ui.screens

import androidx.compose.foundation.background
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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CenterAlignedTopAppBar
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.rydecam.app.RydeCamApplication
import com.rydecam.app.ui.theme.AccentAmber
import com.rydecam.app.ui.theme.RydeCamBlack
import com.rydecam.app.ui.theme.RydeCamSurface
import com.rydecam.app.ui.theme.RydeCamSurfaceElevated
import com.rydecam.app.ui.theme.HudCyan
import com.rydecam.app.ui.theme.RecRed
import com.rydecam.app.ui.theme.SpeedometerGreen
import com.rydecam.app.ui.theme.TextMuted
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(
    onNavigateBack: () -> Unit,
    onTriggerPaywall: () -> Unit
) {
    val app = RydeCamApplication.instance
    val prefs by app.preferencesRepository.userPreferencesFlow.collectAsState(initial = com.rydecam.app.settings.UserPreferences())
    val entitlements by app.billingRepository.entitlements.collectAsState()
    val scope = rememberCoroutineScope()

    Scaffold(
        topBar = {
            CenterAlignedTopAppBar(
                title = { Text("RYDECAM CONFIGURATION", fontSize = 16.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp) },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(imageVector = Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back", tint = Color.White)
                    }
                },
                colors = TopAppBarDefaults.centerAlignedTopAppBarColors(
                    containerColor = RydeCamBlack,
                    titleContentColor = Color.White
                )
            )
        },
        containerColor = RydeCamBlack
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .verticalScroll(rememberScrollState())
                .padding(16.dp)
        ) {

            // PRO MEMBERSHIP BANNER
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { onTriggerPaywall() },
                colors = CardDefaults.cardColors(containerColor = if (entitlements.isProUnlocked) SpeedometerGreen.copy(alpha = 0.15f) else AccentAmber.copy(alpha = 0.15f)),
                shape = RoundedCornerShape(12.dp)
            ) {
                Row(
                    modifier = Modifier.padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Default.Star,
                        contentDescription = "Pro",
                        tint = if (entitlements.isProUnlocked) SpeedometerGreen else AccentAmber,
                        modifier = Modifier.size(28.dp)
                    )
                    Spacer(modifier = Modifier.width(12.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = if (entitlements.isProUnlocked) "RYDECAM PRO ACTIVE" else "UPGRADE TO RYDECAM PRO",
                            fontWeight = FontWeight.Bold,
                            color = Color.White,
                            fontSize = 15.sp
                        )
                        Text(
                            text = if (entitlements.isProUnlocked) "64 GB Quota, 4K UHD, and Dual-Camera unlocked" else "Unlock 64GB quota, 4K recording, and dual-camera streams",
                            color = TextMuted,
                            fontSize = 12.sp
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            // SECTION 1: STORAGE QUOTA & FIFO
            SectionHeader(title = "RECORDING STORAGE QUOTA (FIFO)")
            Text(
                text = "When quota limit is approached, RydeCam automatically purges the oldest unprotected clips first. Protected incidents are never deleted.",
                color = TextMuted,
                fontSize = 12.sp,
                modifier = Modifier.padding(bottom = 8.dp)
            )

            val quotas = listOf(8, 16, 32, 64)
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(8.dp))
                    .background(RydeCamSurface)
            ) {
                quotas.forEachIndexed { index, quota ->
                    val is64GbPro = quota == 64
                    val isSelected = prefs.storageQuotaGb == quota

                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable {
                                if (is64GbPro && !entitlements.isProUnlocked) {
                                    onTriggerPaywall()
                                } else {
                                    scope.launch { app.preferencesRepository.updateStorageQuota(quota) }
                                }
                            }
                            .padding(horizontal = 16.dp, vertical = 12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            RadioButton(
                                selected = isSelected,
                                onClick = null
                            )
                            Spacer(modifier = Modifier.width(12.dp))
                            Text(
                                text = "$quota GB",
                                color = Color.White,
                                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal
                            )
                            if (is64GbPro) {
                                Spacer(modifier = Modifier.width(8.dp))
                                ProBadge()
                            }
                        }
                        Text(
                            text = if (is64GbPro) "Extended Long-Haul" else "Standard",
                            color = TextMuted,
                            fontSize = 12.sp
                        )
                    }
                    if (index < quotas.size - 1) {
                        HorizontalDivider(color = Color.White.copy(alpha = 0.06f))
                    }
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            // SECTION 2: VIDEO QUALITY & DUAL CAMERA
            SectionHeader(title = "VIDEO RESOLUTION & CAMERAS")

            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(8.dp))
                    .background(RydeCamSurface)
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable {
                            scope.launch { app.preferencesRepository.updateVideoResolution("1080p") }
                        }
                        .padding(horizontal = 16.dp, vertical = 12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    RadioButton(
                        selected = prefs.videoResolution == "1080p",
                        onClick = null
                    )
                    Spacer(modifier = Modifier.width(12.dp))
                    Column {
                        Text("1080p Full HD (30 FPS)", color = Color.White)
                        Text("Recommended for low battery & sustained thermal balance", color = TextMuted, fontSize = 11.sp)
                    }
                }

                HorizontalDivider(color = Color.White.copy(alpha = 0.06f))

                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable {
                            if (!entitlements.isProUnlocked) {
                                onTriggerPaywall()
                            } else {
                                scope.launch { app.preferencesRepository.updateVideoResolution("4K") }
                            }
                        }
                        .padding(horizontal = 16.dp, vertical = 12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    RadioButton(
                        selected = prefs.videoResolution == "4K",
                        onClick = null
                    )
                    Spacer(modifier = Modifier.width(12.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text("4K Ultra HD", color = Color.White)
                            Spacer(modifier = Modifier.width(8.dp))
                            ProBadge()
                        }
                        Text("High-bitrate license plate clarity (device dependent)", color = TextMuted, fontSize = 11.sp)
                    }
                }

                HorizontalDivider(color = Color.White.copy(alpha = 0.06f))

                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text("Dual Cabin Recording", color = Color.White)
                            Spacer(modifier = Modifier.width(8.dp))
                            ProBadge()
                        }
                        Text("Simultaneous front selfie + road recording where supported", color = TextMuted, fontSize = 11.sp)
                    }
                    Switch(
                        checked = prefs.frontCameraEnabled,
                        onCheckedChange = { checked ->
                            if (!entitlements.isProUnlocked && checked) {
                                onTriggerPaywall()
                            } else {
                                scope.launch { app.preferencesRepository.updateFrontCameraEnabled(checked) }
                            }
                        },
                        colors = SwitchDefaults.colors(checkedThumbColor = HudCyan)
                    )
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            // SECTION 3: ACCIDENT DETECTION & SENSITIVITY
            SectionHeader(title = "G-SENSOR ACCIDENT & SHOCK PRESERVATION")
            Text(
                text = "Locks the preceding 60 seconds leading to an impact and records 30 seconds post-event to protected storage.",
                color = TextMuted,
                fontSize = 12.sp,
                modifier = Modifier.padding(bottom = 8.dp)
            )

            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(8.dp))
                    .background(RydeCamSurface)
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text("Enable Automatic Collision Detection", color = Color.White)
                    Switch(
                        checked = prefs.accidentDetectionEnabled,
                        onCheckedChange = { scope.launch { app.preferencesRepository.updateAccidentDetection(it) } },
                        colors = SwitchDefaults.colors(checkedThumbColor = SpeedometerGreen)
                    )
                }

                if (prefs.accidentDetectionEnabled) {
                    HorizontalDivider(color = Color.White.copy(alpha = 0.06f))

                    val sensitivities = listOf("LOW" to "3.5G (Severe impacts)", "MEDIUM" to "2.5G (Moderate collision)", "HIGH" to "1.8G (Firm bumps)")
                    sensitivities.forEach { (level, desc) ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable {
                                    scope.launch { app.preferencesRepository.updateAccidentSensitivity(level) }
                                }
                                .padding(horizontal = 16.dp, vertical = 10.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            RadioButton(
                                selected = prefs.accidentSensitivity == level,
                                onClick = null
                            )
                            Spacer(modifier = Modifier.width(12.dp))
                            Column {
                                Text(level, color = Color.White, fontWeight = FontWeight.SemiBold)
                                Text(desc, color = TextMuted, fontSize = 11.sp)
                            }
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            // SECTION 4: GPS & SPEED TELEMETRY
            SectionHeader(title = "SPEED UNITS & TELEMETRY")
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(8.dp))
                    .background(RydeCamSurface)
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text("Burn GPS Speed onto Video Clips", color = Color.White)
                    Switch(
                        checked = prefs.gpsOverlayEnabled,
                        onCheckedChange = { scope.launch { app.preferencesRepository.updateGpsOverlay(it) } },
                        colors = SwitchDefaults.colors(checkedThumbColor = HudCyan)
                    )
                }

                HorizontalDivider(color = Color.White.copy(alpha = 0.06f))

                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text("Speed & Distance Units", color = Color.White)
                    Row {
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(4.dp))
                                .background(if (prefs.speedUnit == "KMH") SpeedometerGreen else Color.White.copy(alpha = 0.1f))
                                .clickable { scope.launch { app.preferencesRepository.updateSpeedUnit("KMH") } }
                                .padding(horizontal = 12.dp, vertical = 6.dp)
                        ) {
                            Text("km/hr", color = if (prefs.speedUnit == "KMH") Color.Black else Color.White, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                        }
                        Spacer(modifier = Modifier.width(8.dp))
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(4.dp))
                                .background(if (prefs.speedUnit == "MPH") SpeedometerGreen else Color.White.copy(alpha = 0.1f))
                                .clickable { scope.launch { app.preferencesRepository.updateSpeedUnit("MPH") } }
                                .padding(horizontal = 12.dp, vertical = 6.dp)
                        ) {
                            Text("m/hr", color = if (prefs.speedUnit == "MPH") Color.Black else Color.White, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(32.dp))
        }
    }
}

@Composable
fun SectionHeader(title: String) {
    Text(
        text = title,
        color = HudCyan,
        fontSize = 12.sp,
        fontWeight = FontWeight.Bold,
        letterSpacing = 1.sp,
        modifier = Modifier.padding(bottom = 6.dp)
    )
}

@Composable
fun ProBadge() {
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(4.dp))
            .background(AccentAmber)
            .padding(horizontal = 6.dp, vertical = 2.dp)
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(imageVector = Icons.Default.Lock, contentDescription = null, tint = Color.Black, modifier = Modifier.size(10.dp))
            Spacer(modifier = Modifier.width(3.dp))
            Text("PRO", color = Color.Black, fontSize = 10.sp, fontWeight = FontWeight.Bold)
        }
    }
}
