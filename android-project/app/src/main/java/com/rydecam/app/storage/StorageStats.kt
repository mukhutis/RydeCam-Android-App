package com.rydecam.app.storage

data class StorageStats(
    val quotaBytes: Long,
    val usedBytes: Long,
    val protectedBytes: Long,
    val unprotectedBytes: Long,
    val freeDeviceBytes: Long,
    val safetyMarginBytes: Long,
    val estimatedRemainingSeconds: Long,
    val isQuotaExhausted: Boolean,
    val isProtectedOverflow: Boolean
) {
    val usagePercentage: Float
        get() = if (quotaBytes > 0) (usedBytes.toFloat() / quotaBytes.toFloat()).coerceIn(0f, 1f) else 0f

    val protectedPercentage: Float
        get() = if (quotaBytes > 0) (protectedBytes.toFloat() / quotaBytes.toFloat()).coerceIn(0f, 1f) else 0f
}

sealed class StorageAlert {
    data class ApproachingQuota(val usedPercent: Int) : StorageAlert()
    object OldestSegmentPurged : StorageAlert()
    data class ProtectedStorageFull(val message: String) : StorageAlert()
    data class LowDeviceStorage(val freeMb: Long) : StorageAlert()
}
