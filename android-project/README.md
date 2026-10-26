# RydeCam — Native Android Dashcam Application

A production-grade native Android automotive dashcam application built with **Kotlin**, **Jetpack Compose (Material 3)**, **CameraX / Camera2**, **Room**, **AndroidX Media3**, and **Google Play Billing**.

- **Application ID / Package:** `com.rydecam.app`
- **Application Class:** `com.rydecam.app.RydeCamApplication`

---

## 1. Architecture Overview

RydeCam follows strict Clean Architecture and MVVM patterns with decoupled services:

```
                      ┌────────────────────────────────────────┐
                      │          Jetpack Compose UI            │
                      │  (MainRecording, Settings, Library)    │
                      └──────────────────┬─────────────────────┘
                                         │ StateFlow / Events
                      ┌──────────────────▼─────────────────────┐
                      │    DashcamRecordingService (FG Svc)    │
                      │    - Partial WakeLock (Screen off)     │
                      │    - Ongoing Notification with Controls│
                      └───────┬──────────────┬──────────────┬──┘
                              │              │              │
       ┌──────────────────────▼──┐    ┌──────▼──────┐   ┌───▼────────────────┐
       │   SegmentedRecorder     │    │ G-Sensor    │   │  GpsSpeedProvider  │
       │   - 1/2/3 min rotation  │    │ Detector    │   │  - Fused Location  │
       │   - Seamless transition │    │ - Gravity HP│   │  - Accuracy filter │
       └──────────────┬──────────┘    │ - Debounce  │   │  - Staleness guard │
                      │               └──────┬──────┘   └────────────────────┘
       ┌──────────────▼──────────┐           │
       │   StorageQuotaManager   │           │ Incident Trigger
       │   - FIFO auto-deletion  │◄──────────┘ (60s Pre-Buffer + 30s Post)
       │   - Protected Lock Guard│
       │   - Disk Reconciliation │
       └──────────────┬──────────┘
                      │
       ┌──────────────▼────────────────────────────────────────┐
       │        Room Database (Recordings & Incidents)         │
       └───────────────────────────────────────────────────────┘
```

### Module / Package Breakdown (`com.rydecam.app.*`)

- **`camera`**: CameraX pipeline, 1080p FHD / 4K UHD resolution profiles, concurrent dual-camera query (`DualCameraHelper.kt`) via Camera2 API.
- **`recording`**: `DashcamRecordingService.kt` (Foreground Service with `FOREGROUND_SERVICE_TYPE_CAMERA | LOCATION`), `SegmentedRecorder.kt` (time-sliced MP4 file rotation with `RYDECAM_` prefix), and `RollingIncidentBuffer.kt` (pre-event buffer retention).
- **`storage`**: `StorageQuotaManager.kt` (8 GB, 16 GB, 32 GB, 64 GB logical quotas, FIFO eviction of oldest unprotected files, safety margin, Room disk reconciliation).
- **`incident`**: `GSensorIncidentDetector.kt` (Low-pass gravity isolation + high-pass impact shock detection, debounce lockout, sensitivity tiers: 1.8G, 2.5G, 3.5G).
- **`location`**: `GpsSpeedProvider.kt` (Google Play Services Fused Location, accuracy discard (>35m), tunnel staleness timeout, km/h & mph conversion).
- **`billing`**: `BillingRepository.kt` (Google Play Billing client for 64GB quota, 4K UHD, and dual-camera unlocks: `rydecam_pro_monthly` at $3/mo and `rydecam_pro_annual` at $30/yr auto-renewing subscriptions, purchase restoration, and offline sandbox testing).
- **`navigation`**: `NavigationCompanionManager.kt` (Detects Google Maps, Waze, HERE, OsmAnd; multi-window `FLAG_ACTIVITY_LAUNCH_ADJACENT` launcher & OEM split-screen guide).
- **`database`**: Room Database (`DashcamDatabase.kt` -> `rydecam_dashcam.db`, `RecordingEntity.kt`, `IncidentEntity.kt`).
- **`ui`**: Jetpack Compose screens styled for automotive cockpits (high-contrast dark OLED theme, large speedometer numerals, one-tap emergency lock, guard dialog against accidental stops).

---

## 2. Platform Requirements & Minimum SDK

- **Minimum SDK:** 26 (Android 8.0 Oreo)
  - *Rationale:* Required for reliable foreground service notifications (`startForegroundService`), notification channels, and modern CameraX hardware support without fragmentation.
- **Target SDK:** 35 (Android 15)
- **Compile SDK:** 35
- **Java/Kotlin Target:** Java 17

---

## 3. Permissions Handled

Declared in `AndroidManifest.xml` and requested contextually:
- `android.permission.CAMERA`: Live video feed capture.
- `android.permission.RECORD_AUDIO`: Optional in-cabin audio recording (opt-in only).
- `android.permission.ACCESS_FINE_LOCATION` & `ACCESS_COARSE_LOCATION`: Vehicle speed & GPS coordinate overlay.
- `android.permission.FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_CAMERA`, `FOREGROUND_SERVICE_LOCATION`: Uninterrupted recording while navigation runs or screen is dimmed.
- `android.permission.WAKE_LOCK`: `PARTIAL_WAKE_LOCK` keeps the CPU active while allowing the OLED display to turn off, preventing overheating.
- `android.permission.POST_NOTIFICATIONS`: Ongoing notification controls.
- `com.android.vending.BILLING`: Google Play Billing.

---

## 4. Building the Project

### Prerequisites
1. Android Studio Ladybug (2024.2.1+) or newer.
2. JDK 17 configured in Android Studio Gradle settings.
3. Android SDK 35 and Build Tools installed.

### Build Commands
```bash
# Clone and navigate to project directory
cd android-project

# Run unit tests
./gradlew test

# Assemble Debug APK
./gradlew assembleDebug

# Assemble Release APK (requires release signing key in build.gradle.kts)
./gradlew assembleRelease
```

---

## 5. Physical-Device Testing Requirements

| Feature | Physical Test Reason | Recommended Device Test Matrix |
|---------|----------------------|--------------------------------|
| **Concurrent Dual-Camera (Rear + Selfie)** | Hardware abstraction layers (HAL) dictate whether two cameras can open simultaneously without resource contention (`CameraAccessException`). | Google Pixel 8/9, Samsung Galaxy S23/S24, Xiaomi 13 |
| **Sustained 4K Thermal Dissipation** | 4K 60Mbps encoding in direct windscreen sunlight can cause thermal throttling (`PowerManager.getThermalHeadroom`). | Extended 1-hour recording on windscreen mount in sunlight |
| **G-Sensor Road Vibration Calibration** | Distinguishing actual collisions (2.5G–3.5G) from rough asphalt, speed bumps, and railway crossings. | Real vehicle test drive on rough road and controlled braking |
| **Screen-Off Background Continuity** | Aggressive vendor battery optimizers (Samsung OneUI, Xiaomi MIUI, OnePlus OxygenOS) may attempt to kill background camera services. | Test 30-minute recording with display locked/off |
| **GPS Doppler Speed in Tunnels / Canyons** | Signal loss watchdog behavior and automatic speed nullification (`-- km/h`). | Drive through covered tunnel or underground parking |
| **Charging while 1080p Recording** | High battery draw and heat buildup when phone is connected to 12V automotive USB charger. | 12V 18W car charger with battery temperature logging |

---

## 6. Known Platform Limitations & Graceful Degradation

1. **Concurrent Front & Rear Camera:**
   - Supported natively on devices exposing `CameraManager.concurrentCameraIds` (Android 11+).
   - If a device does not support concurrent streams, RydeCam cleanly reports this in Settings and keeps the primary rear road-facing camera feed active without crashing.
2. **Programmatic Split-Screen:**
   - Android does not permit third-party apps to forcibly split the screen without user intervention on all OEM ROMs.
   - RydeCam sets `FLAG_ACTIVITY_LAUNCH_ADJACENT` and provides an in-app OEM guide with steps for OneUI, Pixel, and MIUI.
3. **Emergency Disclaimers:**
   - G-sensor incident preservation is a software heuristic designed to safeguard video files, not an automotive crash-notification or eCall system.
