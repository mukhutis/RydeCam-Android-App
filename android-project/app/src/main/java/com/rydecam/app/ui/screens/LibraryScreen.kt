package com.rydecam.app.ui.screens

import android.content.Intent
import android.net.Uri
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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.LockOpen
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CenterAlignedTopAppBar
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.TabRowDefaults
import androidx.compose.material3.TabRowDefaults.tabIndicatorOffset
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.FileProvider
import com.rydecam.app.RydeCamApplication
import com.rydecam.app.database.RecordingEntity
import com.rydecam.app.ui.theme.AccentAmber
import com.rydecam.app.ui.theme.RydeCamBlack
import com.rydecam.app.ui.theme.RydeCamSurface
import com.rydecam.app.ui.theme.HudCyan
import com.rydecam.app.ui.theme.RecRed
import com.rydecam.app.ui.theme.SpeedometerGreen
import com.rydecam.app.ui.theme.TextMuted
import kotlinx.coroutines.launch
import java.io.File
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LibraryScreen(onNavigateBack: () -> Unit) {
    val app = RydeCamApplication.instance
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    var selectedTabIndex by remember { mutableIntStateOf(0) }
    val normalRecordings by app.database.recordingDao().getNormalRecordingsFlow().collectAsState(initial = emptyList())
    val protectedRecordings by app.database.recordingDao().getProtectedRecordingsFlow().collectAsState(initial = emptyList())

    var deleteCandidate by remember { mutableStateOf<RecordingEntity?>(null) }

    Scaffold(
        topBar = {
            CenterAlignedTopAppBar(
                title = { Text("RYDECAM ARCHIVE", fontSize = 16.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp) },
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
        ) {
            TabRow(
                selectedTabIndex = selectedTabIndex,
                containerColor = RydeCamBlack,
                contentColor = Color.White,
                indicator = { tabPositions ->
                    TabRowDefaults.SecondaryIndicator(
                        Modifier.tabIndicatorOffset(tabPositions[selectedTabIndex]),
                        color = if (selectedTabIndex == 1) AccentAmber else HudCyan
                    )
                }
            ) {
                Tab(
                    selected = selectedTabIndex == 0,
                    onClick = { selectedTabIndex = 0 },
                    text = { Text("Normal (${normalRecordings.size})") }
                )
                Tab(
                    selected = selectedTabIndex == 1,
                    onClick = { selectedTabIndex = 1 },
                    text = {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(imageVector = Icons.Default.Lock, contentDescription = null, tint = AccentAmber, modifier = Modifier.size(14.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("Incidents (${protectedRecordings.size})", color = AccentAmber)
                        }
                    }
                )
            }

            val list = if (selectedTabIndex == 0) normalRecordings else protectedRecordings

            if (list.isEmpty()) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(
                            text = if (selectedTabIndex == 0) "No normal recordings found." else "No protected incident clips.",
                            color = TextMuted,
                            fontSize = 14.sp
                        )
                        Text(
                            text = if (selectedTabIndex == 0) "Recordings will appear as driving begins." else "Impacts and locked clips are stored here safely.",
                            color = TextMuted.copy(alpha = 0.6f),
                            fontSize = 12.sp
                        )
                    }
                }
            } else {
                LazyColumn(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    items(list, key = { it.id }) { recording ->
                        RecordingCard(
                            recording = recording,
                            onToggleProtection = {
                                scope.launch {
                                    app.database.recordingDao().updateProtectionStatus(recording.id, !recording.isProtected)
                                    app.storageQuotaManager.refreshStats()
                                }
                            },
                            onDelete = {
                                deleteCandidate = recording
                            },
                            onShare = {
                                val file = File(recording.filePath)
                                if (file.exists()) {
                                    try {
                                        val uri = FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", file)
                                        val shareIntent = Intent(Intent.ACTION_SEND).apply {
                                            type = "video/mp4"
                                            putExtra(Intent.EXTRA_STREAM, uri)
                                            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                                        }
                                        context.startActivity(Intent.createChooser(shareIntent, "Share Dashcam Clip"))
                                    } catch (e: Exception) {
                                    }
                                }
                            }
                        )
                    }
                }
            }
        }

        deleteCandidate?.let { recording ->
            AlertDialog(
                onDismissRequest = { deleteCandidate = null },
                title = { Text(if (recording.isProtected) "Delete Protected Incident Clip?" else "Delete Recording?") },
                text = {
                    Text(
                        if (recording.isProtected)
                            "WARNING: This clip was locked due to G-sensor impact detection or manual driver lock. Are you sure you want to permanently delete this footage?"
                        else
                            "Permanently delete this recording file from device storage?"
                    )
                },
                confirmButton = {
                    Button(
                        onClick = {
                            scope.launch {
                                app.storageQuotaManager.deleteRecordingFileAndRecord(recording)
                                app.storageQuotaManager.refreshStats()
                                deleteCandidate = null
                            }
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = RecRed)
                    ) {
                        Text("Delete File")
                    }
                },
                dismissButton = {
                    TextButton(onClick = { deleteCandidate = null }) {
                        Text("Cancel")
                    }
                }
            )
        }
    }
}

@Composable
fun RecordingCard(
    recording: RecordingEntity,
    onToggleProtection: () -> Unit,
    onDelete: () -> Unit,
    onShare: () -> Unit
) {
    val dateFormat = remember { SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.US) }
    val dateStr = remember(recording.startTimeMillis) { dateFormat.format(Date(recording.startTimeMillis)) }
    val sizeMb = recording.fileSizeBytes.toDouble() / (1024 * 1024)

    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = RydeCamSurface),
        shape = RoundedCornerShape(10.dp)
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    if (recording.isProtected) {
                        Icon(imageVector = Icons.Default.Lock, contentDescription = "Protected", tint = AccentAmber, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                    }
                    Text(
                        text = recording.fileName,
                        color = Color.White,
                        fontWeight = FontWeight.Bold,
                        fontSize = 13.sp,
                        fontFamily = FontFamily.Monospace
                    )
                }

                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(4.dp))
                        .background(if (recording.resolution == "4K") AccentAmber.copy(alpha = 0.2f) else HudCyan.copy(alpha = 0.2f))
                        .padding(horizontal = 6.dp, vertical = 2.dp)
                ) {
                    Text(
                        text = recording.resolution,
                        color = if (recording.resolution == "4K") AccentAmber else HudCyan,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(text = dateStr, color = TextMuted, fontSize = 12.sp)
                Text(
                    text = String.format("%d sec • %.1f MB", recording.durationSeconds, sizeMb),
                    color = TextMuted,
                    fontSize = 12.sp
                )
            }

            if (recording.maxSpeedKmh != null && recording.maxSpeedKmh > 0) {
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = String.format("Speed: %.0f km/h avg (Peak: %.0f km/h)", recording.averageSpeedKmh ?: 0.0, recording.maxSpeedKmh),
                    color = SpeedometerGreen,
                    fontSize = 11.sp
                )
            }

            Spacer(modifier = Modifier.height(12.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.End,
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconButton(onClick = onToggleProtection) {
                    Icon(
                        imageVector = if (recording.isProtected) Icons.Default.LockOpen else Icons.Default.Lock,
                        contentDescription = "Toggle Lock",
                        tint = if (recording.isProtected) AccentAmber else TextMuted
                    )
                }
                IconButton(onClick = onShare) {
                    Icon(imageVector = Icons.Default.Share, contentDescription = "Share", tint = HudCyan)
                }
                IconButton(onClick = onDelete) {
                    Icon(imageVector = Icons.Default.Delete, contentDescription = "Delete", tint = RecRed)
                }
            }
        }
    }
}
