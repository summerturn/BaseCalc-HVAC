# BaseCalc HVAC Calculator — Store Listing Copy

Source of truth for App Store Connect and Google Play listing text. Values mirror `store.config.json` where supported. Last reconciled to source behavior: 2026-07-20.

## Positioning

- **Brand:** BaseCalc HVAC Calculator
- **Bundle/package:** `com.basemapped.basecalchvac`
- **One-liner:** Run HVAC calculator math on site, save job worksheets, finish billing in SpeakSheet.
- **Audience:** HVAC technicians, installers, service contractors, estimators, and building operators.
- **Primary search intent:** HVAC calculator, BTU calculator, CFM calculator, duct sizing calculator, airflow calculator, refrigerant calculator, superheat calculator, subcooling calculator, hydronics, psychrometrics.
- **Differentiator:** 18 field calculators plus local job records, materials planning, job worksheet PDFs, and a clean SpeakSheet handoff.

## Apple App Store

| Field | Value | Count / Limit |
|---|---|---|
| **Title** | `BaseCalc HVAC Calculator` | 24 / 30 |
| **Subtitle** | `BTU CFM Duct Calculator` | 23 / 30 |
| **Keywords** | `hvac,calculator,BTU,CFM,duct,sizing,airflow,refrigerant,superheat,subcooling,load,psychrometric` | 95 / 100 |
| **Promotional Text** | `HVAC field math for BTU, CFM, duct sizing, psychrometrics, manufacturer-data checks, saved history, worksheets, and materials.` | 130 / 170 |

**Description**

```
BaseCalc HVAC Calculator is an HVAC calculator for field math, worksheets, materials, and saved calculation history. Run BTU, CFM, duct sizing, airflow, psychrometrics, refrigerant line, superheat, subcooling, load, hydronics, and other HVAC calculator checks on site, then save the result for the job.

18 CALCULATORS FOR DAILY FIELD WORK
• BTU ↔ Tons — convert between BTU/hr and refrigeration tons.
• CFM from BTU — airflow from load and temperature rise/drop.
• BTU from CFM — load from airflow and temperature difference.
• Duct Sizing — round and rectangular duct from CFM and velocity.
• Air Velocity — velocity from CFM and cross-sectional area.
• Psychrometrics — total, sensible, and latent BTU/hr estimates.
• Refrigerant Lines — check entered manufacturer line data against an entered equivalent-length limit.
• Superheat / Subcooling — record the exact target supplied by the equipment manufacturer.
• Room Load — preliminary area-factor planning math using your supplied factor; not Manual J.
• Heat Pump Balance — interpolate a bracketed balance point from entered manufacturer capacity data.
• Hydronics — BTU, GPM, and ΔT relationships.
• Mixed Air — mixed-air temperature from outdoor and return air.
• Air Changes — ACH from CFM and room volume.
• Evaporative Cooling — supply temperature and sensible air-side estimate.
• Filter Velocity — filter face velocity; use manufacturer data for pressure drop.
• O₂ Excess Air — theoretical dry-flue-gas dilution estimate from measured O₂; not a safety result.
• Refrigerant Weight — additional charge from an entered manufacturer allowance and rate.
• Outdoor Airflow — breathing-zone airflow arithmetic from user-supplied per-person and per-area rates.

EVERY RESULT IS EXPLAINED
• Explicit input validation, assumptions, and calculation boundaries.
• Final arithmetic and a calculation breakdown where the supplied data supports one.
• Saved local history so you keep a job-site record.

JOB RECORDS, MATERIALS, AND WORKSHEETS
• Save job contacts with site notes.
• Build job worksheets with scope, quantities, and site notes.
• Export worksheet PDFs for internal handoff or customer context.
• Plan common pull-list items before rough-in, service, and closeout.
• Send the finished billing handoff to SpeakSheet for the final invoice.

DEVICE-LOCAL FOR THE FIELD
• Works offline by default.
• No BaseCalc account or cloud sync.
• Job contacts, worksheets, settings, and calculation history use the app's local storage.
• Subscription status is checked through RevenueCat; exports leave the app only when you choose to share them.
• No third-party advertising SDK or third-party ads in this release.
• Dark and light themes with a high-contrast job-site interface.

BaseCalc HVAC is a professional reference tool. Always verify against current industry standards, manufacturer data, and local codes. The authority having jurisdiction has the final say.
```

**Release notes**

```
Initial release of BaseCalc HVAC Calculator with 18 HVAC field calculators, saved local history, materials planning, worksheet PDF export, SpeakSheet handoff, and device-local offline storage.
```

**Categories:** Primary `Utilities`, Secondary `Business`.

## Google Play

- **App name:** `BaseCalc HVAC Calculator`
- **Short description:** `HVAC calculator for BTU, CFM, duct sizing, refrigerant, and worksheets.`
- **Full description:** use the Apple description above. Google indexes title, short description, and full description, so keep the 18 calculator names visible.

## Launch Declarations

- Privacy policy URL: `https://basemapped.com/basecalc-hvac/privacy-policy`
- Apple standard Terms of Use (EULA): `https://www.apple.com/legal/internet-services/itunes/dev/stdeula/`
- Support URL: `https://basemapped.com/basecalc-hvac/support`
- Marketing URL: `https://basemapped.com/products/basecalc-hvac`
- Copyright: `2026 BaseMapped LLC`
- Age rating: 4+.
- BaseCalc HVAC stores user-entered job data in app-local storage and does not provide a BaseCalc account or BaseCalc cloud sync.
- Disclose app-store purchase and entitlement processing through RevenueCat.
- This source does not include an advertising SDK or display third-party ads.

## Screenshots

Marketing screenshots are generated into `store-assets/` via `scripts/generate-store-screenshots.mjs`. Refresh screenshots after major dashboard/card changes so the store shows the current 18-tool interface.
