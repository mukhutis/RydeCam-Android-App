package com.rydecam.app.navigation

import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.util.Log

data class NavigationAppInfo(
    val packageName: String,
    val appName: String,
    val isInstalled: Boolean,
    val iconRes: Int? = null
)

class NavigationCompanionManager(private val context: Context) {
    private val tag = "RydeCamNavCompanion"

    private val supportedNavigationApps = listOf(
        Pair("com.google.android.apps.maps", "Google Maps"),
        Pair("com.waze", "Waze Navigation & Live Traffic"),
        Pair("com.here.app.maps", "HERE WeGo"),
        Pair("net.osmand", "OsmAnd Navigation"),
        Pair("com.mapfactor.navigator", "MapFactor Navigator")
    )

    fun getInstalledNavigationApps(): List<NavigationAppInfo> {
        val pm = context.packageManager
        val list = mutableListOf<NavigationAppInfo>()

        for ((pkg, name) in supportedNavigationApps) {
            val isInstalled = try {
                pm.getPackageInfo(pkg, 0)
                true
            } catch (e: PackageManager.NameNotFoundException) {
                false
            }

            list.add(
                NavigationAppInfo(
                    packageName = pkg,
                    appName = name,
                    isInstalled = isInstalled
                )
            )
        }
        return list
    }

    fun launchCompanionApp(targetPackage: String, destinationQuery: String? = null): Boolean {
        val pm = context.packageManager
        val launchIntent = pm.getLaunchIntentForPackage(targetPackage)

        if (launchIntent != null) {
            launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                launchIntent.addFlags(Intent.FLAG_ACTIVITY_LAUNCH_ADJACENT)
            }

            if (!destinationQuery.isNullOrBlank() && targetPackage == "com.google.android.apps.maps") {
                val gmmIntentUri = Uri.parse("google.navigation:q=" + Uri.encode(destinationQuery))
                val mapIntent = Intent(Intent.ACTION_VIEW, gmmIntentUri).apply {
                    setPackage("com.google.android.apps.maps")
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                        addFlags(Intent.FLAG_ACTIVITY_LAUNCH_ADJACENT)
                    }
                }
                context.startActivity(mapIntent)
            } else {
                context.startActivity(launchIntent)
            }
            Log.d(tag, "Companion navigation app launched: $targetPackage")
            return true
        }

        return try {
            val webIntent = Intent(
                Intent.ACTION_VIEW,
                Uri.parse("https://www.google.com/maps")
            ).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(webIntent)
            true
        } catch (e: Exception) {
            Log.e(tag, "Failed to launch navigation", e)
            false
        }
    }
}
