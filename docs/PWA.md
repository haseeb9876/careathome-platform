# CareAtHome mobile installation

The same public website installs as **CareAtHome**, with the full app name **CareAtHome — Home Care** and a home/care-pulse icon. It launches `/dashboard`; signed-out users follow the existing sign-in flow. Patient, provider and administrator permissions remain unchanged.

## Installing

- Android: open the HTTPS website in Chrome. When the browser provides its installation event, the first-visit card offers **Install app**. Tap it and confirm the browser's dialog. If that event is unavailable, use the browser menu's **Install app** or **Add to Home screen** option.
- iPhone/iPad: open in Safari, choose **Share → Add to Home Screen**, leave **Open as Web App** enabled if offered, then **Add**. There is no equivalent programmable iOS install prompt.
- The inline first-visit panel can be dismissed for seven days. **Install CareAtHome** at the top of the website reopens help. The panel takes its own space instead of covering registration or care controls. Installed/standalone mode hides the panel and installation link. Storage restrictions do not prevent the site from working.
- This is an installation reminder inside the website, not a push notification. It does not request notification permission or install software without confirmation. Browser eligibility, private mode and device policies can affect installation availability.

## Releases and offline behavior

Push tested source changes to the existing GitHub/Vercel pipeline. Installed apps use the same live deployment; a new launch or full refresh retrieves current HTML without requiring reinstallation. A previously open app can remain on its current screen. The app checks for a changed release on foreground/connection recovery and every five visible minutes, then offers **Refresh to update**. It never silently reloads an unfinished form. Save changes before refreshing. Browsers control worker-update timing; this is not an instant forced update to every device.

The service worker caches only the public offline page and its logo. It does not cache authenticated pages, care records, reports, credential files, API responses or submitted forms. Offline navigation displays connection/retry guidance. Care workflows require internet; there is no offline submission queue. Existing authentication remains authoritative.

## Maintenance

- [Manifest](../src/app/manifest.ts): name, start URL, scope, icons and standalone appearance.
- [Install/update UI](../src/components/app-install.tsx): browser event, iOS instructions, dismissal and version checks.
- [Service worker](../public/sw.js): public-only fallback. Increment its cache name when changing the cached offline page/icon.
- [Version endpoint](../src/app/api/app-version/route.ts): uncached release identifier. Vercel uses the build's Git SHA; local builds use a generated identifier.
- [Configuration](../next.config.ts): version injection and uncached worker headers.
- [Icon source](../public/icons/app.svg): source for 192/512 PNGs, 512 maskable PNG and 180 Apple icon. The artwork fits within the maskable safe area. Do not change stable manifest `id` or `scope` when deploying ordinary updates.
- [Browser tests](../tests/e2e/pwa.spec.ts): metadata, simulated install event, iOS guidance, dismissal, real-worker offline behavior and release detection with unfinished form preservation.

Physical Android and iPhone installation and OS icon/splash rendering need device acceptance. Browser emulation and synthetic install events cannot prove an OS installation succeeded. The app remains a synthetic care demonstration, not an app-store release.

References: [Next.js PWA guide](https://nextjs.org/docs/app/guides/progressive-web-apps), [MDN installation behavior](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable), [Apple Add to Home Screen](https://support.apple.com/en-lamr/guide/iphone/iphea86e5236/ios).
