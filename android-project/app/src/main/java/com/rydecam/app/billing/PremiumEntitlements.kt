package com.rydecam.app.billing

data class PremiumEntitlements(
    val isProUnlocked: Boolean = false,
    val canUse64GbQuota: Boolean = false,
    val canUse4kResolution: Boolean = false,
    val canUseFrontCamera: Boolean = false,
    val activeSubscriptionId: String? = null,
    val isVerifying: Boolean = false,
    val errorMessage: String? = null
)

object BillingConstants {
    // Both products are auto-renewing subscriptions
    const val PRODUCT_PRO_MONTHLY = "rydecam_pro_monthly" // $3 / mo auto-renewing
    const val PRODUCT_PRO_ANNUAL = "rydecam_pro_annual"   // $30 / yr auto-renewing (save 17%)
}
