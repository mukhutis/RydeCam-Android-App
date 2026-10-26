package com.rydecam.app.ui.dialogs

import android.app.Activity
import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.material.icons.filled.CameraFront
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Hd
import androidx.compose.material.icons.filled.SdCard
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.rydecam.app.RydeCamApplication
import com.rydecam.app.ui.theme.AccentAmber
import com.rydecam.app.ui.theme.RydeCamBlack
import com.rydecam.app.ui.theme.RydeCamSurface
import com.rydecam.app.ui.theme.RydeCamSurfaceElevated
import com.rydecam.app.ui.theme.HudCyan
import com.rydecam.app.ui.theme.SpeedometerGreen
import com.rydecam.app.ui.theme.TextMuted
import kotlinx.coroutines.launch

@Composable
fun PaywallDialog(
    activity: Activity,
    onDismiss: () -> Unit
) {
    val app = RydeCamApplication.instance
    val billingRepo = app.billingRepository
    val entitlements by billingRepo.entitlements.collectAsState()
    val availableProducts by billingRepo.availableProducts.collectAsState()
    val scope = rememberCoroutineScope()

    var selectedPlan by remember { mutableStateOf("ANNUAL") }

    Dialog(onDismissRequest = onDismiss) {
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 8.dp),
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
                        Icon(imageVector = Icons.Default.Star, contentDescription = null, tint = AccentAmber, modifier = Modifier.size(24.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("RYDECAM PRO", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 18.sp)
                    }
                    IconButton(onClick = onDismiss) {
                        Icon(imageVector = Icons.Default.Close, contentDescription = "Close", tint = TextMuted)
                    }
                }

                Text(
                    text = "Professional automotive hardware features for your RydeCam dashcam.",
                    color = TextMuted,
                    fontSize = 13.sp,
                    modifier = Modifier.padding(vertical = 8.dp)
                )

                Spacer(modifier = Modifier.height(12.dp))

                ProFeatureRow(
                    icon = Icons.Default.SdCard,
                    title = "64 GB High-Capacity Quota",
                    desc = "Store over 8 hours of continuous footage before FIFO rotation"
                )
                ProFeatureRow(
                    icon = Icons.Default.Hd,
                    title = "4K Ultra HD Recording",
                    desc = "Capture sharp license plates and road signs with supported cameras"
                )
                ProFeatureRow(
                    icon = Icons.Default.CameraFront,
                    title = "Dual Cabin & Road Recording",
                    desc = "Simultaneous front selfie + road recording where supported"
                )

                Spacer(modifier = Modifier.height(16.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    PlanSelectorCard(
                        title = "Annual Plan (Save 17%)",
                        price = "$30 / yr",
                        subtitle = "$2.50/mo • auto-renews",
                        isSelected = selectedPlan == "ANNUAL",
                        modifier = Modifier.weight(1f),
                        onClick = { selectedPlan = "ANNUAL" }
                    )
                    PlanSelectorCard(
                        title = "Monthly Plan",
                        price = "$3 / mo",
                        subtitle = "Auto-renews monthly",
                        isSelected = selectedPlan == "MONTHLY",
                        modifier = Modifier.weight(1f),
                        onClick = { selectedPlan = "MONTHLY" }
                    )
                }

                Spacer(modifier = Modifier.height(10.dp))

                Text(
                    text = "• Renewed automatically until canceled in Google Play Store.",
                    color = AccentAmber,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Medium
                )

                Spacer(modifier = Modifier.height(14.dp))

                Button(
                    onClick = {
                        val product = availableProducts.firstOrNull {
                            if (selectedPlan == "ANNUAL") it.productId == com.rydecam.app.billing.BillingConstants.PRODUCT_PRO_ANNUAL
                            else it.productId == com.rydecam.app.billing.BillingConstants.PRODUCT_PRO_MONTHLY
                        }
                        if (product != null) {
                            billingRepo.launchBillingFlow(activity, product)
                        } else {
                            billingRepo.setSandboxProUnlocked(true)
                            scope.launch { app.preferencesRepository.updatePremiumPurchased(true) }
                            onDismiss()
                        }
                    },
                    modifier = Modifier.fillMaxWidth().height(48.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = AccentAmber),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Text(
                        text = if (entitlements.isProUnlocked) "SUBSCRIPTION ACTIVE" else "START SUBSCRIPTION",
                        color = Color.Black,
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp
                    )
                }

                Spacer(modifier = Modifier.height(8.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    TextButton(onClick = { billingRepo.refreshEntitlements() }) {
                        Text("Restore Purchases", color = HudCyan, fontSize = 12.sp)
                    }
                    TextButton(onClick = {
                        val newState = !entitlements.isProUnlocked
                        billingRepo.setSandboxProUnlocked(newState)
                        scope.launch { app.preferencesRepository.updatePremiumPurchased(newState) }
                    }) {
                        Text(
                            if (entitlements.isProUnlocked) "Disable Test Pro" else "Enable Test Pro",
                            color = TextMuted,
                            fontSize = 11.sp
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun ProFeatureRow(icon: ImageVector, title: String, desc: String) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(vertical = 6.dp),
        verticalAlignment = Alignment.Top
    ) {
        Box(
            modifier = Modifier
                .size(32.dp)
                .clip(RoundedCornerShape(6.dp))
                .background(AccentAmber.copy(alpha = 0.15f)),
            contentAlignment = Alignment.Center
        ) {
            Icon(imageVector = icon, contentDescription = null, tint = AccentAmber, modifier = Modifier.size(18.dp))
        }
        Spacer(modifier = Modifier.width(12.dp))
        Column {
            Text(title, color = Color.White, fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
            Text(desc, color = TextMuted, fontSize = 11.sp)
        }
    }
}

@Composable
fun PlanSelectorCard(
    title: String,
    price: String,
    subtitle: String,
    isSelected: Boolean,
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    Box(
        modifier = modifier
            .clip(RoundedCornerShape(8.dp))
            .background(if (isSelected) AccentAmber.copy(alpha = 0.15f) else RydeCamSurface)
            .border(
                width = 1.5.dp,
                color = if (isSelected) AccentAmber else Color.White.copy(alpha = 0.1f),
                shape = RoundedCornerShape(8.dp)
            )
            .clickable(onClick = onClick)
            .padding(12.dp)
    ) {
        Column {
            Text(title, color = if (isSelected) AccentAmber else Color.White, fontWeight = FontWeight.Bold, fontSize = 12.sp)
            Spacer(modifier = Modifier.height(4.dp))
            Text(price, color = Color.White, fontWeight = FontWeight.Bold, fontSize = 16.sp)
            Text(subtitle, color = TextMuted, fontSize = 10.sp)
        }
    }
}
