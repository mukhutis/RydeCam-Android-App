package com.rydecam.app.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.runtime.Composable

@Composable
fun RydeCamTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = RydeCamColorScheme,
        typography = Typography(),
        content = content
    )
}
