package com.rydecam.app.ui.theme

import androidx.compose.material3.darkColorScheme
import androidx.compose.ui.graphics.Color

val RydeCamBlack = Color(0xFF0A0A0C)
val RydeCamSurface = Color(0xFF141419)
val RydeCamSurfaceElevated = Color(0xFF1F2028)
val RecRed = Color(0xFFFF2A2A)
val SpeedometerGreen = Color(0xFF00FF66)
val AccentAmber = Color(0xFFFFB800)
val HudCyan = Color(0xFF00E5FF)
val TextMuted = Color(0xFF8E8E93)

val RydeCamColorScheme = darkColorScheme(
    primary = RecRed,
    secondary = AccentAmber,
    tertiary = SpeedometerGreen,
    background = RydeCamBlack,
    surface = RydeCamSurface,
    onPrimary = Color.White,
    onSecondary = Color.Black,
    onBackground = Color.White,
    onSurface = Color.White
)
