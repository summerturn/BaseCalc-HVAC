import { Platform } from 'react-native';
import Purchases, {
  PURCHASES_ERROR_CODE,
  PURCHASE_TYPE,
  type CustomerInfo,
  type PurchasesOffering,
  type PurchasesOfferings,
  type PurchasesPackage,
  type PurchasesStoreProduct,
} from 'react-native-purchases';
import { CONFIG, isRevenueCatConfigured, SUBSCRIPTION_ENTITLEMENT_ID, SUBSCRIPTION_TIERS } from '../lib/config';

type PlanKey = 'monthly' | 'yearly';
type PlanMap<T> = Record<PlanKey, T>;

export type SubscriptionStorefront = {
  offering: PurchasesOffering | null;
  packages: PlanMap<PurchasesPackage | null>;
  products: PlanMap<PurchasesStoreProduct | null>;
};

let initialized = false;

async function initPurchases(): Promise<void> {
  if (initialized) return;
  if (!isRevenueCatConfigured()) {
    throw new Error('Store checkout is not available in this build.');
  }
  const apiKey = Platform.OS === 'ios' ? CONFIG.revenueCat.iosApiKey : CONFIG.revenueCat.androidApiKey;
  Purchases.configure({ apiKey, appUserID: undefined });
  initialized = true;
}

function isPurchaseCancelled(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const maybeError = error as { userCancelled?: boolean | null; code?: string };
  return maybeError.userCancelled === true || maybeError.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR;
}

function productMatchesPlan(productIdentifier: string, configuredIdentifier: string): boolean {
  return productIdentifier === configuredIdentifier || productIdentifier.startsWith(`${configuredIdentifier}:`);
}

function productIdentifierForPlan(plan: PlanKey): string {
  return plan === 'monthly' ? SUBSCRIPTION_TIERS.monthly : SUBSCRIPTION_TIERS.yearly;
}

function productIdentifierCandidatesForPlan(plan: PlanKey): string[] {
  const identifier = productIdentifierForPlan(plan);
  if (Platform.OS !== 'android') return [identifier];
  return [identifier, `${identifier}:${plan}`];
}

function packageForPlan(offering: PurchasesOffering | null | undefined, plan: PlanKey): PurchasesPackage | null {
  if (!offering) return null;
  const identifier = productIdentifierForPlan(plan);
  const matchingPackage = offering.availablePackages.find((pkg) => productMatchesPlan(pkg.product.identifier, identifier));
  if (matchingPackage) return matchingPackage;
  return (plan === 'monthly' ? offering.monthly : offering.annual) ?? null;
}

function emptyPlanMap<T>(value: T): PlanMap<T> {
  return {
    monthly: value,
    yearly: value,
  };
}

function productsForPlans(products: PurchasesStoreProduct[]): PlanMap<PurchasesStoreProduct | null> {
  return {
    monthly: products.find((product) => productMatchesPlan(product.identifier, SUBSCRIPTION_TIERS.monthly)) ?? null,
    yearly: products.find((product) => productMatchesPlan(product.identifier, SUBSCRIPTION_TIERS.yearly)) ?? null,
  };
}

function storefrontReady(storefront: SubscriptionStorefront): boolean {
  return Boolean(
    (storefront.packages.monthly ?? storefront.products.monthly) &&
      (storefront.packages.yearly ?? storefront.products.yearly)
  );
}

function hasProEntitlement(customerInfo: CustomerInfo): boolean {
  return customerInfo.entitlements.active[SUBSCRIPTION_ENTITLEMENT_ID]?.isActive === true;
}

function currentOffering(offerings: PurchasesOfferings): PurchasesOffering | null {
  return offerings.current ?? offerings.all.default ?? Object.values(offerings.all)[0] ?? null;
}

export const SubscriptionService = {
  isStorefrontReady(storefront: SubscriptionStorefront): boolean {
    return storefrontReady(storefront);
  },

  async getOfferings(): Promise<PurchasesOffering | null> {
    await initPurchases();
    try {
      const offerings = await Purchases.getOfferings();
      return currentOffering(offerings);
    } catch (error) {
      console.error('[RevenueCat] getOfferings failed:', error);
      throw error;
    }
  },

  async getStorefront(): Promise<SubscriptionStorefront> {
    await initPurchases();

    let offering: PurchasesOffering | null = null;
    const packages: PlanMap<PurchasesPackage | null> = emptyPlanMap(null);
    const products: PlanMap<PurchasesStoreProduct | null> = emptyPlanMap(null);

    try {
      const offerings = await Purchases.getOfferings();
      offering = currentOffering(offerings);
      packages.monthly = packageForPlan(offering, 'monthly');
      packages.yearly = packageForPlan(offering, 'yearly');
      products.monthly = packages.monthly?.product ?? null;
      products.yearly = packages.yearly?.product ?? null;
    } catch (error) {
      console.error('[RevenueCat] getOfferings failed:', error);
    }

    if (!products.monthly || !products.yearly) {
      try {
        const productIdentifiers = Array.from(new Set<PlanKey>(['monthly', 'yearly']).values())
          .flatMap((plan) => productIdentifierCandidatesForPlan(plan));
        const directProducts = productsForPlans(await Purchases.getProducts(productIdentifiers, PURCHASE_TYPE.SUBS));
        products.monthly = products.monthly ?? directProducts.monthly;
        products.yearly = products.yearly ?? directProducts.yearly;
      } catch (error) {
        console.error('[RevenueCat] getProducts failed:', error);
      }
    }

    return {
      offering,
      packages,
      products,
    };
  },

  async purchase(plan: PlanKey): Promise<boolean> {
    await initPurchases();

    try {
      const storefront = await this.getStorefront();
      const packageToBuy = storefront.packages[plan];

      if (packageToBuy) {
        const purchaseResult = await Purchases.purchasePackage(packageToBuy);
        return this.checkProEntitlement(purchaseResult.customerInfo);
      }

      const productToBuy = storefront.products[plan];
      if (!productToBuy) {
        throw new Error('Store products are not available for this install yet.');
      }

      const purchaseResult = await Purchases.purchaseStoreProduct(productToBuy);
      return this.checkProEntitlement(purchaseResult.customerInfo);
    } catch (error: unknown) {
      if (isPurchaseCancelled(error)) {
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

  checkProEntitlement(customerInfo: CustomerInfo): boolean {
    return hasProEntitlement(customerInfo);
  },

  setUserId(userId: string) {
    if (initialized) {
      Purchases.logIn(userId).catch((error: unknown) => console.error('[RevenueCat] logIn failed:', error));
    }
  },
};
