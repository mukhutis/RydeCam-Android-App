package com.rydecam.app

import com.rydecam.app.billing.BillingRepository
import com.rydecam.app.camera.DualCameraHelper
import io.mockk.mockk
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class BillingAndHardwareCapabilityTest {

    @Test
    fun testSandboxProUnlocksAllPremiumFeatures() {
        val mockContext: android.content.Context = mockk(relaxed = true)
        val billingRepo = BillingRepository(mockContext)

        assertFalse(billingRepo.entitlements.value.isProUnlocked)
        assertFalse(billingRepo.entitlements.value.canUse64GbQuota)
        assertFalse(billingRepo.entitlements.value.canUse4kResolution)

        billingRepo.setSandboxProUnlocked(true)
        val pro = billingRepo.entitlements.value

        assertTrue(pro.isProUnlocked)
        assertTrue(pro.canUse64GbQuota)
        assertTrue(pro.canUse4kResolution)
        assertTrue(pro.canUseFrontCamera)
    }

    @Test
    fun testRevertingProReLocksFeatures() {
        val mockContext: android.content.Context = mockk(relaxed = true)
        val billingRepo = BillingRepository(mockContext)

        billingRepo.setSandboxProUnlocked(true)
        assertTrue(billingRepo.entitlements.value.isProUnlocked)

        billingRepo.setSandboxProUnlocked(false)
        assertFalse(billingRepo.entitlements.value.isProUnlocked)
        assertFalse(billingRepo.entitlements.value.canUse64GbQuota)
    }
}
