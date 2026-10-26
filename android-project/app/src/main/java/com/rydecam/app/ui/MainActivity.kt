package com.rydecam.app.ui

import android.Manifest
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.ServiceConnection
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.os.IBinder
import android.view.WindowManager
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.core.content.ContextCompat
import com.rydecam.app.RydeCamApplication
import com.rydecam.app.recording.DashcamRecordingService
import com.rydecam.app.ui.dialogs.PaywallDialog
import com.rydecam.app.ui.dialogs.SplitScreenGuideDialog
import com.rydecam.app.ui.screens.LibraryScreen
import com.rydecam.app.ui.screens.MainRecordingScreen
import com.rydecam.app.ui.screens.SettingsScreen
import com.rydecam.app.ui.theme.RydeCamTheme

class MainActivity : ComponentActivity() {

    private var recordingService: DashcamRecordingService? = null
    private var isBound = false

    private val serviceConnection = object : ServiceConnection {
        override fun onServiceConnected(name: ComponentName?, service: IBinder?) {
            val binder = service as DashcamRecordingService.LocalBinder
            recordingService = binder.getService()
            isBound = true
        }

        override fun onServiceDisconnected(name: ComponentName?) {
            recordingService = null
            isBound = false
        }
    }

    private val permissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        val cameraGranted = permissions[Manifest.permission.CAMERA] ?: false
        val locationGranted = permissions[Manifest.permission.ACCESS_FINE_LOCATION] ?: false
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        requestRequiredPermissions()

        val intent = Intent(this, DashcamRecordingService::class.java)
        bindService(intent, serviceConnection, Context.BIND_AUTO_CREATE)

        setContent {
            RydeCamTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    AppNavigation(activity = this, recordingService = recordingService)
                }
            }
        }
    }

    private fun requestRequiredPermissions() {
        val permissions = mutableListOf(
            Manifest.permission.CAMERA,
            Manifest.permission.RECORD_AUDIO,
            Manifest.permission.ACCESS_FINE_LOCATION,
            Manifest.permission.ACCESS_COARSE_LOCATION
        )
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            permissions.add(Manifest.permission.POST_NOTIFICATIONS)
        }
        permissionLauncher.launch(permissions.toTypedArray())
    }

    override fun onDestroy() {
        super.onDestroy()
        if (isBound) {
            unbindService(serviceConnection)
            isBound = false
        }
    }
}

enum class Screen {
    MAIN,
    SETTINGS,
    LIBRARY
}

@Composable
fun AppNavigation(activity: MainActivity, recordingService: DashcamRecordingService?) {
    var currentScreen by remember { mutableStateOf(Screen.MAIN) }
    var showPaywall by remember { mutableStateOf(false) }
    var showSplitScreenGuide by remember { mutableStateOf(false) }

    when (currentScreen) {
        Screen.MAIN -> MainRecordingScreen(
            activity = activity,
            service = recordingService,
            onOpenSettings = { currentScreen = Screen.SETTINGS },
            onOpenLibrary = { currentScreen = Screen.LIBRARY },
            onOpenNavigationCompanion = { showSplitScreenGuide = true }
        )
        Screen.SETTINGS -> SettingsScreen(
            onNavigateBack = { currentScreen = Screen.MAIN },
            onTriggerPaywall = { showPaywall = true }
        )
        Screen.LIBRARY -> LibraryScreen(
            onNavigateBack = { currentScreen = Screen.MAIN }
        )
    }

    if (showPaywall) {
        PaywallDialog(
            activity = activity,
            onDismiss = { showPaywall = false }
        )
    }

    if (showSplitScreenGuide) {
        SplitScreenGuideDialog(
            context = activity,
            onDismiss = { showSplitScreenGuide = false }
        )
    }
}
