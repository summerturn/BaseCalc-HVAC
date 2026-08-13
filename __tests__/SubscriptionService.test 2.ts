jest.mock('../src/lib/config', () => ({
  CONFIG: {
    revenueCat: {
      iosApiKey: 'appl_test_public_key',
      androidApiKey: 'goog_test_public_key',
    },
  },
  isRevenueCatConfigured: jest.fn(() => true),
  SUBSCRIPTION_ENTITLEMENT_ID: 'pro',
  SUBSCRIPTION_TIERS: {
    monthly: 'basecalc_hvac_pro_monthly',
    yearly: 'basecalc_hvac_pro_yearly',
  },
}));

jest.mock('react-native-purchases', () => ({
  __esModule: true,
  default: {
    configure: jest.fn(),
    getOfferings: jest.fn(),
    getProducts: jest.fn(),
    purchasePackage: jest.fn(),
    purchaseStoreProduct: jest.fn(),
    restorePurchases: jest.fn(),
    getCustomerInfo: jest.fn(),
    invalidateCustomerInfoCache: jest.fn(),
    addCustomerInfoUpdateListener: jest.fn(),
    removeCustomerInfoUpdateListener: jest.fn(),
    logIn: jest.fn(),
  },
  PURCHASES_ERROR_CODE: {
    PURCHASE_CANCELLED_ERROR: 'PURCHASE_CANCELLED_ERROR',
  },
  PURCHASE_TYPE: {
    SUBS: 'SUBS',
  },
}));

import Purchases, {
  type CustomerInfo,
  type MakePurchaseResult,
  type PurchasesOfferings,
  type PurchasesPackage,
  type PurchasesStoreProduct,
} from 'react-native-purchases';
import { SubscriptionService, type SubscriptionStorefront } from '../src/services/SubscriptionService';

const purchasesMock = jest.mocked(Purchases);

function product(identifier: string): PurchasesStoreProduct {
  return {
    identifier,
    priceString: '$4.99',
  } as PurchasesStoreProduct;
}

function customerInfo(activeEntitlements: Record<string, { isActive: boolean }>): CustomerInfo {
  return {
    entitlements: {
      active: activeEntitlements,
    },
  } as unknown as CustomerInfo;
}

function storefront(
  monthly: PurchasesStoreProduct | null,
  yearly: PurchasesStoreProduct | null
): SubscriptionStorefront {
  return {
    offering: null,
    packages: { monthly: null, yearly: null },
    products: { monthly, yearly },
  };
}

describe('subscription and paywall policy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('one returned SKU is enough for a usable paywall', () => {
    const monthlyOnly = storefront(product('basecalc_hvac_pro_monthly'), null);
    const yearlyOnly = storefront(null, product('basecalc_hvac_pro_yearly'));

    expect(SubscriptionService.isStorefrontReady(monthlyOnly)).toBe(true);
    expect(SubscriptionService.isPlanAvailable(monthlyOnly, 'monthly')).toBe(true);
    expect(SubscriptionService.isPlanAvailable(monthlyOnly, 'yearly')).toBe(false);
    expect(SubscriptionService.selectAvailablePlan(monthlyOnly, 'yearly')).toBe('monthly');
    expect(SubscriptionService.selectAvailablePlan(yearlyOnly, 'monthly')).toBe('yearly');
    expect(SubscriptionService.selectAvailablePlan(storefront(null, null), 'yearly')).toBeNull();
  });

  test('only the configured active Pro entitlement unlocks access', () => {
    expect(SubscriptionService.checkProEntitlement(customerInfo({ pro: { isActive: true } }))).toBe(true);
    expect(SubscriptionService.checkProEntitlement(customerInfo({ pro: { isActive: false } }))).toBe(false);
    expect(SubscriptionService.checkProEntitlement(customerInfo({ unrelated: { isActive: true } }))).toBe(false);
  });

  test('forced status checks invalidate cached customer info first', async () => {
    purchasesMock.invalidateCustomerInfoCache.mockResolvedValueOnce();
    purchasesMock.getCustomerInfo.mockResolvedValueOnce(customerInfo({ pro: { isActive: true } }));

    await expect(SubscriptionService.checkStatus({ forceRefresh: true })).resolves.toBe(true);

    expect(purchasesMock.invalidateCustomerInfoCache).toHaveBeenCalledTimes(1);
    expect(purchasesMock.getCustomerInfo).toHaveBeenCalledTimes(1);
    expect(purchasesMock.invalidateCustomerInfoCache.mock.invocationCallOrder[0])
      .toBeLessThan(purchasesMock.getCustomerInfo.mock.invocationCallOrder[0]);
  });

  test('can purchase the selected plan when only its direct store product exists', async () => {
    const monthlyProduct = product('basecalc_hvac_pro_monthly');
    purchasesMock.getOfferings.mockResolvedValueOnce({ current: null, all: {} } as PurchasesOfferings);
    purchasesMock.getProducts.mockResolvedValueOnce([monthlyProduct]);
    purchasesMock.purchaseStoreProduct.mockResolvedValueOnce({
      customerInfo: customerInfo({ pro: { isActive: true } }),
    } as MakePurchaseResult);

    await expect(SubscriptionService.purchase('monthly')).resolves.toBe(true);

    expect(purchasesMock.purchaseStoreProduct).toHaveBeenCalledWith(monthlyProduct);
    expect(purchasesMock.purchasePackage).not.toHaveBeenCalled();
  });

  test('rejects legacy package slots whose products do not match configured SKUs', async () => {
    const legacyPackage = {
      identifier: '$rc_monthly',
      product: product('legacy_hvac_monthly'),
    } as PurchasesPackage;
    const legacyOffering = {
      identifier: 'legacy',
      availablePackages: [legacyPackage],
      monthly: legacyPackage,
      annual: null,
    } as unknown as PurchasesOfferings['current'];
    const configuredProduct = product('basecalc_hvac_pro_monthly');
    purchasesMock.getOfferings.mockResolvedValueOnce({
      current: legacyOffering,
      all: { legacy: legacyOffering },
    } as PurchasesOfferings);
    purchasesMock.getProducts.mockResolvedValueOnce([configuredProduct]);

    const result = await SubscriptionService.getStorefront();

    expect(result.offering).toBeNull();
    expect(result.packages.monthly).toBeNull();
    expect(result.products.monthly).toBe(configuredProduct);
  });
});
