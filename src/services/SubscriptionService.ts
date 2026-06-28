import { Platform } from 'react-native';
import Purchases from 'react-native-purchases';
import { CONFIG, isRevenueCatConfigured, SUBSCRIPTION_TIERS } from '../lib/config';

let initialized = false;

async function initPurchases(): Promise<void> {
  if (initialized) return;
  if (!isRevenueCatConfigured()) {
    throw new Error('RevenueCat API keys are not configured.');
  }
  const apiKey = Platform.OS === 'ios' ? CONFIG.revenueCat.iosApiKey : CONFIG.revenueCat.androidApiKey;
  Purchases.configure({ apiKey, appUserID: undefined });
  initialized = true;
}

export const SubscriptionService = {
  async getOfferings() {
    await initPurchases();
    try {
      const offerings = await Purchases.getOfferings();
      return offerings.current;
    } catch (error) {
      console.error('[RevenueCat] getOfferings failed:', error);
      return null;
    }
  },

  async purchase(plan: 'monthly' | 'yearly'): Promise<boolean> {
    await initPurchases();
    const identifier = plan === 'monthly' ? SUBSCRIPTION_TIERS.monthly : SUBSCRIPTION_TIERS.yearly;

    try {
      const offerings = await Purchases.getOfferings();
      const packageToBuy = offerings.current?.availablePackages.find(
        (pkg) => pkg.product.identifier === identifier
      );

      if (!packageToBuy) {
        throw new Error('Subscription product not found. Check RevenueCat/App Store configuration.');
      }

      const purchaseResult = await Purchases.purchasePackage(packageToBuy);
      return this.checkProEntitlement(purchaseResult.customerInfo);
    } catch (error: any) {
      if (error.userCancelled) {
        return false;
      }
      throw error;
    }
  },

  async restorePurchases(): Promise<boolean> {
    await initPurchases();
    const customerInfo = await Purchases.restorePurchases();
    return this.checkProEntitlement(customerInfo);
  },

  async checkStatus(): Promise<boolean> {
    await initPurchases();
    const customerInfo = await Purchases.getCustomerInfo();
    return this.checkProEntitlement(customerInfo);
  },

  checkProEntitlement(customerInfo: any): boolean {
    return Boolean(customerInfo.entitlements.active.pro);
  },

  setUserId(userId: string) {
    if (initialized) {
      Purchases.logIn(userId).catch((err) => console.error('[RevenueCat] logIn failed:', err));
    }
  },
};
