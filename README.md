# RydeCam 🚘🎥

**RydeCam** (`com.rydecam.app`) is an automotive-grade dashcam software suite featuring continuous segmented recording, FIFO storage quotas, G-sensor accident preservation, GPS HUD speed overlay, and split-screen companion navigation.

The repository includes both:
1. **Web Simulation & PWA Companion** (`/` and `src/`): A reactive TypeScript/React cockpit simulator with live camera streams, real-time geolocation speed overlay, FIFO quota management, and video export.
2. **Production-Ready Native Android App** (`android-project/`): Built with Kotlin, Jetpack Compose Material 3, CameraX, Room, Media3 ExoPlayer, and Google Play Billing.

---

## Key Features

- **Continuous Segmented Recording:** Seamless 1, 2, or 3-minute video slice rotation without frame loss.
- **Dynamic FIFO Storage Manager:** 8 GB, 16 GB, 32 GB, and 64 GB storage quotas with automatic eviction of the oldest unprotected video files when capacity thresholds are reached.
- **Accident & Impact Detection (G-Sensor):** High-pass impact shock filter isolates road vibrations from collisions, automatically locking the current and previous segment to prevent eviction.
- **GPS Speedometer HUD:** Real-time speed readout in km/h or mph with accuracy filtering and tunnel signal-loss watchdogs.
- **Split-Screen & Navigation Companion:** Quick launch alongside Google Maps, Waze, and other navigation apps with `FLAG_ACTIVITY_LAUNCH_ADJACENT`.
- **Emergency Lock Guard:** One-tap manual preservation button to protect footage from road-rage incidents or scenic drives.
- **Pro Subscriptions & Google Play Billing:** Flexible monetization tiers (1080p FHD free tier, 4K UHD & 64 GB storage quota for Pro subscribers).

---

## Repository Structure

```
├── android-project/          # Native Android Studio Project (Kotlin & Jetpack Compose)
│   ├── app/                  # Main application module
│   │   ├── src/main/java/com/rydecam/app/
│   │   │   ├── billing/      # Google Play Billing repository
│   │   │   ├── camera/       # CameraX & DualCamera Camera2 queries
│   │   │   ├── database/     # Room database, DAOs, & entities
│   │   │   ├── incident/     # G-sensor shock detector
│   │   │   ├── location/     # Fused GPS speed & telemetry provider
│   │   │   ├── navigation/   # Split-screen & companion navigation launcher
│   │   │   ├── recording/    # SegmentedRecorder & Foreground Recording Service
│   │   │   ├── settings/     # DataStore preferences repository
│   │   │   ├── storage/      # StorageQuotaManager & FIFO auto-deletion engine
│   │   │   └── ui/           # Jetpack Compose automotive cockpit screens & theme
│   │   ├── src/main/res/     # Strings, themes, manifests
│   │   └── build.gradle.kts  # App Gradle build script
│   ├── gradle/               # Gradle wrapper & version catalogs
│   ├── gradlew               # Executable Gradle wrapper
│   └── README.md             # Native Android build & device testing guide
├── src/                      # Web simulator & PWA companion (React + TypeScript)
│   ├── components/           # Cockpit HUD, recording screen, settings, modals
│   ├── services/             # Storage quota manager, GPS speed provider, G-sensor
│   ├── types/                # Dashcam data models and telemetry types
│   ├── App.tsx               # Primary interface orchestrator
│   └── main.tsx              # React DOM entry point
├── index.html                # PWA entry point
├── package.json              # NPM dependencies & scripts
├── tsconfig.json             # TypeScript configuration
└── vite.config.ts            # Vite build configuration
```

---

## Getting Started

### Web Simulator (Node.js)

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the local development server:**
   ```bash
   npm run dev
   ```

3. **Build and lint:**
   ```bash
   npm run lint
   npm run build
   ```

### Native Android App (Android Studio)

1. Open Android Studio Ladybug (2024.2.1+) or newer.
2. Select **Open** and choose the `android-project/` directory.
3. Allow Gradle to sync dependencies using JDK 17.
4. Run on an Android device or emulator with camera hardware:
   ```bash
   cd android-project
   ./gradlew assembleDebug
   ```

---

## License

MIT
