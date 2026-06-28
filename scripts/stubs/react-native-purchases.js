// Local-build stub for `react-native-purchases`.
//
// RevenueCat 5.78.0 (bundled by react-native-purchases) does not compile under
// Xcode 26.5, which blocks local `expo run:ios`. RevenueCat is not configured in
// the current launch path (no API keys), so this no-op stub lets the app build and
// run locally for UI work. Production / EAS builds use the REAL module — this stub
// is only wired in via the resolver alias in metro.config.js; remove that alias to
// restore the real SDK.
const Purchases = {
  configure() {},
  async getOfferings() { return { current: null }; },
  async getCustomerInfo() { return { entitlements: { active: {} } }; },
  async purchasePackage() { return { customerInfo: { entitlements: { active: {} } } }; },
  async restorePurchases() { return { entitlements: { active: {} } }; },
  async logIn() { return {}; },
};

module.exports = { __esModule: true, default: Purchases };
