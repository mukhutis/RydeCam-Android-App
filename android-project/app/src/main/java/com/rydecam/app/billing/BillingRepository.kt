package com.rydecam.app.billing

import android.app.Activity
import android.content.Context
import android.util.Log
import com.android.billingclient.api.AcknowledgePurchaseParams
import com.android.billingclient.api.BillingClient
import com.android.billingclient.api.BillingClientStateListener
import com.android.billingclient.api.BillingFlowParams
import com.android.billingclient.api.BillingResult
import com.android.billingclient.api.ProductDetails
import com.android.billingclient.api.Purchase
import com.android.billingclient.api.PurchasesUpdatedListener
import com.android.billingclient.api.QueryProductDetailsParams
import com.android.billingclient.api.QueryPurchasesParams
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class BillingRepository(
    private val context: Context,
    private val scope: CoroutineScope = CoroutineScope(Dispatchers.IO)
) : PurchasesUpdatedListener {

    private val tag = "RydeCamBilling"

    private val _entitlements = MutableStateFlow(PremiumEntitlements())
    val entitlements: StateFlow<PremiumEntitlements> = _entitlements.asStateFlow()

    private val _availableProducts = MutableStateFlow<List<ProductDetails>>(emptyList())
    val availableProducts: StateFlow<List<ProductDetails>> = _availableProducts.asStateFlow()

    private val billingClient: BillingClient = BillingClient.newBuilder(context)
        .setListener(this)
        .enablePendingPurchases()
        .build()

    fun startConnection() {
        _entitlements.value = _entitlements.value.copy(isVerifying = true)
        billingClient.startConnection(object : BillingClientStateListener {
            override fun onBillingSetupFinished(billingResult: BillingResult) {
                if (billingResult.responseCode == BillingClient.BillingResponseCode.OK) {
                    Log.d(tag, "Google Play Billing setup successful.")
                    queryAvailableProducts()
                    refreshEntitlements()
                } else {
                    Log.e(tag, "Billing setup failed with code: ${billingResult.responseCode}")
                    _entitlements.value = _entitlements.value.copy(
                        isVerifying = false,
                        errorMessage = "Billing connection failed (${billingResult.responseCode})"
                    )
                }
            }

            override fun onBillingServiceDisconnected() {
                Log.w(tag, "Billing service disconnected. Will reconnect on next query.")
            }
        })
    }

    fun queryAvailableProducts() {
        val productList = listOf(
            QueryProductDetailsParams.Product.newBuilder()
                .setProductId(BillingConstants.PRODUCT_PRO_ANNUAL)
                .setProductType(BillingClient.ProductType.SUBS)
                .build(),
            QueryProductDetailsParams.Product.newBuilder()
                .setProductId(BillingConstants.PRODUCT_PRO_MONTHLY)
                .setProductType(BillingClient.ProductType.SUBS)
                .build()
        )

        val params = QueryProductDetailsParams.newBuilder()
            .setProductList(productList)
            .build()

        billingClient.queryProductDetailsAsync(params) { billingResult, productDetailsList ->
            if (billingResult.responseCode == BillingClient.BillingResponseCode.OK) {
                _availableProducts.value = productDetailsList
                Log.d(tag, "Fetched ${productDetailsList.size} products from Google Play.")
            } else {
                Log.w(tag, "Failed to query product details: ${billingResult.debugMessage}")
            }
        }
    }

    fun refreshEntitlements() {
        scope.launch {
            if (!billingClient.isReady) {
                _entitlements.value = _entitlements.value.copy(isVerifying = false)
                return@launch
            }

            var hasActivePro = false
            var activeId: String? = null

            val subsParams = QueryPurchasesParams.newBuilder()
                .setProductType(BillingClient.ProductType.SUBS)
                .build()

            billingClient.queryPurchasesAsync(subsParams) { subsResult, subsPurchases ->
                if (subsResult.responseCode == BillingClient.BillingResponseCode.OK) {
                    for (purchase in subsPurchases) {
                        if (purchase.purchaseState == Purchase.PurchaseState.PURCHASED) {
                            if (purchase.products.contains(BillingConstants.PRODUCT_PRO_ANNUAL) ||
                                purchase.products.contains(BillingConstants.PRODUCT_PRO_MONTHLY)) {
                                hasActivePro = true
                                activeId = purchase.products.firstOrNull() ?: BillingConstants.PRODUCT_PRO_MONTHLY
                                handleAcknowledge(purchase)
                            }
                        }
                    }
                }

                _entitlements.value = PremiumEntitlements(
                    isProUnlocked = hasActivePro,
                    canUse64GbQuota = hasActivePro,
                    canUse4kResolution = hasActivePro,
                    canUseFrontCamera = hasActivePro,
                    activeSubscriptionId = activeId,
                    isVerifying = false,
                    errorMessage = null
                )
            }
        }
    }

    fun launchBillingFlow(activity: Activity, productDetails: ProductDetails) {
        val productDetailsParamsList = listOf(
            BillingFlowParams.ProductDetailsParams.newBuilder()
                .setProductDetails(productDetails)
                .apply {
                    productDetails.subscriptionOfferDetails?.firstOrNull()?.offerToken?.let { token ->
                        setOfferToken(token)
                    }
                }
                .build()
        )

        val flowParams = BillingFlowParams.newBuilder()
            .setProductDetailsParamsList(productDetailsParamsList)
            .build()

        billingClient.launchBillingFlow(activity, flowParams)
    }

    override fun onPurchasesUpdated(billingResult: BillingResult, purchases: MutableList<Purchase>?) {
        if (billingResult.responseCode == BillingClient.BillingResponseCode.OK && purchases != null) {
            for (purchase in purchases) {
                handleAcknowledge(purchase)
            }
            refreshEntitlements()
        } else if (billingResult.responseCode == BillingClient.BillingResponseCode.USER_CANCELED) {
            Log.d(tag, "Purchase flow cancelled by user.")
        } else {
            Log.e(tag, "Purchase error: ${billingResult.debugMessage}")
            _entitlements.value = _entitlements.value.copy(
                errorMessage = "Purchase could not be completed: ${billingResult.debugMessage}"
            )
        }
    }

    private fun handleAcknowledge(purchase: Purchase) {
        if (!purchase.isAcknowledged && purchase.purchaseState == Purchase.PurchaseState.PURCHASED) {
            val params = AcknowledgePurchaseParams.newBuilder()
                .setPurchaseToken(purchase.purchaseToken)
                .build()
            billingClient.acknowledgePurchase(params) { result ->
                Log.d(tag, "Purchase acknowledged: ${result.responseCode}")
            }
        }
    }

    fun setSandboxProUnlocked(unlocked: Boolean) {
        _entitlements.value = PremiumEntitlements(
            isProUnlocked = unlocked,
            canUse64GbQuota = unlocked,
            canUse4kResolution = unlocked,
            canUseFrontCamera = unlocked,
            activeSubscriptionId = if (unlocked) "RYDECAM_SANDBOX_LIFETIME" else null,
            isVerifying = false
        )
    }
}
