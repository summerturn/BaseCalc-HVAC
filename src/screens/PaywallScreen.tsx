import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAppStore } from '../store/useAppStore';
import { useColors } from '../theme/useAppTheme';
import { isRevenueCatConfigured } from '../lib/config';
import { Body, Display, H2, Label, Small } from '../components/Type';
import { BackBar, Panel, PrimaryButton, Screen, SecondaryButton, useBottomClearance } from '../components/ui';
import { SubscriptionService } from '../services/SubscriptionService';

const FEATURES = [
  'Unlimited job contacts',
  'Unlimited job worksheets',
  'No ads',
  'Job worksheet PDF export',
  'Full local job history',
  'Priority support',
];

export function PaywallScreen() {
  const navigation = useNavigation<any>();
  const c = useColors();
  const bottomClearance = useBottomClearance();
  const { isPro, setPro } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [offerings, setOfferings] = useState<any>(null);
  const purchasesEnabled = isRevenueCatConfigured();

  useEffect(() => {
    if (!purchasesEnabled) return;
    SubscriptionService.getOfferings().then(setOfferings).catch(() => setOfferings(null));
  }, [purchasesEnabled]);

  if (!purchasesEnabled) {
    return (
      <Screen>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 6, paddingBottom: bottomClearance }} showsVerticalScrollIndicator={false}>
          <BackBar onBack={() => navigation.goBack()} />
          <View style={{ alignItems: 'center', paddingVertical: 52 }}>
            <View style={{ width: 72, height: 72, borderRadius: 22, backgroundColor: c.inset, borderColor: c.border, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <MaterialIcons name="workspace-premium" size={36} color={c.textMuted} />
            </View>
            <Display style={{ textAlign: 'center' }}>Pro coming soon</Display>
            <Body tone="muted" style={{ textAlign: 'center', marginTop: 10, maxWidth: 320 }}>
              This launch build ships the full HVAC calculator and job worksheet workflow first. Ads and paid subscriptions are not enabled yet.
            </Body>
          </View>
        </ScrollView>
      </Screen>
    );
  }

  const purchase = async (plan: 'monthly' | 'yearly') => {
    setLoading(true);
    try {
      const success = await SubscriptionService.purchase(plan);
      if (success) {
        setPro(true);
        Alert.alert('Welcome to Pro', 'Your subscription is active.');
        navigation.goBack();
      }
    } catch (error: any) {
      Alert.alert('Purchase failed', error.message || 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const restore = async () => {
    setLoading(true);
    try {
      const active = await SubscriptionService.restorePurchases();
      setPro(active);
      if (active) {
        Alert.alert('Restored', 'Your Pro subscription is active.');
        navigation.goBack();
      } else {
        Alert.alert('No subscription found', 'We could not find an active Pro subscription.');
      }
    } catch (error: any) {
      Alert.alert('Restore failed', error.message || 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (isPro) {
    return (
      <Screen>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 6, paddingBottom: bottomClearance }} showsVerticalScrollIndicator={false}>
          <BackBar onBack={() => navigation.goBack()} />
          <View style={{ alignItems: 'center', paddingVertical: 60 }}>
            <View style={{ width: 72, height: 72, borderRadius: 22, backgroundColor: c.passBg, borderColor: c.passBorder, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
              <MaterialIcons name="workspace-premium" size={36} color={c.pass} />
            </View>
            <H2>You're on Pro</H2>
            <Body tone="muted" style={{ textAlign: 'center', marginTop: 8, maxWidth: 280 }}>
              Ads are hidden and the full local workflow is active on this device.
            </Body>
          </View>
        </ScrollView>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 6, paddingBottom: bottomClearance }} showsVerticalScrollIndicator={false}>
        <BackBar onBack={() => navigation.goBack()} />
        <View style={{ alignItems: 'center', marginBottom: 22 }}>
          <View style={{ width: 72, height: 72, borderRadius: 22, backgroundColor: c.amberSoft, borderColor: c.amberBright, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
            <MaterialIcons name="workspace-premium" size={36} color={c.amber} />
          </View>
          <Display style={{ textAlign: 'center' }}>Go Pro</Display>
          <Body tone="muted" style={{ textAlign: 'center', marginTop: 8 }}>
            Remove ads and unlock the full local field workflow.
          </Body>
        </View>

        <View style={{ gap: 12, marginBottom: 20 }}>
          {FEATURES.map((feature, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <MaterialIcons name="check-circle" size={20} color={c.pass} />
              <Body tone="primary">{feature}</Body>
            </View>
          ))}
        </View>

        <Panel style={{ marginBottom: 12 }}>
          <Pressable onPress={() => purchase('monthly')} disabled={loading}>
            {({ pressed }) => (
              <View style={{ opacity: pressed ? 0.8 : 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View>
                    <H2 style={{ fontSize: 18 }}>Monthly</H2>
                    <Small tone="muted">Cancel anytime</Small>
                  </View>
                  <H2 style={{ fontSize: 24, color: c.amberBright }}>$9.99/mo</H2>
                </View>
                <PrimaryButton label="Subscribe monthly" icon="workspace-premium" loading={loading} onPress={() => purchase('monthly')} style={{ marginTop: 14 }} />
              </View>
            )}
          </Pressable>
        </Panel>

        <Panel style={{ marginBottom: 12, borderColor: c.amberBright }}>
          <View style={{ position: 'absolute', top: -12, alignSelf: 'center', backgroundColor: c.amberBright, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4 }}>
            <Label style={{ color: c.onAmber }}>BEST VALUE</Label>
          </View>
          <Pressable onPress={() => purchase('yearly')} disabled={loading}>
            {({ pressed }) => (
              <View style={{ opacity: pressed ? 0.8 : 1, paddingTop: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View>
                    <H2 style={{ fontSize: 18 }}>Yearly</H2>
                    <Small tone="muted">Save ~17%</Small>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <H2 style={{ fontSize: 24, color: c.amberBright }}>$99/yr</H2>
                    <Small tone="muted">$8.25/mo equivalent</Small>
                  </View>
                </View>
                <PrimaryButton label="Subscribe yearly" icon="workspace-premium" loading={loading} onPress={() => purchase('yearly')} style={{ marginTop: 14 }} />
              </View>
            )}
          </Pressable>
        </Panel>

        <SecondaryButton label="Restore purchases" icon="restore" onPress={restore} />

        <Small tone="muted" style={{ textAlign: 'center', marginTop: 20 }}>
          Subscriptions auto-renew until cancelled. Manage them in your App Store or Google Play account settings.
        </Small>
      </ScrollView>
    </Screen>
  );
}
