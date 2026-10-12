import { type ComponentProps, useEffect, useRef, useState } from 'react';
import { Alert, Linking, Platform, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { useNavigation, type NavigationProp, type ParamListBase } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { PURCHASES_ERROR_CODE, type PurchasesStoreProduct } from 'react-native-purchases';
import { useAppStore } from '../store/useAppStore';
import { useColors } from '../theme/useAppTheme';
import { isRevenueCatConfigured } from '../lib/config';
import { Body, Display, H2, Label, Small } from '../components/Type';
import {
  BackBar,
  IconTile,
  Panel,
  Pill,
  PrimaryButton,
  Screen,
  SecondaryButton,
  useBottomClearance,
  withAlpha,
} from '../components/ui';
import { SubscriptionService, type SubscriptionStorefront } from '../services/SubscriptionService';

type IconName = ComponentProps<typeof MaterialIcons>['name'];

type AccessSection = {
  title: string;
  subtitle: string;
  icon: IconName;
  accent: string;
  items: string[];
};

type StoreStatus = {
  label: string;
  tone: 'pass' | 'info' | 'fail';
};

const PRIVACY_POLICY_URL = 'https://basemapped.com/basecalc-hvac/privacy-policy';
const TERMS_OF_USE_URL = Platform.select({
  ios: 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/',
  default: 'https://basemapped.com/basecalc-hvac/terms-of-service',
});

const FREE_ACCESS: AccessSection = {
  title: 'Free',
  subtitle: 'Core HVAC math',
  icon: 'air',
  accent: '#38BDF8',
  items: ['BTU to Tons', 'CFM from BTU', 'BTU from CFM', 'Air Velocity'],
};

const PRO_ACCESS: AccessSection = {
  title: 'Pro',
  subtitle: 'Every calculator',
  icon: 'workspace-premium',
  accent: '#FFB020',
  items: [
    'Duct sizing and filters',
    'Psychrometrics and mixed air',
    'Manufacturer-data refrigerant checks',
    'Planning load, hydronics, outdoor airflow',
  ],
};

const PRO_FEATURES = [
  'Unlock every HVAC calculator in the app',
  'Keep the four most-used airflow and capacity checks free',
  'Unlimited local job contacts and open worksheets',
  'Keep local job history, contacts, and worksheets available in the app',
  'Pay once — no recurring charge, ever',
];

function errorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null) {
    const maybeError = error as { code?: string; message?: string };
    const checkoutUnavailableCodes = new Set<string>([
      PURCHASES_ERROR_CODE.STORE_PROBLEM_ERROR,
      PURCHASES_ERROR_CODE.PURCHASE_NOT_ALLOWED_ERROR,
      PURCHASES_ERROR_CODE.PURCHASE_INVALID_ERROR,
      PURCHASES_ERROR_CODE.PRODUCT_NOT_AVAILABLE_FOR_PURCHASE_ERROR,
      PURCHASES_ERROR_CODE.CONFIGURATION_ERROR,
      PURCHASES_ERROR_CODE.UNSUPPORTED_ERROR,
      PURCHASES_ERROR_CODE.SYSTEM_INFO_ERROR,
    ]);

    if (maybeError.code && checkoutUnavailableCodes.has(maybeError.code)) {
      const storeName = Platform.OS === 'ios' ? 'App Store' : 'Google Play';
      return `The ${storeName} checkout could not open for this install. Use a TestFlight/App Store build on iOS or a Google Play-enabled build on Android.`;
    }
  }

  return error instanceof Error && error.message.trim().length > 0
    ? error.message
    : 'Please try again.';
}

function storeUnavailableMessage(): string {
  const storeName = Platform.OS === 'ios' ? 'App Store' : 'Google Play';
  return `The ${storeName} checkout is not available for this install yet. Please use a store-enabled build after Lifetime Pro finishes syncing.`;
}

async function openLegalDocument(url: string): Promise<void> {
  try {
    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      throw new Error('This link is not supported on this device.');
    }
    await Linking.openURL(url);
  } catch (error) {
    console.error('[Paywall] Failed to open legal document:', error);
    Alert.alert('Unable to open link', 'Please try again from a device with an internet connection.');
  }
}

function lifetimeProductFrom(storefront: SubscriptionStorefront | null): PurchasesStoreProduct | null {
  if (!storefront) return null;
  return storefront.packages.lifetime?.product ?? storefront.products.lifetime;
}

function AccessPanel({ section, compact }: { section: AccessSection; compact: boolean }) {
  return (
    <Panel
      style={{
        flex: compact ? undefined : 1,
        width: compact ? '100%' : undefined,
        padding: compact ? 14 : 16,
        borderColor: withAlpha(section.accent, 0.34),
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: compact ? 9 : 11, marginBottom: compact ? 10 : 12 }}>
        <IconTile icon={section.icon} color={section.accent} size={compact ? 36 : 42} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <H2 numberOfLines={1}>{section.title}</H2>
          <Small tone="muted" numberOfLines={1}>{section.subtitle}</Small>
        </View>
      </View>
      <View style={{ gap: compact ? 7 : 9 }}>
        {section.items.map((item) => (
          <View key={item} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
            <MaterialIcons name="check-circle" size={compact ? 16 : 17} color={section.accent} style={{ marginTop: 2 }} />
            <Small tone="primary" style={{ flex: 1, fontSize: compact ? 12.5 : undefined, lineHeight: compact ? 18 : undefined }}>
              {item}
            </Small>
          </View>
        ))}
      </View>
    </Panel>
  );
}

function LifetimeCard({ price, available, compact }: { price: string; available: boolean; compact: boolean }) {
  const c = useColors();
  return (
    <Panel
      style={{
        borderColor: available ? c.amberBright : c.border,
        backgroundColor: available ? withAlpha(c.amberBright, c.mode === 'dark' ? 0.09 : 0.12) : c.panel,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 5 }}>
            <MaterialIcons name="workspace-premium" size={20} color={available ? c.amberBright : c.textMuted} />
            <H2 numberOfLines={1}>Lifetime Pro</H2>
          </View>
          <Small tone="muted">Pay once. Every calculator, forever.</Small>
        </View>
        <Pill label={available ? 'PAY ONCE' : 'UNAVAILABLE'} tone={available ? 'amber' : 'neutral'} />
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 5, marginTop: 15 }}>
        <Display style={{ fontSize: compact ? 28 : 32, lineHeight: compact ? 36 : 40 }}>{price}</Display>
        <Label tone="muted" style={{ marginBottom: 7 }}>one time</Label>
      </View>
      <Small tone="muted" style={{ marginTop: 2 }}>No subscription. No renewal. Ever.</Small>
    </Panel>
  );
}

export function PaywallScreen() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const c = useColors();
  const bottomClearance = useBottomClearance();
  const { width } = useWindowDimensions();
  const compact = width < 390;
  const { isPro, setPro } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [storefront, setStorefront] = useState<SubscriptionStorefront | null>(null);
  const [offeringsChecked, setOfferingsChecked] = useState(false);
  const operationInFlight = useRef(false);
  const purchasesEnabled = isRevenueCatConfigured();
  const lifetimeProduct = lifetimeProductFrom(storefront);
  const lifetimeAvailable = lifetimeProduct !== null;
  const lifetimePrice = lifetimeProduct?.priceString ?? 'Unavailable';
  const checkoutLoading = purchasesEnabled && !offeringsChecked;
  const storeStatus: StoreStatus = !purchasesEnabled
    ? { label: 'Store setup needed', tone: 'fail' }
    : checkoutLoading
      ? { label: 'Checking store', tone: 'info' }
      : lifetimeAvailable
        ? { label: 'Store checkout', tone: 'pass' }
        : { label: 'Store products unavailable', tone: 'fail' };

  useEffect(() => {
    let cancelled = false;

    async function loadStorefront() {
      if (!purchasesEnabled) {
        setStorefront(null);
        setOfferingsChecked(true);
        return;
      }

      try {
        const currentStorefront = await SubscriptionService.getStorefront();
        if (!cancelled) {
          setStorefront(currentStorefront);
          setOfferingsChecked(true);
        }
      } catch (error) {
        console.error('[Paywall] Failed to load storefront:', error);
        if (!cancelled) {
          setStorefront(null);
          setOfferingsChecked(true);
        }
      }
    }

    loadStorefront();
    return () => {
      cancelled = true;
    };
  }, [purchasesEnabled]);

  const beginStoreOperation = () => {
    if (operationInFlight.current) return false;
    operationInFlight.current = true;
    setLoading(true);
    return true;
  };

  const endStoreOperation = () => {
    operationInFlight.current = false;
    setLoading(false);
  };

  const closePaywall = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  const purchase = async () => {
    if (!purchasesEnabled) {
      Alert.alert(
        'Store checkout unavailable',
        storeUnavailableMessage()
      );
      return;
    }
    if (!lifetimeAvailable) {
      Alert.alert('Lifetime Pro unavailable', 'Lifetime Pro was not returned by the store. Try again later.');
      return;
    }
    if (!beginStoreOperation()) return;
    try {
      const success = await SubscriptionService.purchase('lifetime');
      if (success) {
        setPro(true);
        Alert.alert('Welcome to Pro', 'Every BaseCalc HVAC calculator is unlocked on this device, for life.');
        closePaywall();
      }
    } catch (error) {
      Alert.alert('Purchase failed', errorMessage(error));
    } finally {
      endStoreOperation();
    }
  };

  const restore = async () => {
    if (!purchasesEnabled) {
      Alert.alert(
        'Store checkout unavailable',
        storeUnavailableMessage()
      );
      return;
    }

    if (!beginStoreOperation()) return;
    try {
      const active = await SubscriptionService.restorePurchases();
      setPro(active);
      if (active) {
        Alert.alert('Restored', 'Your BaseCalc HVAC Pro access is active.');
        closePaywall();
      } else {
        Alert.alert('No purchase found', 'We could not find an active BaseCalc HVAC Pro purchase or subscription for this account.');
      }
    } catch (error) {
      Alert.alert('Restore failed', errorMessage(error));
    } finally {
      endStoreOperation();
    }
  };

  if (isPro) {
    return (
      <Screen>
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={{ paddingHorizontal: compact ? 16 : 20, paddingTop: 6, paddingBottom: bottomClearance + 18 }}
          showsVerticalScrollIndicator={false}
        >
          <BackBar onBack={closePaywall} />
          <View style={{ alignItems: 'center', paddingVertical: 34 }}>
            <View style={{ width: 78, height: 78, borderRadius: 24, backgroundColor: c.passBg, borderColor: c.passBorder, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
              <MaterialIcons name="workspace-premium" size={38} color={c.pass} />
            </View>
            <Display style={{ textAlign: 'center' }}>Pro is active</Display>
            <Body tone="muted" style={{ textAlign: 'center', marginTop: 8, maxWidth: 320 }}>
              Every HVAC calculator and the expanded local record limits are unlocked on this device.
            </Body>
          </View>
        </ScrollView>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ paddingHorizontal: compact ? 16 : 20, paddingTop: 6, paddingBottom: bottomClearance + 18 }}
        showsVerticalScrollIndicator={false}
      >
        <BackBar onBack={closePaywall} />

        <Panel elevated style={{ marginBottom: 14, padding: compact ? 14 : 16, borderColor: withAlpha(c.amberBright, 0.38) }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: compact ? 10 : 16 }}>
            <IconTile icon="device-thermostat" color={c.amberBright} size={compact ? 44 : 56} />
            <Pill label={storeStatus.label} tone={storeStatus.tone} />
          </View>
          <Display style={{ textAlign: 'left', fontSize: compact ? 24 : undefined, lineHeight: compact ? 32 : undefined }}>
            BaseCalc HVAC Pro
          </Display>
          <Body tone="muted" style={{ marginTop: 8, fontSize: compact ? 14.5 : undefined, lineHeight: compact ? 22 : undefined }}>
            Pay once. Unlock the full job-site calculator set for good.
          </Body>
        </Panel>

        <View style={{ marginBottom: 14 }}>
          <LifetimeCard price={lifetimePrice} available={lifetimeAvailable} compact={compact} />
        </View>

        <PrimaryButton
          label={loading ? `Opening ${Platform.OS === 'ios' ? 'App Store' : 'Google Play'}` : lifetimeAvailable ? `Get Lifetime Pro — ${lifetimePrice}` : 'Lifetime Pro unavailable'}
          icon="workspace-premium"
          loading={loading}
          disabled={loading || !lifetimeAvailable}
          onPress={purchase}
        />

        <View style={{ flexDirection: 'row', marginTop: 12 }}>
          <SecondaryButton label="Restore purchases" icon="restore" disabled={loading} onPress={restore} />
        </View>

        <Small tone="muted" style={{ textAlign: 'center', marginTop: 14 }}>
          Already have a BaseCalc HVAC Pro subscription? Tap Restore purchases — your active monthly or yearly subscription still unlocks Pro and keeps renewing as before.
        </Small>

        <Small tone="muted" style={{ textAlign: 'center', marginTop: 12 }}>
          Lifetime Pro is a one-time payment charged once to your store account. It never renews and cannot expire. Manage past purchases in your App Store or Google Play account settings.
        </Small>

        <View style={{ flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', columnGap: 16, rowGap: 8, marginTop: 10 }}>
          <Pressable accessibilityRole="link" onPress={() => void openLegalDocument(PRIVACY_POLICY_URL)}>
            <Small tone="primary" style={{ textDecorationLine: 'underline' }}>Privacy Policy</Small>
          </Pressable>
          <Pressable accessibilityRole="link" onPress={() => void openLegalDocument(TERMS_OF_USE_URL)}>
            <Small tone="primary" style={{ textDecorationLine: 'underline' }}>Terms of Use (EULA)</Small>
          </Pressable>
        </View>

        <View style={{ flexDirection: compact ? 'column' : 'row', gap: 12, marginTop: 18, marginBottom: 14 }}>
          <AccessPanel section={FREE_ACCESS} compact={compact} />
          <AccessPanel section={PRO_ACCESS} compact={compact} />
        </View>

        <Panel style={{ marginBottom: 14 }}>
          <Label tone="amber" style={{ marginBottom: 10 }}>Included with Pro</Label>
          <View style={{ gap: 10 }}>
            {PRO_FEATURES.map((feature) => (
              <View key={feature} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 9 }}>
                <MaterialIcons name="done" size={19} color={c.pass} style={{ marginTop: 2 }} />
                <Body tone="primary" style={{ flex: 1 }}>{feature}</Body>
              </View>
            ))}
          </View>
        </Panel>
      </ScrollView>
    </Screen>
  );
}
