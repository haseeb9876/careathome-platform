# Appearance and reading comfort

Use **Appearance settings** in the public header or workspace top bar. The same preferences are available under **Settings & security** for patients, providers and administrators.

- Light and Dark are explicit choices. System (the default) follows the device setting, including changes while the application is open.
- Larger text increases supporting copy, navigation, labels and forms. Browser zoom remains available.
- Changes apply immediately without navigation or clearing unfinished form fields. Preferences persist in this browser and synchronize with other tabs on the same origin. Installed-app storage sharing depends on the browser/OS; preferences are not synchronized through the account.
- If browser storage is blocked, controls still work for the current document and explain that saving was unavailable.
- The appearance dialog uses native modal focus containment, Escape dismissal and return of focus to its trigger. Reduced-motion preferences remain respected.
- The offline screen reads the same preferences; the service worker caches only the existing public fallback and icon. Printed reports use light colours regardless of the screen theme.

## Maintenance

[Appearance state](../src/lib/appearance.ts) contains validated preferences, the small pre-paint script and browser synchronization. The root layout runs the script before paint; only the HTML element suppresses the expected attribute hydration mismatch. No user content is interpolated into the script.

[Appearance controls](../src/components/appearance.tsx) share a `useSyncExternalStore` subscription, so header and settings controls agree. [Appearance styles](../src/styles/appearance.css) define semantic tokens, dark surface/state colours, reading adjustments and print overrides. Add theme coverage when introducing a new component with fixed colours. Images are not colour-inverted.

[Browser scenarios](../tests/e2e/appearance.spec.ts) cover persistence, system changes, tab synchronization, storage denial, unfinished forms, role settings, mobile overflow and automated contrast/accessibility checks. Physical iOS and Android checks remain a separate acceptance activity.
