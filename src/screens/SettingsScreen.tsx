import { type ComponentProps, useState } from 'react';
import { Alert, Pressable, View, useWindowDimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation, type NavigationProp, type ParamListBase } from '@react-navigation/native';
import { useAppStore } from '../store/useAppStore';
import { BackupService, type BackupData } from '../services/BackupService';
import { useAppTheme, useColors } from '../theme/useAppTheme';
import type { ThemeMode } from '../theme/appTheme';
import { Body, Label, Mono, Small } from '../components/Type';
import {
  CONTROL_GAP,
  Field,
  FooterContentSpacer,
  ListScreenHeader,
  ListScreenScrollView,
  Panel,
  PrimaryButton,
  Screen,
  SECTION_GAP,
  useBottomClearance,
  withAlpha,
} from '../components/ui';

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
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { company, updateCompany, restoreLocalData, isPro } = useAppStore();
  const { themeMode, setThemeMode } = useAppTheme();
  const c = useColors();
  const { width } = useWindowDimensions();
  const bottomClearance = useBottomClearance();
  const [form, setForm] = useState({ ...company });
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const stackLocationFields = width < 360;

  const handleSave = () => {
    updateCompany(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };

  const exportBackup = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await BackupService.export();
    } catch (error) {
      Alert.alert('Export failed', error instanceof Error ? error.message : 'Could not export the backup.');
    } finally {
      setBusy(false);
    }
  };

  const restoreBackup = async () => {
    if (busy) return;
    setBusy(true);
    let awaitingConfirmation = false;
    try {
      const backup: BackupData | null = await BackupService.pickAndValidate();
      if (!backup) return;
      awaitingConfirmation = true;
      let decisionSelected = false;
      Alert.alert('Replace local records?', `This backup contains ${backup.clients.length} contacts, ${backup.invoices.length} worksheets, and ${backup.calculations.length} calculations. It will replace the current local records. Subscription access stays linked to your store account.`, [
        { text: 'Cancel', style: 'cancel', onPress: () => {
          decisionSelected = true;
          setBusy(false);
        } },
        { text: 'Replace records', style: 'destructive', onPress: async () => {
          decisionSelected = true;
          try {
            await restoreLocalData(backup);
            setForm({ ...backup.company });
            Alert.alert('Restore complete', 'Local job records have been replaced.');
          } catch {
            Alert.alert('Restore failed', 'Could not save the backup on this device. Current local records were kept.');
          } finally {
            setBusy(false);
          }
        } },
      ], {
        cancelable: true,
        onDismiss: () => {
          if (!decisionSelected) setBusy(false);
        },
      });
    } catch (error) {
      Alert.alert('Restore failed', error instanceof Error ? error.message : 'Could not read the backup.');
    } finally {
      if (!awaitingConfirmation) setBusy(false);
    }
  };

  return (
    <Screen>
      <ListScreenScrollView bottomPadding={bottomClearance}>
        <ListScreenHeader title="Settings" />

        <Section title="Plan">
          <Panel>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flex: 1, paddingRight: 14 }}>
                <Body tone="primary">{isPro ? 'Pro plan' : 'Free plan'}</Body>
                <Small tone="muted" style={{ marginTop: 4 }}>
                  {isPro ? 'All calculators and expanded local record limits are unlocked.' : 'Upgrade to unlock all calculators and expanded local record limits.'}
                </Small>
              </View>
              <MaterialIcons name={isPro ? 'workspace-premium' : 'person-outline'} size={24} color={isPro ? c.amber : c.textMuted} />
            </View>
            {!isPro ? (
              <PrimaryButton label="Go Pro" icon="workspace-premium" onPress={() => navigation.navigate('Paywall')} style={{ marginTop: 14 }} />
            ) : null}
          </Panel>
        </Section>

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
        <Section title="Backup and device transfer">
          <Panel>
            <Body tone="dim" style={{ marginBottom: 12 }}>Export a local JSON backup to a location you choose. Restore replaces contacts, worksheets, calculation history, templates, and company details on this device.</Body>
            <PrimaryButton label={busy ? 'Working…' : 'Export backup'} icon="ios-share" disabled={busy} onPress={exportBackup} />
            <View style={{ marginTop: 10 }}>
              <PrimaryButton label="Restore backup" icon="file-upload" disabled={busy} onPress={restoreBackup} />
            </View>
          </Panel>
        </Section>
        <Small style={{ textAlign: 'center', marginTop: 18 }}>BaseCalc HVAC v1.0 · HVAC field reference</Small>
        <Small tone="muted" style={{ textAlign: 'center', marginTop: 10 }}>
          Job contacts, worksheets, calculations, and company settings use this app's local storage. Subscription status is checked with RevenueCat; exports leave the app only when you choose to share them.
        </Small>
        <FooterContentSpacer />
      </ListScreenScrollView>
    </Screen>
  );
}
