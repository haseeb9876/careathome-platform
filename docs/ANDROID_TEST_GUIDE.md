# Android test build handoff

## Current Pakistan-brand build — October 21

GitHub Actions `39609039339`, commit `c7c389c`, passed compilation, lint and packaging. Label: **Sukoonara Care Demo**; package remains `app.careathome.demo`. The debug APK and unsigned AAB are in the ignored `artifacts/android/39609039339` directory. APK SHA-256: `886D3BE0DA826BDEF0DE8B1EB5AC762571FAF2B16E47AAC8412D15E599E4237E`. This is for synthetic device acceptance, not a signed Play release. The device checklist below still applies; open Sukoonara Care Demo for this build.

## Earlier build

Build: GitHub Actions `39554727171`, commit `d4eecf7`. Package: `app.careathome.demo`. Name: **CareAtHome Demo**. Minimum Android: 7 / API 24. Target API: 36.

The debug APK is an internal demonstration build, not a Play Store release. The AAB is unsigned. They are available from the Android build workflow artifact for seven days; local copies are in the ignored `artifacts/android/39554727171` directory. The APK SHA-256 is `D35D7ADED8910963D749177092A4639E86775CE3FBA93595F92AA422265A0334`.

## Device acceptance

1. Transfer the debug APK to a test Android phone and install it using that phone's app-installation controls. Use synthetic accounts/data only.
2. Open CareAtHome Demo. Until the permanent app-signing certificate is associated with the website, it opens with browser controls; fullscreen trust is not established by this build.
3. Check registration, automatic email OTP, expired-code resend, recovery, sign-out and Android Back. Verify the correct role dashboard opens after OTP.
4. Check large text, light/dark appearance, keyboard navigation, screen reader, narrow screen layout, provider search and a complete synthetic booking/cancellation.
5. On provider/admin test accounts, check credentials upload/download, assignment, care records and report export. Do not enter real patient data.
6. Disconnect/reconnect the network. Confirm care data is not presented as safely saved offline. After a web release, confirm the update notice lets the user finish unsaved work before choosing to reload, and a new launch loads the current version.
7. Record Android version, browser version, device model, test outcome and any screenshot with private data removed. Build/lint success does not replace this acceptance.

Cloud debug signing keys can change between builds, so a later debug APK may require uninstall/reinstall. The permanent release needs stable private signing, Play App Signing, matching website association, privacy/deletion declarations and Play testing/review. No production publication or push notification service is configured.
