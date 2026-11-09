# BaseCalc HVAC AdMob release setup

## Implemented ad experience

- Free users see one clearly labeled inline adaptive banner near the bottom of each scrollable app screen; a fixed slot prevents content from shifting while the ad loads.
- Tapping a Pro calculator offers an explicit choice: watch one rewarded ad for 30 minutes of access to that calculator, view Pro, or cancel.
- Closing a rewarded ad before the reward callback grants no access.
- Pro subscribers receive every calculator and no ads.
- Requests are non-personalized, Google UMP consent is checked before SDK initialization, and required privacy choices are available in Settings.
- Development, simulator, and preview builds use Google's official test app and ad-unit IDs.

## AdMob inventory required

AdMob account: present indirectly through the public publisher record `pub-7537635162113434`.

Current `https://basemapped.com/app-ads.txt` state: HTTP 200 with the Google publisher record.

The following BaseCalc HVAC AdMob values are not provided and must be created or retrieved from AdMob:

| Platform | AdMob app | Adaptive banner unit | Rewarded unit |
|---|---|---|---|
| iOS `com.basemapped.basecalchvac` | not provided | not provided | not provided |
| Android `com.basemapped.basecalchvac` | not provided | not provided | not provided |

## EAS production variables

Set `ADMOB_IOS_APP_ID`, `ADMOB_ANDROID_APP_ID`, `EXPO_PUBLIC_ADMOB_IOS_BANNER_ID`, `EXPO_PUBLIC_ADMOB_ANDROID_BANNER_ID`, `EXPO_PUBLIC_ADMOB_IOS_REWARDED_ID`, and `EXPO_PUBLIC_ADMOB_ANDROID_REWARDED_ID` in this app's EAS `production` environment.

The production profile sets `BASECALC_ADS_PRODUCTION=true`. The dynamic Expo config rejects missing, malformed, or Google sample IDs, so a production binary cannot accidentally ship with test inventory.

## Required console work before release

1. In AdMob, link or add the iOS and Android apps, then create one banner and one rewarded unit per platform.
2. Publish the required European regulations and applicable US-state messages in AdMob Privacy & messaging.
3. Set Google Play **Contains ads** to Yes and update Data safety for approximate location from IP, app interactions, diagnostics, and device/account identifiers used or shared for advertising, analytics, and fraud prevention.
4. Update App Store Connect App Privacy and age-rating answers for the SDK's actual data practices. The app does not request ATT and does not request personalized ads.
5. Publish `deploy/legal/privacy-policy.html` before submitting the binary.
6. Validate consent, banner layout, reward completion, early close, offline/no-fill behavior, and Pro ad suppression on real iOS and Android devices using a preview build with test IDs.
7. Build production with the six real IDs, then verify AdMob approval, app-ads.txt, real-device fill, impressions, completions, and estimated earnings after release.

Store forms, AdMob records, EAS variable changes, builds, submissions, and publication remain external actions.
