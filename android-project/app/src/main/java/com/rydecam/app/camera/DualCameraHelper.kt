package com.rydecam.app.camera

import android.content.Context
import android.content.pm.PackageManager
import android.hardware.camera2.CameraCharacteristics
import android.hardware.camera2.CameraManager
import android.os.Build
import android.util.Log

object DualCameraHelper {
    private const val TAG = "DualCameraHelper"

    fun checkCapabilities(context: Context): CameraHardwareCapabilities {
        val cameraManager = context.getSystemService(Context.CAMERA_SERVICE) as CameraManager
        var supportsConcurrent = false
        var supports4kRear = false
        val hasFront = context.packageManager.hasSystemFeature(PackageManager.FEATURE_CAMERA_FRONT)

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            try {
                val concurrentSet = cameraManager.concurrentCameraIds
                supportsConcurrent = concurrentSet.isNotEmpty()
                Log.d(TAG, "Concurrent camera combinations found: ${concurrentSet.size}")
            } catch (e: Exception) {
                Log.w(TAG, "Error querying concurrent camera combinations", e)
            }
        }

        try {
            for (id in cameraManager.cameraIdList) {
                val chars = cameraManager.getCameraCharacteristics(id)
                val facing = chars.get(CameraCharacteristics.LENS_FACING)
                if (facing == CameraCharacteristics.LENS_FACING_BACK) {
                    val map = chars.get(CameraCharacteristics.SCALER_STREAM_CONFIGURATION_MAP)
                    val outputSizes = map?.getOutputSizes(android.media.MediaRecorder::class.java)
                    if (outputSizes != null) {
                        for (size in outputSizes) {
                            if (size.width >= 3840 && size.height >= 2160) {
                                supports4kRear = true
                                break
                            }
                        }
                    }
                }
            }
        } catch (e: Exception) {
            Log.w(TAG, "Error querying 4K camera capabilities", e)
        }

        return CameraHardwareCapabilities(
            supports4K = supports4kRear,
            supportsConcurrentDualCamera = supportsConcurrent,
            hasFrontCamera = hasFront,
            maxFps = 30
        )
    }
}
