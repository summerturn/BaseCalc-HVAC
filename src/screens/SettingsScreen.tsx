import { type ComponentProps, useState } from 'react';
import { Pressable, View, useWindowDimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAppStore } from '../store/useAppStore';
import { useAppTheme, useColors } from '../theme/useAppTheme';
import type { ThemeMode } from '../theme/appTheme';
import { isRevenueCatConfigured } from '../lib/config';
import { Body, Label, Mono, Small } from '../components/Type';
import {
  CONTROL_GAP,
  Field,
  ListScreenHeader,
  ListScreenScrollView,
  Panel,
  PrimaryButton,
  Screen,
  SECTION_GAP,
  useBottomClearance,
  withAlpha,
} from '../components/ui';
import { FooterAdBanner } from '../components/AdBanner';

type IconName = ComponentProps<typeof MaterialIcons>['name'];

const THEME_CHOICES: { value: ThemeMode; label: string; icon: IconName }[] = [
  { value: 'system', label: 'Auto', icon: 'brightness-auto' },
  { value: 'light', label: 'Light', icon: 'light-mode' },
  { value: 'dark', label: 'Dark', icon: 'dark-mode' },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: SECTION_GAP }}>
      <Label style={{ marginBottom: 10 }}>{title}</Label>
      {children}
    </View>
  );
}

export function SettingsScreen() {
  const navigation = useNavigation<any>();
  const { company, updateCompany, isPro } = useAppStore();
  const { themeMode, setThemeMode } = useAppTheme();
  const c = useColors();
  const { width } = useWindowDimensions();
  const bottomClearance = useBottomClearance();
  const [form, setForm] = useState({ ...company });
  const [saved, setSaved] = useState(false);
  const stackLocationFields = width < 360;
  const purchasesEnabled = isRevenueCatConfigured();

  const handleSave = () => {
    updateCompany(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };

  return (
    <Screen>
      <ListScreenScrollView bottomPadding={bottomClearance}>
        <ListScreenHeader title="Settings" />

        {purchasesEnabled ? (
          <Section title="Plan">
            <Panel>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flex: 1, paddingRight: 14 }}>
                  <Body tone="primary">{isPro ? 'Pro plan' : 'Free plan'}</Body>
                  <Small tone="muted" style={{ marginTop: 4 }}>
                    {isPro ? 'Ads are hidden and Pro limits are unlocked on this device.' : 'Upgrade to remove ads and unlock the full local workflow.'}
                  </Small>
                </View>
                <MaterialIcons name={isPro ? 'workspace-premium' : 'person-outline'} size={24} color={isPro ? c.amber : c.textMuted} />
              </View>
              {!isPro ? (
                <PrimaryButton label="Go Pro" icon="workspace-premium" onPress={() => navigation.navigate('Paywall')} style={{ marginTop: 14 }} />
              ) : null}
            </Panel>
          </Section>
        ) : null}

        <Section title="Appearance">
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {THEME_CHOICES.map((opt) => {
              const active = themeMode === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => setThemeMode(opt.value)}
                  style={({ pressed }) => ({
                    flex: 1,
                    alignItems: 'center',
                    paddingVertical: 16,
                    borderRadius: 16,
                    borderWidth: 1,
                    backgroundColor: active ? c.amberSoft : c.panel,
                    borderColor: active ? withAlpha(c.amberBright, 0.5) : c.border,
                    opacity: pressed ? 0.8 : 1,
                  })}
                >
                  <MaterialIcons name={opt.icon} size={24} color={active ? c.amber : c.textMuted} />
                  <Label tone={active ? 'amber' : 'muted'} style={{ marginTop: 9 }}>{opt.label}</Label>
                </Pressable>
              );
            })}
          </View>
        </Section>

        <Section title="Company (on job worksheets)">
          <Panel>
            <Field label="Company name" value={form.name} onChangeText={(t) => setForm({ ...form, name: t })} placeholder="My HVAC Co." />
            <Field label="Address" value={form.address} onChangeText={(t) => setForm({ ...form, address: t })} placeholder="123 Main St" />
            <Field label="City" value={form.city} onChangeText={(t) => setForm({ ...form, city: t })} />
            <View style={{ flexDirection: stackLocationFields ? 'column' : 'row', gap: CONTROL_GAP }}>
              <Field label="State" value={form.state} onChangeText={(t) => setForm({ ...form, state: t })} maxLength={2} autoCapitalize="characters" style={{ flex: 1, marginBottom: 0 }} />
              <Field label="ZIP" value={form.zip} onChangeText={(t) => setForm({ ...form, zip: t })} keyboardType="numeric" style={{ flex: stackLocationFields ? undefined : 1.4, marginBottom: 0 }} />
            </View>
            <Field label="Phone" value={form.phone} onChangeText={(t) => setForm({ ...form, phone: t })} keyboardType="phone-pad" placeholder="(555) 123-4567" />
            <Field label="Email" value={form.email} onChangeText={(t) => setForm({ ...form, email: t })} keyboardType="email-address" autoCapitalize="none" placeholder="office@myhvac.co" />
          </Panel>
        </Section>

        <PrimaryButton label={saved ? 'Saved ✓' : 'Save settings'} icon={saved ? undefined : 'save'} onPress={handleSave} />
        <Small style={{ textAlign: 'center', marginTop: 18 }}>BaseCalc HVAC v1.0 · HVAC field reference</Small>
        <Small tone="muted" style={{ textAlign: 'center', marginTop: 10 }}>
          Everything you save in BaseCalc HVAC stays locally on this device, protected by your device security. BaseCalc HVAC does not use cloud sync, and there will not be a cloud option.
        </Small>
        <FooterAdBanner />
      </ListScreenScrollView>
    </Screen>
  );
}
