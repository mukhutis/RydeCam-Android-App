package com.rydecam.app.ui.dialogs

import android.content.Context
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Map
import androidx.compose.material.icons.filled.OpenInNew
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.rydecam.app.navigation.NavigationCompanionManager
import com.rydecam.app.ui.theme.RydeCamSurface
import com.rydecam.app.ui.theme.RydeCamSurfaceElevated
import com.rydecam.app.ui.theme.HudCyan
import com.rydecam.app.ui.theme.SpeedometerGreen
import com.rydecam.app.ui.theme.TextMuted

@Composable
fun SplitScreenGuideDialog(
    context: Context,
    onDismiss: () -> Unit
) {
    val navManager = remember { NavigationCompanionManager(context) }
    val installedApps = remember { navManager.getInstalledNavigationApps() }

    Dialog(onDismissRequest = onDismiss) {
        Card(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 8.dp),
            colors = CardDefaults.cardColors(containerColor = RydeCamSurfaceElevated),
            shape = RoundedCornerShape(16.dp)
        ) {
            Column(modifier = Modifier.padding(20.dp)) {

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(imageVector = Icons.Default.Map, contentDescription = null, tint = HudCyan, modifier = Modifier.size(24.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("COMPANION NAVIGATION", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                    }
                    IconButton(onClick = onDismiss) {
                        Icon(imageVector = Icons.Default.Close, contentDescription = "Close", tint = TextMuted)
                    }
                }

                Spacer(modifier = Modifier.height(10.dp))

                Text(
                    text = "RydeCam continues recording uninterrupted in the background while you navigate.",
                    color = TextMuted,
                    fontSize = 12.sp
                )

                Spacer(modifier = Modifier.height(14.dp))

                Text(
                    text = "SELECT COMPANION NAVIGATION APP",
                    color = HudCyan,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 1.sp
                )
                Spacer(modifier = Modifier.height(6.dp))

                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(8.dp))
                        .background(RydeCamSurface)
                ) {
                    installedApps.forEachIndexed { index, appInfo ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable {
                                    navManager.launchCompanionApp(appInfo.packageName)
                                    onDismiss()
                                }
                                .padding(horizontal = 14.dp, vertical = 12.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Column {
                                Text(appInfo.appName, color = Color.White, fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                                Text(
                                    if (appInfo.isInstalled) "Installed • Ready to launch" else "Not installed (will open browser)",
                                    color = if (appInfo.isInstalled) SpeedometerGreen else TextMuted,
                                    fontSize = 11.sp
                                )
                            }
                            Icon(imageVector = Icons.Default.OpenInNew, contentDescription = "Launch", tint = HudCyan, modifier = Modifier.size(18.dp))
                        }
                        if (index < installedApps.size - 1) {
                            HorizontalDivider(color = Color.White.copy(alpha = 0.05f))
                        }
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                Text(
                    text = "HOW TO ENTER SPLIT-SCREEN MODE",
                    color = Color.White,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold
                )
                Spacer(modifier = Modifier.height(6.dp))
                Text(
                    text = "1. Launch your navigation app above.\n2. Swipe up and hold to open Recent Apps Overview.\n3. Tap the RydeCam app icon at the top.\n4. Select 'Split Screen' or 'Open in Split Screen view'.\n5. Select your Navigation app on the second half of the screen.",
                    color = TextMuted,
                    fontSize = 11.sp,
                    lineHeight = 16.sp
                )

                Spacer(modifier = Modifier.height(16.dp))

                Button(
                    onClick = onDismiss,
                    modifier = Modifier.fillMaxWidth().height(42.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = RydeCamSurface),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Text("Close", color = Color.White, fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}
