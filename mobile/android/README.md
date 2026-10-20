# CareAtHome Android demonstration

This is an Android Trusted Web Activity project, not a Play-approved production release. It uses the existing web application, accounts and database. The provisional package `app.careathome.demo` is deliberately separate from the future organization's production identity.

## Build

The repository's **Android build** GitHub Actions workflow compiles Java, runs Android lint and produces a debug APK plus an **unsigned** release AAB. It uses JDK 17, Gradle 8.11.1, Android Gradle Plugin 8.10.1 and target/compile API 36. This avoids installing Android Studio or the SDK on the owner's laptop.

For a machine with the Android SDK and JDK 17 already configured:

```powershell
.\gradlew.bat lintDebug assembleDebug bundleRelease
```

The generated source is now maintained directly. No Bubblewrap npm dependency is needed to compile it. It was generated from Bubblewrap core 1.27.0's Apache-2.0 templates; notices and [license](LICENSE-bubblewrap) are retained. The temporary local generator had transitive dependency advisories and is excluded from Git and application tooling.

## What must happen before Play submission

1. Confirm organization, launch countries, final package ID, app name and permanent HTTPS origin. Update the Gradle/Java namespace and web association consistently. Do not submit this provisional demo identity as the business's production app.
2. Configure Play App Signing and securely retain the upload key. Never commit signing keys or passwords. The workflow currently has no release credentials and does not publish.
3. Configure the **Play app-signing certificate** SHA-256 fingerprint (not merely the upload certificate) and matching package ID on the website's asset-links endpoint. Without verified Digital Asset Links, browser chrome may appear. A successful build does not prove fullscreen verification.
4. Complete privacy, deletion/retention, health declarations, store listing and reviewer access. Existing closure disables access; it is not erasure of all associated data.
5. Test a Play-installed build on real Android devices: app links, OTP, recovery, Android Back, uploads, PDFs, foreground updates, offline recovery and accessibility. Browser tests alone do not establish Android acceptance.
6. Sign the release bundle privately, upload to internal/closed testing, inspect Play pre-launch reports, then request review. No automatic production publishing is configured.

Notifications are disabled until a real opt-in notification service and delivery workflow are implemented. This app requires a network connection for care workflows. It does not store clinical records offline and is not an iPhone App Store package.

References: [TWA](https://developer.android.com/develop/ui/views/layout/webapps/trusted-web-activities), [API requirements](https://support.google.com/googleplay/android-developer/answer/11926878), [AGP compatibility](https://developer.android.com/build/releases/agp-8-10-0-release-notes).
