# BaseCalc HVAC — App Store assets

Everything needed to fill out the App Store Connect listing for BaseCalc HVAC.

## What's here

```
store-assets/
├── screenshots/        ← 10 images, 1284 × 2778  (iPhone 6.5"/6.7")
│   ├── 01-dashboard.png
│   ├── 02-duct-sizing.png
│   ├── 03-filter-velocity.png   (PASS/FAIL hero)
│   ├── 04-psychrometrics.png
│   ├── 05-jobs.png
│   ├── 06-worksheet.png
│   ├── 07-materials.png
│   ├── 08-superheat.png
│   ├── 09-refrigerant-lines.png
│   └── 10-history.png
├── screenshots-ipad/   ← same 10 screens, 2048 × 2732  (iPad 13")
└── seed/basecalc-seed.json   ← sample data baked into the screenshots
```

Listing copy lives in **[../STORE_LISTING.md](../STORE_LISTING.md)** and **[../store.config.json](../store.config.json)**.

## Listing copy (optimized for ASO)

| Field | Value |
|---|---|
| Name | BaseCalc HVAC |
| Subtitle | HVAC Calculator & Tools |
| Keywords | hvac,calculator,btu,cfm,duct,refrigerant,superheat,subcooling,load,psychrometrics,hydronics,airflow |
| Category | Utilities (primary), Business (secondary) |

Full promo text, description, release notes, and the keyword rationale are in `STORE_LISTING.md`.

## Regenerating screenshots

```bash
node scripts/generate-store-screenshots.mjs
```

Faithful HTML recreations of each screen (real theme tokens, Saira / JetBrains Mono /
MaterialIcons fonts, seeded data) rendered through headless Chrome and framed on the
brand gradient. Edit headlines/data at the top of `scripts/generate-store-screenshots.mjs`.

> Why recreated and not raw simulator captures: the native iOS build currently fails to
> compile `react-native-purchases` / RevenueCat under Xcode 26.5, so the app can't be run
> on-device to capture live frames. The recreations use the app's exact design tokens,
> component layouts, fonts, and copy, so they represent the real UI 1:1.

## Status (App Store Connect)

Text metadata should be pushed via `eas metadata:push` after updating `store.config.json`:

```bash
npx eas-cli metadata:push --profile production
```

**Remaining manual steps in App Store Connect:**

1. **Screenshots** → upload the 10 PNGs from `screenshots/` (iPhone 6.9") and the 10 from
   `screenshots-ipad/` (iPad 13"), in order. *(EAS metadata can't push screenshots.)*
2. **Pricing** → Free unless RevenueCat products are enabled for this launch.
3. **App Privacy** → on-device-only. User-entered job contacts, job worksheets, settings,
   and calculations stay on device with no BaseCalc cloud sync option. Add purchase or ads disclosures only if
   RevenueCat or AdMob is enabled in the submitted build.
4. **Build** → attach an iOS build, then submit for review.

iPad note: `ios.supportsTablet: true` is intentionally kept — the iPad screenshot set above
satisfies App Store Connect's iPad requirement.
