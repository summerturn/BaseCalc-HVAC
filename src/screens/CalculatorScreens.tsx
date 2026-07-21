import { type ComponentProps, useState } from 'react';
import { Alert, Image, Platform, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import {
  HAVACEngine,
  MetricResult,
  RefrigerantType,
} from '../engine/HAVACEngine';
import { useAppStore } from '../store/useAppStore';
import { CATEGORY } from '../theme/appTheme';
import { useColors } from '../theme/useAppTheme';
import { Fonts } from '../theme/typography';
import { Body, Display, H1, H2, Label, Mono, Small } from '../components/Type';
import {
  BackBar,
  Field,
  FooterContentSpacer,
  FormScrollView,
  IconTile,
  MetricReadout,
  Panel,
  Pill,
  PrimaryButton,
  SCREEN_H_PAD,
  SCREEN_TOP_PAD,
  Screen,
  Segmented,
  TABLET_BREAKPOINT,
  useBottomClearance,
  withAlpha,
} from '../components/ui';

type IconName = ComponentProps<typeof MaterialIcons>['name'];
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const optionalNumber = (value: string): number | undefined =>
  value.trim() === '' ? undefined : Number(value);
const requiredNumber = (value: string): number =>
  value.trim() === '' ? Number.NaN : Number(value);
const SIGNED_DECIMAL_KEYBOARD = Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'numeric';
const BRAND_ICON = require('../../assets/icon.png');

type CalcDef = {
  key: string;
  title: string;
  subtitle: string;
  icon: IconName;
  code: string;
  route: string;
  color: string;
  proOnly?: boolean;
};

const CALCS: CalcDef[] = [
  { key: 'btu-tons', title: 'BTU ↔ Tons', subtitle: 'Capacity conversion', icon: 'whatshot', code: '12,000 BTU/ton', route: 'BtuTons', color: CATEGORY.load },
  { key: 'cfm-btu', title: 'Sensible CFM', subtitle: 'Standard-air estimate', icon: 'air', code: 'CFM = Qs ÷ (1.08 × ΔT)', route: 'CfmFromBtu', color: CATEGORY.airflow },
  { key: 'btu-cfm', title: 'Sensible Heat', subtitle: 'Standard-air estimate', icon: 'thermostat', code: 'Qs = CFM × 1.08 × ΔT', route: 'BtuFromCfm', color: CATEGORY.airflow },
  { key: 'velocity', title: 'Air Velocity', subtitle: 'FPM from CFM', icon: 'speed', code: 'V = CFM ÷ A', route: 'AirVelocity', color: CATEGORY.airflow },
  { key: 'duct', title: 'Duct Sizing', subtitle: 'Round & rectangular', icon: 'line-weight', code: 'Area = CFM ÷ V', route: 'DuctSizing', color: CATEGORY.duct, proOnly: true },
  { key: 'psych', title: 'Psychrometrics', subtitle: 'Total / sensible / latent', icon: 'water-drop', code: '4.5 × CFM × Δh', route: 'Psychrometrics', color: CATEGORY.psychrometrics, proOnly: true },
  { key: 'lines', title: 'Refrigerant Lines', subtitle: 'Manufacturer data check', icon: 'linear-scale', code: 'Equivalent length check', route: 'RefrigerantLines', color: CATEGORY.refrigerant, proOnly: true },
  { key: 'sh-sc', title: 'Superheat / Subcool', subtitle: 'Manufacturer target', icon: 'device-thermostat', code: 'Record target', route: 'SuperheatSubcool', color: CATEGORY.refrigerant, proOnly: true },
  { key: 'room-load', title: 'Room Load', subtitle: 'Area-factor planning', icon: 'room', code: 'Not Manual J', route: 'RoomLoad', color: CATEGORY.load, proOnly: true },
  { key: 'hp-balance', title: 'Heat Pump Balance', subtitle: 'Balance point', icon: 'balance', code: 'Capacity vs loss', route: 'HeatPumpBalance', color: CATEGORY.load, proOnly: true },
  { key: 'hydronics', title: 'Hydronics', subtitle: 'BTU · GPM · ΔT', icon: 'water', code: 'Q = 500 × GPM × ΔT', route: 'Hydronics', color: CATEGORY.hydronics, proOnly: true },
  { key: 'mixed-air', title: 'Mixed Air', subtitle: 'OA + RA blend', icon: 'compare-arrows', code: 'MAT blend', route: 'MixedAir', color: CATEGORY.airflow, proOnly: true },
  { key: 'ach', title: 'Air Changes', subtitle: 'ACH from CFM', icon: 'cached', code: 'ACH = CFM × 60 ÷ V', route: 'AirChanges', color: CATEGORY.airflow, proOnly: true },
  { key: 'evap', title: 'Evaporative Cooling', subtitle: 'Supply DB & sensible', icon: 'opacity', code: 'Air-side estimate', route: 'EvaporativeCooling', color: CATEGORY.efficiency, proOnly: true },
  { key: 'filter', title: 'Filter Velocity', subtitle: 'Face velocity only', icon: 'filter-alt', code: 'V = CFM ÷ A', route: 'FilterVelocity', color: CATEGORY.duct, proOnly: true },
  { key: 'combustion', title: 'O₂ Excess Air', subtitle: 'Dilution estimate only', icon: 'fireplace', code: 'O₂ ÷ (20.9 − O₂)', route: 'CombustionAnalysis', color: CATEGORY.general, proOnly: true },
  { key: 'charge', title: 'Refrigerant Weight', subtitle: 'Manufacturer charge rate', icon: 'scale', code: 'Additional oz', route: 'RefrigerantWeight', color: CATEGORY.refrigerant, proOnly: true },
  { key: 'economizer', title: 'Outdoor Airflow', subtitle: 'Supplied-rate Vbz', icon: 'cloud', code: 'Vbz = Rp×Pz + Ra×Az', route: 'Economizer', color: CATEGORY.airflow, proOnly: true },
];

function chunk<T>(arr: T[], size: number): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < arr.length; i += size) rows.push(arr.slice(i, i + size));
  return rows;
}

// ─── Dashboard ───────────────────────────────────────────────────────

function CalcCard({
  calc,
  featured,
  onPress,
  compact,
  large,
  cardWidth,
  cardHeight,
  locked,
}: {
  calc: CalcDef;
  featured?: boolean;
  onPress: () => void;
  compact?: boolean;
  large?: boolean;
  cardWidth: number;
  cardHeight?: number;
  locked?: boolean;
}) {
  const c = useColors();
  const contentColumnWidth = Math.max(96, Math.min(cardWidth - 28, large ? 170 : compact ? 118 : 136));
  const showProText = Boolean(locked && !compact && cardWidth >= 176);
  const badgeSide = compact ? 26 : 28;
  const base = {
    backgroundColor: c.panel,
    borderColor: c.border,
    borderWidth: 1,
    borderRadius: 20,
    overflow: 'hidden' as const,
    shadowColor: c.shadow,
    shadowOpacity: c.mode === 'dark' ? 0.4 : 0.13,
    shadowRadius: c.mode === 'dark' ? 16 : 13,
    shadowOffset: { width: 0, height: c.mode === 'dark' ? 8 : 6 },
  };

  if (featured) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [base, { opacity: pressed ? 0.9 : 1 }]}>
        <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 5, backgroundColor: calc.color }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 18, paddingLeft: 22, paddingRight: 18 }}>
          <IconTile icon={calc.icon} color={calc.color} size={56} />
          <View style={{ flex: 1, marginLeft: 16 }}>
            <Label tone="amber" style={{ marginBottom: 5 }}>{calc.code}</Label>
            <H1 style={{ fontSize: 22 }} numberOfLines={1}>{calc.title}</H1>
            <Small style={{ marginTop: 3 }} numberOfLines={1}>{calc.subtitle}</Small>
          </View>
          <MaterialIcons name="arrow-forward" size={22} color={c.textMuted} />
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        base,
        {
          width: cardWidth,
          height: cardHeight,
          justifyContent: 'space-between',
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <View style={{ height: large ? 5 : 4, backgroundColor: calc.color, borderTopLeftRadius: 20, borderTopRightRadius: 20, width: '100%' }} />
      <View
        style={{
          paddingHorizontal: large ? 22 : compact ? 14 : 16,
          paddingTop: large ? 22 : compact ? 13 : 14,
          paddingBottom: large ? 22 : compact ? 14 : 16,
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <View style={{ width: contentColumnWidth, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' }}>
          <IconTile icon={calc.icon} color={calc.color} size={large ? 60 : compact ? 42 : 44} />
          <View style={{ marginTop: large ? 16 : 12, width: '100%', alignItems: 'center' }}>
            <H2
              style={{ fontSize: large ? 21 : compact ? 15 : 16, textAlign: 'center', width: '100%' }}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.9}
            >
              {calc.title}
            </H2>
            <Small
              style={{ fontSize: large ? 14 : undefined, marginTop: large ? 6 : 4, textAlign: 'center', width: '100%' }}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.92}
            >
              {calc.subtitle}
            </Small>
          </View>
          <Label tone="muted" style={{ marginTop: large ? 14 : 10, textAlign: 'center', width: '100%' }} numberOfLines={1}>
            {calc.code}
          </Label>
        </View>
      </View>
      {locked ? (
        <View
          style={{
            position: 'absolute',
            top: compact ? 7 : 10,
            right: compact ? 7 : 10,
            width: showProText ? undefined : badgeSide,
            minWidth: showProText ? undefined : badgeSide,
            height: showProText ? undefined : badgeSide,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: showProText ? 4 : 0,
            backgroundColor: c.amberSoft,
            borderColor: withAlpha(c.amberBright, 0.55),
            borderWidth: 1,
            borderRadius: 999,
            paddingHorizontal: showProText ? 8 : 0,
            paddingVertical: showProText ? 4 : 0,
          }}
        >
          <MaterialIcons name="lock" size={showProText ? 12 : 14} color={c.amberBright} />
          {showProText ? <Label tone="amber" style={{ fontSize: 10 }}>PRO</Label> : null}
        </View>
      ) : null}
    </Pressable>
  );
}

function BrandLockup({ compact }: { compact: boolean }) {
  const c = useColors();
  const iconSize = compact ? 66 : 74;
  const wordmarkSize = compact ? 31 : 35;
  const wordmarkLineHeight = compact ? 40 : 44;
  const subtitleSize = compact ? 13 : 14;

  return (
    <View style={{ width: '100%', alignItems: 'center' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', maxWidth: '100%' }}>
        <Image source={BRAND_ICON} style={{ width: iconSize, height: iconSize, borderRadius: compact ? 18 : 20 }} resizeMode="cover" />
        <View style={{ flexShrink: 1, minWidth: 0, justifyContent: 'center', marginLeft: compact ? 12 : 14, paddingRight: 2 }}>
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.84}
            style={{
              fontFamily: Fonts.display,
              fontSize: wordmarkSize,
              lineHeight: wordmarkLineHeight,
              letterSpacing: 0.2,
              color: c.text,
            }}
          >
            <Text style={{ color: c.text }}>BASE</Text>
            <Text style={{ color: c.amberBright }}>CALC</Text>
          </Text>
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.92}
            style={{
              marginTop: 2,
              fontFamily: Fonts.heading,
              fontSize: subtitleSize,
              lineHeight: subtitleSize + 6,
              letterSpacing: compact ? 1.5 : 1.8,
              textTransform: 'uppercase',
              color: c.textMuted,
            }}
          >
            HVAC
          </Text>
        </View>
      </View>
    </View>
  );
}

export function CalculatorDashboardScreen({ navigation }: { navigation: { navigate: (s: string) => void } }) {
  const c = useColors();
  const { isPro } = useAppStore();
  const { width } = useWindowDimensions();
  const bottomClearance = useBottomClearance();
  const isTablet = width >= TABLET_BREAKPOINT;
  const compact = width < 390;
  const columns = width >= 1180 ? 4 : isTablet ? 3 : 2;
  const cardGap = compact ? 12 : 14;
  const availableGridWidth = Math.max(0, width - SCREEN_H_PAD * 2);
  const cardWidth = Math.floor(
    (availableGridWidth - cardGap * (columns - 1)) / columns
  );
  const gridWidth = cardWidth * columns + cardGap * (columns - 1);
  const rawCardHeight = Math.round(cardWidth * (isTablet ? 1.03 : compact ? 1.18 : 1.12));
  const cardHeight = Math.max(compact ? 168 : 176, Math.min(isTablet ? 230 : 214, rawCardHeight));
  const rows = chunk(CALCS, columns);
  const openCalculator = (calc: CalcDef) => {
    if (calc.proOnly && !isPro) {
      Alert.alert(
        'Pro calculator',
        `${calc.title} is part of BaseCalc HVAC Pro. Upgrade to unlock every HVAC calculator.`,
        [
          { text: 'Not now', style: 'cancel' },
          { text: 'Upgrade', onPress: () => navigation.navigate('Paywall') },
        ]
      );
      return;
    }
    navigation.navigate(calc.route);
  };

  return (
    <Screen>
      <ScrollView
        style={{ flex: 1 }}
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={{ paddingHorizontal: SCREEN_H_PAD, paddingTop: SCREEN_TOP_PAD + 2, paddingBottom: bottomClearance, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ marginTop: 6, marginBottom: 26 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <View style={{ backgroundColor: c.amberSoft, borderColor: withAlpha(c.amberBright, 0.4), borderWidth: 1, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 5 }}>
              <Label tone="amber">HVAC Field Toolkit</Label>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ width: 7, height: 7, borderRadius: 7, backgroundColor: c.pass, shadowColor: c.pass, shadowOpacity: 0.9, shadowRadius: 5 }} />
              <Mono tone="muted" style={{ fontSize: 11 }}>LIVE</Mono>
            </View>
          </View>

          <BrandLockup compact={compact} />
          <Body
            tone="muted"
            style={{
              marginTop: 10,
              alignSelf: 'center',
              maxWidth: compact ? 330 : 390,
              textAlign: 'center',
            }}
          >
            HVAC field math with explicit inputs, assumptions, and equipment-data boundaries.
          </Body>
        </View>

        <View style={{ width: '100%', alignItems: 'center' }}>
          <View style={{ width: gridWidth, maxWidth: '100%' }}>
            {rows.map((row) => (
              <View
                key={row.map((item) => item.key).join('-')}
                style={{
                  flexDirection: 'row',
                  justifyContent: row.length === columns ? 'space-between' : 'center',
                  alignItems: 'center',
                  marginBottom: cardGap,
                  width: '100%',
                }}
              >
                {row.map((calc, index) => (
                  <View
                    key={calc.key}
                    style={row.length === columns || index === 0 ? undefined : { marginLeft: cardGap }}
                  >
                    <CalcCard
                      calc={calc}
                      compact={compact}
                      large={isTablet}
                      cardWidth={cardWidth}
                      cardHeight={cardHeight}
                      locked={Boolean(calc.proOnly && !isPro)}
                      onPress={() => openCalculator(calc)}
                    />
                  </View>
                ))}
              </View>
            ))}
          </View>
        </View>

        <FooterContentSpacer />
      </ScrollView>
    </Screen>
  );
}

// ─── Shared calculator shell ─────────────────────────────────────────

function CalculatorShell({ title, code, children }: { title: string; code?: string; children: React.ReactNode }) {
  const navigation = useNavigation<any>();
  const bottomClearance = useBottomClearance();
  return (
    <Screen>
      <FormScrollView bottomPadding={bottomClearance + 28}>
        <BackBar onBack={() => navigation.goBack()} />
        <View style={{ marginBottom: 18 }}>
          {code ? <Label tone="amber" style={{ marginBottom: 7 }}>{code}</Label> : null}
          <Display>{title}</Display>
        </View>
        {children}
      </FormScrollView>
    </Screen>
  );
}

// ─── BTU ↔ Tons ──────────────────────────────────────────────────────

export function BtuTonsScreen() {
  const { addCalculation } = useAppStore();
  const [btu, setBtu] = useState('');
  const [tons, setTons] = useState('');
  const [result, setResult] = useState<MetricResult | null>(null);

  const calculate = () => {
    const inputs = {
      btu: btu.trim() !== '' ? parseFloat(btu) : undefined,
      tons: tons.trim() !== '' ? parseFloat(tons) : undefined,
    };
    const res = HAVACEngine.btuTons(inputs);
    setResult(res);
    if (res.ok) addCalculation({ type: 'btuTons', inputs, result: res });
  };

  return (
    <CalculatorShell title="BTU ↔ Tons" code="1 ton = 12,000 BTU/hr">
      <Panel>
        <Body tone="muted" style={{ marginBottom: 16 }}>Enter BTU/hr or tons to convert.</Body>
        <Field label="BTU/hr" value={btu} onChangeText={setBtu} keyboardType="numeric" placeholder="—" />
        <Field label="Tons" value={tons} onChangeText={setTons} keyboardType="decimal-pad" placeholder="—" />
        <PrimaryButton label="Convert" icon="whatshot" onPress={calculate} style={{ marginTop: 4 }} />
      </Panel>
      <MetricReadout result={result} accent={CATEGORY.load} />
    </CalculatorShell>
  );
}

// ─── CFM from BTU ────────────────────────────────────────────────────

export function CfmFromBtuScreen() {
  const { addCalculation } = useAppStore();
  const [inputs, setInputs] = useState({ btu: 24000, deltaT: 20 });
  const [result, setResult] = useState<MetricResult | null>(null);

  const calculate = () => {
    const res = HAVACEngine.cfmFromBtu(inputs);
    setResult(res);
    if (res.ok) addCalculation({ type: 'cfmFromBtu', inputs, result: res });
  };

  return (
    <CalculatorShell title="Sensible CFM" code="Near-sea-level standard-air estimate">
      <Panel>
        <Field label="Sensible heat" suffix="BTU/hr" value={String(inputs.btu)} keyboardType="numeric" onChangeText={(t) => setInputs({ ...inputs, btu: Number(t) || 0 })} />
        <Field label="Temperature difference" suffix="°F" value={String(inputs.deltaT)} keyboardType="decimal-pad" onChangeText={(t) => setInputs({ ...inputs, deltaT: Number(t) || 0 })} />
        <PrimaryButton label="Calculate" icon="air" onPress={calculate} style={{ marginTop: 4 }} />
      </Panel>
      <MetricReadout result={result} accent={CATEGORY.airflow} />
    </CalculatorShell>
  );
}

// ─── BTU from CFM ────────────────────────────────────────────────────

export function BtuFromCfmScreen() {
  const { addCalculation } = useAppStore();
  const [inputs, setInputs] = useState({ cfm: 1000, deltaT: 20 });
  const [result, setResult] = useState<MetricResult | null>(null);

  const calculate = () => {
    const res = HAVACEngine.btuFromCfm(inputs);
    setResult(res);
    if (res.ok) addCalculation({ type: 'btuFromCfm', inputs, result: res });
  };

  return (
    <CalculatorShell title="Sensible Heat" code="Near-sea-level standard-air estimate">
      <Panel>
        <Field label="CFM" suffix="CFM" value={String(inputs.cfm)} keyboardType="numeric" onChangeText={(t) => setInputs({ ...inputs, cfm: Number(t) || 0 })} />
        <Field label="Temperature difference" suffix="°F" value={String(inputs.deltaT)} keyboardType="decimal-pad" onChangeText={(t) => setInputs({ ...inputs, deltaT: Number(t) || 0 })} />
        <PrimaryButton label="Calculate" icon="thermostat" onPress={calculate} style={{ marginTop: 4 }} />
      </Panel>
      <MetricReadout result={result} accent={CATEGORY.airflow} />
    </CalculatorShell>
  );
}

// ─── Duct Sizing ─────────────────────────────────────────────────────

export function DuctSizingScreen() {
  const { addCalculation } = useAppStore();
  const [inputs, setInputs] = useState({ cfm: 1000, velocity: 700, aspectRatio: 1 });
  const [result, setResult] = useState<MetricResult | null>(null);

  const calculate = () => {
    const res = HAVACEngine.ductSizing(inputs);
    setResult(res);
    if (res.ok) addCalculation({ type: 'ductSizing', inputs, result: res });
  };

  return (
    <CalculatorShell title="Duct Sizing" code="Area = CFM ÷ velocity">
      <Panel>
        <Field label="CFM" suffix="CFM" value={String(inputs.cfm)} keyboardType="numeric" onChangeText={(t) => setInputs({ ...inputs, cfm: Number(t) || 0 })} />
        <Field label="Velocity" suffix="FPM" value={String(inputs.velocity)} keyboardType="numeric" onChangeText={(t) => setInputs({ ...inputs, velocity: Number(t) || 0 })} />
        <Field label="Aspect ratio" suffix="W:H" value={String(inputs.aspectRatio)} keyboardType="decimal-pad" onChangeText={(t) => setInputs({ ...inputs, aspectRatio: Number(t) || 0 })} placeholder="1" />
        <PrimaryButton label="Calculate" icon="line-weight" onPress={calculate} style={{ marginTop: 4 }} />
      </Panel>
      <MetricReadout result={result} accent={CATEGORY.duct} />
    </CalculatorShell>
  );
}

// ─── Air Velocity ────────────────────────────────────────────────────

export function AirVelocityScreen() {
  const { addCalculation } = useAppStore();
  const [inputs, setInputs] = useState({ cfm: 1000, area: 1.5 });
  const [result, setResult] = useState<MetricResult | null>(null);

  const calculate = () => {
    const res = HAVACEngine.airVelocity(inputs);
    setResult(res);
    if (res.ok) addCalculation({ type: 'airVelocity', inputs, result: res });
  };

  return (
    <CalculatorShell title="Air Velocity" code="Velocity = CFM ÷ area">
      <Panel>
        <Field label="CFM" suffix="CFM" value={String(inputs.cfm)} keyboardType="numeric" onChangeText={(t) => setInputs({ ...inputs, cfm: Number(t) || 0 })} />
        <Field label="Duct area" suffix="ft²" value={String(inputs.area)} keyboardType="decimal-pad" onChangeText={(t) => setInputs({ ...inputs, area: Number(t) || 0 })} />
        <PrimaryButton label="Calculate" icon="speed" onPress={calculate} style={{ marginTop: 4 }} />
      </Panel>
      <MetricReadout result={result} accent={CATEGORY.airflow} />
    </CalculatorShell>
  );
}

// ─── Psychrometrics ──────────────────────────────────────────────────

export function PsychrometricsScreen() {
  const { addCalculation } = useAppStore();
  const [inputText, setInputText] = useState({ cfm: '1000', enterDb: '75', enterWb: '62', leaveDb: '55', leaveWb: '52' });
  const [result, setResult] = useState<MetricResult | null>(null);

  const calculate = () => {
    const inputs = {
      cfm: requiredNumber(inputText.cfm),
      enterDb: requiredNumber(inputText.enterDb),
      enterWb: requiredNumber(inputText.enterWb),
      leaveDb: requiredNumber(inputText.leaveDb),
      leaveWb: requiredNumber(inputText.leaveWb),
    };
    const res = HAVACEngine.psychrometrics(inputs);
    setResult(res);
    if (res.ok) addCalculation({ type: 'psychrometrics', inputs, result: res });
  };

  return (
    <CalculatorShell title="Psychrometrics" code="Total, sensible, latent BTU/hr">
      <Panel>
        <Field label="CFM" suffix="CFM" value={inputText.cfm} keyboardType="numeric" onChangeText={(cfm) => setInputText({ ...inputText, cfm })} />
        <Field label="Entering dry-bulb" suffix="°F" value={inputText.enterDb} keyboardType={SIGNED_DECIMAL_KEYBOARD} onChangeText={(enterDb) => setInputText({ ...inputText, enterDb })} />
        <Field label="Entering wet-bulb" suffix="°F" value={inputText.enterWb} keyboardType={SIGNED_DECIMAL_KEYBOARD} onChangeText={(enterWb) => setInputText({ ...inputText, enterWb })} />
        <Field label="Leaving dry-bulb" suffix="°F" value={inputText.leaveDb} keyboardType={SIGNED_DECIMAL_KEYBOARD} onChangeText={(leaveDb) => setInputText({ ...inputText, leaveDb })} />
        <Field label="Leaving wet-bulb" suffix="°F" value={inputText.leaveWb} keyboardType={SIGNED_DECIMAL_KEYBOARD} onChangeText={(leaveWb) => setInputText({ ...inputText, leaveWb })} />
        <PrimaryButton label="Calculate" icon="water-drop" onPress={calculate} style={{ marginTop: 4 }} />
      </Panel>
      <MetricReadout result={result} accent={CATEGORY.psychrometrics} />
    </CalculatorShell>
  );
}

// ─── Refrigerant Lines ───────────────────────────────────────────────

const REFRIGERANT_LINE_TYPES = ['R410A', 'R32', 'R454B'] as const;

export function RefrigerantLinesScreen() {
  const { addCalculation } = useAppStore();
  const [inputs, setInputs] = useState({
    tons: 3,
    refrigerant: 'R410A' as 'R410A' | 'R32' | 'R454B',
    equivalentLineLength: 25,
    manufacturerSuctionSize: '',
    manufacturerLiquidSize: '',
  });
  const [maxLengthText, setMaxLengthText] = useState('');
  const [result, setResult] = useState<MetricResult | null>(null);

  const calculate = () => {
    const nextInputs = {
      ...inputs,
      manufacturerMaxEquivalentLength: optionalNumber(maxLengthText),
    };
    const res = HAVACEngine.refrigerantLines(nextInputs);
    setResult(res);
    if (res.ok) addCalculation({ type: 'refrigerantLines', inputs: nextInputs, result: res });
  };

  return (
    <CalculatorShell title="Refrigerant Lines" code="Manufacturer equivalent-length check">
      <Panel>
        <Field label="Tons" suffix="tons" value={String(inputs.tons)} keyboardType="decimal-pad" onChangeText={(t) => setInputs({ ...inputs, tons: Number(t) || 0 })} />
        <Segmented label="Refrigerant" value={inputs.refrigerant} options={REFRIGERANT_LINE_TYPES} onChange={(refrigerant) => setInputs({ ...inputs, refrigerant })} />
        <Field label="Equivalent line length" suffix="ft" value={String(inputs.equivalentLineLength)} keyboardType="decimal-pad" onChangeText={(t) => setInputs({ ...inputs, equivalentLineLength: Number(t) || 0 })} />
        <Field label="Manufacturer maximum equivalent length" suffix="ft" value={maxLengthText} keyboardType="decimal-pad" onChangeText={setMaxLengthText} placeholder="Required" />
        <Field label="Manufacturer suction line size" value={inputs.manufacturerSuctionSize} onChangeText={(manufacturerSuctionSize) => setInputs({ ...inputs, manufacturerSuctionSize })} placeholder="Required" />
        <Field label="Manufacturer liquid line size" value={inputs.manufacturerLiquidSize} onChangeText={(manufacturerLiquidSize) => setInputs({ ...inputs, manufacturerLiquidSize })} placeholder="Required" />
        <PrimaryButton label="Validate" icon="linear-scale" onPress={calculate} style={{ marginTop: 4 }} />
      </Panel>
      <MetricReadout result={result} accent={CATEGORY.refrigerant} />
    </CalculatorShell>
  );
}

// ─── Superheat / Subcooling ──────────────────────────────────────────

const SH_SC_MODES = ['superheat', 'subcool'] as const;
const SH_SC_REFRIGERANTS: RefrigerantType[] = ['R410A', 'R22', 'R32', 'R454B'];

export function SuperheatSubcoolScreen() {
  const { addCalculation } = useAppStore();
  const [inputs, setInputs] = useState({ refrigerant: 'R410A' as RefrigerantType, mode: 'superheat' as 'superheat' | 'subcool' });
  const [targetText, setTargetText] = useState('');
  const [result, setResult] = useState<MetricResult | null>(null);

  const calculate = () => {
    const nextInputs = { ...inputs, manufacturerTarget: optionalNumber(targetText) };
    const res = HAVACEngine.superheatSubcool(nextInputs);
    setResult(res);
    if (res.ok) addCalculation({ type: 'superheatSubcool', inputs: nextInputs, result: res });
  };

  return (
    <CalculatorShell title="Superheat / Subcool" code="Record the equipment manufacturer's target">
      <Panel>
        <Segmented label="Mode" value={inputs.mode} options={SH_SC_MODES} onChange={(mode) => setInputs({ ...inputs, mode })} format={cap} />
        <Segmented label="Refrigerant" value={inputs.refrigerant} options={SH_SC_REFRIGERANTS} onChange={(refrigerant) => setInputs({ ...inputs, refrigerant })} />
        <Field label="Manufacturer target" suffix="°F" value={targetText} keyboardType="decimal-pad" onChangeText={setTargetText} placeholder="Required" />
        <PrimaryButton label="Validate" icon="device-thermostat" onPress={calculate} style={{ marginTop: 4 }} />
      </Panel>
      <MetricReadout result={result} accent={CATEGORY.refrigerant} />
    </CalculatorShell>
  );
}

// ─── Room Load ───────────────────────────────────────────────────────

export function RoomLoadScreen() {
  const { addCalculation } = useAppStore();
  const [areaText, setAreaText] = useState('');
  const [loadFactorText, setLoadFactorText] = useState('');
  const [result, setResult] = useState<MetricResult | null>(null);

  const calculate = () => {
    const inputs = {
      area: requiredNumber(areaText),
      loadFactor: requiredNumber(loadFactorText),
    };
    const res = HAVACEngine.roomLoad(inputs);
    setResult(res);
    if (res.ok) addCalculation({ type: 'roomLoad', inputs, result: res });
  };

  return (
    <CalculatorShell title="Room Load" code="Area-factor planning estimate, not Manual J">
      <Panel>
        <Field label="Area" suffix="sq ft" value={areaText} keyboardType="numeric" onChangeText={setAreaText} placeholder="Required" />
        <Field label="User load factor" suffix="BTU/hr·ft²" value={loadFactorText} keyboardType="decimal-pad" onChangeText={setLoadFactorText} placeholder="Required" />
        <PrimaryButton label="Calculate" icon="room" onPress={calculate} style={{ marginTop: 4 }} />
      </Panel>
      <MetricReadout result={result} accent={CATEGORY.load} />
    </CalculatorShell>
  );
}

// ─── Heat Pump Balance ───────────────────────────────────────────────

export function HeatPumpBalanceScreen() {
  const { addCalculation } = useAppStore();
  const [inputText, setInputText] = useState({
    designTemp: '',
    capacityAt47: '',
    capacityAt17: '',
    heatLossPerDegree: '',
    indoorSetpoint: '',
  });
  const [result, setResult] = useState<MetricResult | null>(null);

  const calculate = () => {
    const inputs = {
      designTemp: requiredNumber(inputText.designTemp),
      capacityAt47: requiredNumber(inputText.capacityAt47),
      capacityAt17: requiredNumber(inputText.capacityAt17),
      heatLossPerDegree: requiredNumber(inputText.heatLossPerDegree),
      indoorSetpoint: requiredNumber(inputText.indoorSetpoint),
    };
    const res = HAVACEngine.heatPumpBalance(inputs);
    setResult(res);
    if (res.ok) addCalculation({ type: 'heatPumpBalance', inputs, result: res });
  };

  return (
    <CalculatorShell title="Heat Pump Balance" code="Capacity vs heat loss">
      <Panel>
        <Field label="Indoor setpoint" suffix="°F" value={inputText.indoorSetpoint} keyboardType="decimal-pad" onChangeText={(value) => setInputText({ ...inputText, indoorSetpoint: value })} placeholder="Required" />
        <Field label="Design temperature" suffix="°F" value={inputText.designTemp} keyboardType={SIGNED_DECIMAL_KEYBOARD} onChangeText={(value) => setInputText({ ...inputText, designTemp: value })} placeholder="Required" />
        <Field label="Capacity at 47°F" suffix="BTU/hr" value={inputText.capacityAt47} keyboardType="numeric" onChangeText={(value) => setInputText({ ...inputText, capacityAt47: value })} placeholder="Manufacturer data" />
        <Field label="Capacity at 17°F" suffix="BTU/hr" value={inputText.capacityAt17} keyboardType="numeric" onChangeText={(value) => setInputText({ ...inputText, capacityAt17: value })} placeholder="Manufacturer data" />
        <Field label="Building heat-loss coefficient" suffix="BTU/hr·°F" value={inputText.heatLossPerDegree} keyboardType="numeric" onChangeText={(value) => setInputText({ ...inputText, heatLossPerDegree: value })} placeholder="Required" />
        <PrimaryButton label="Calculate" icon="balance" onPress={calculate} style={{ marginTop: 4 }} />
      </Panel>
      <MetricReadout result={result} accent={CATEGORY.load} />
    </CalculatorShell>
  );
}

// ─── Hydronics ───────────────────────────────────────────────────────

export function HydronicsScreen() {
  const { addCalculation } = useAppStore();
  const [btu, setBtu] = useState('');
  const [gpm, setGpm] = useState('');
  const [deltaT, setDeltaT] = useState('');
  const [result, setResult] = useState<MetricResult | null>(null);

  const calculate = () => {
    const inputs = {
      btu: btu.trim() !== '' ? parseFloat(btu) : undefined,
      gpm: gpm.trim() !== '' ? parseFloat(gpm) : undefined,
      deltaT: deltaT.trim() !== '' ? parseFloat(deltaT) : undefined,
    };
    const res = HAVACEngine.hydronics(inputs);
    setResult(res);
    if (res.ok) addCalculation({ type: 'hydronics', inputs, result: res });
  };

  return (
    <CalculatorShell title="Water-Side Hydronics" code="Water only: BTU/hr = GPM × 500 × ΔT">
      <Panel>
        <Body tone="muted" style={{ marginBottom: 16 }}>Enter any two values to solve for the third. Enter all three to check consistency. The 500 factor is for water, not glycol.</Body>
        <Field label="BTU/hr" value={btu} onChangeText={setBtu} keyboardType="numeric" placeholder="—" />
        <Field label="GPM" value={gpm} onChangeText={setGpm} keyboardType="decimal-pad" placeholder="—" />
        <Field label="Temperature difference" suffix="°F" value={deltaT} onChangeText={setDeltaT} keyboardType="decimal-pad" placeholder="—" />
        <PrimaryButton label="Calculate" icon="water" onPress={calculate} style={{ marginTop: 4 }} />
      </Panel>
      <MetricReadout result={result} accent={CATEGORY.hydronics} />
    </CalculatorShell>
  );
}

// ─── Mixed Air ───────────────────────────────────────────────────────

export function MixedAirScreen() {
  const { addCalculation } = useAppStore();
  const [inputText, setInputText] = useState({ oaPercent: '20', oaTemp: '95', raTemp: '75' });
  const [result, setResult] = useState<MetricResult | null>(null);

  const calculate = () => {
    const inputs = {
      oaPercent: requiredNumber(inputText.oaPercent),
      oaTemp: requiredNumber(inputText.oaTemp),
      raTemp: requiredNumber(inputText.raTemp),
    };
    const res = HAVACEngine.mixedAir(inputs);
    setResult(res);
    if (res.ok) addCalculation({ type: 'mixedAir', inputs, result: res });
  };

  return (
    <CalculatorShell title="Mixed Air" code="MAT = (OA% × OA) + (RA% × RA)">
      <Panel>
        <Field label="Outdoor air %" suffix="%" value={inputText.oaPercent} keyboardType="numeric" onChangeText={(oaPercent) => setInputText({ ...inputText, oaPercent })} />
        <Field label="Outdoor air temp" suffix="°F" value={inputText.oaTemp} keyboardType={SIGNED_DECIMAL_KEYBOARD} onChangeText={(oaTemp) => setInputText({ ...inputText, oaTemp })} />
        <Field label="Return air temp" suffix="°F" value={inputText.raTemp} keyboardType={SIGNED_DECIMAL_KEYBOARD} onChangeText={(raTemp) => setInputText({ ...inputText, raTemp })} />
        <PrimaryButton label="Calculate" icon="compare-arrows" onPress={calculate} style={{ marginTop: 4 }} />
      </Panel>
      <MetricReadout result={result} accent={CATEGORY.airflow} />
    </CalculatorShell>
  );
}

// ─── Air Changes ─────────────────────────────────────────────────────

export function AirChangesScreen() {
  const { addCalculation } = useAppStore();
  const [inputs, setInputs] = useState({ cfm: 1000, volume: 8000 });
  const [result, setResult] = useState<MetricResult | null>(null);

  const calculate = () => {
    const res = HAVACEngine.airChanges(inputs);
    setResult(res);
    if (res.ok) addCalculation({ type: 'airChanges', inputs, result: res });
  };

  return (
    <CalculatorShell title="Air Changes" code="ACH = CFM × 60 ÷ volume">
      <Panel>
        <Field label="CFM" suffix="CFM" value={String(inputs.cfm)} keyboardType="numeric" onChangeText={(t) => setInputs({ ...inputs, cfm: Number(t) || 0 })} />
        <Field label="Room volume" suffix="ft³" value={String(inputs.volume)} keyboardType="numeric" onChangeText={(t) => setInputs({ ...inputs, volume: Number(t) || 0 })} />
        <PrimaryButton label="Calculate" icon="cached" onPress={calculate} style={{ marginTop: 4 }} />
      </Panel>
      <MetricReadout result={result} accent={CATEGORY.airflow} />
    </CalculatorShell>
  );
}

// ─── Evaporative Cooling ─────────────────────────────────────────────

export function EvaporativeCoolingScreen() {
  const { addCalculation } = useAppStore();
  const [inputs, setInputs] = useState({ oaDb: 95, oaWb: 68, efficiency: 0.8, cfm: 1600 });
  const [result, setResult] = useState<MetricResult | null>(null);

  const calculate = () => {
    const res = HAVACEngine.evaporativeCooling(inputs);
    setResult(res);
    if (res.ok) addCalculation({ type: 'evaporativeCooling', inputs, result: res });
  };

  return (
    <CalculatorShell title="Evaporative Cooling" code="Supply DB and sensible air-side estimate">
      <Panel>
        <Field label="Outdoor dry-bulb" suffix="°F" value={String(inputs.oaDb)} keyboardType="decimal-pad" onChangeText={(t) => setInputs({ ...inputs, oaDb: Number(t) || 0 })} />
        <Field label="Outdoor wet-bulb" suffix="°F" value={String(inputs.oaWb)} keyboardType="decimal-pad" onChangeText={(t) => setInputs({ ...inputs, oaWb: Number(t) || 0 })} />
        <Field label="CFM" suffix="CFM" value={String(inputs.cfm)} keyboardType="numeric" onChangeText={(t) => setInputs({ ...inputs, cfm: Number(t) || 0 })} />
        <Field label="Efficiency" suffix="decimal" value={String(inputs.efficiency)} keyboardType="decimal-pad" onChangeText={(t) => setInputs({ ...inputs, efficiency: Number(t) || 0 })} placeholder="0.8" />
        <PrimaryButton label="Calculate" icon="opacity" onPress={calculate} style={{ marginTop: 4 }} />
      </Panel>
      <MetricReadout result={result} accent={CATEGORY.efficiency} />
    </CalculatorShell>
  );
}

// ─── Filter Velocity ─────────────────────────────────────────────────

export function FilterVelocityScreen() {
  const { addCalculation } = useAppStore();
  const [inputs, setInputs] = useState({ cfm: 1200, filterWidth: 16, filterHeight: 25 });
  const [result, setResult] = useState<MetricResult | null>(null);

  const calculate = () => {
    const res = HAVACEngine.filterVelocity(inputs);
    setResult(res);
    if (res.ok) addCalculation({ type: 'filterVelocity', inputs, result: res });
  };

  return (
    <CalculatorShell title="Filter Velocity" code="Face velocity only">
      <Panel>
        <Field label="CFM" suffix="CFM" value={String(inputs.cfm)} keyboardType="numeric" onChangeText={(t) => setInputs({ ...inputs, cfm: Number(t) || 0 })} />
        <Field label="Filter width" suffix="in" value={String(inputs.filterWidth)} keyboardType="numeric" onChangeText={(t) => setInputs({ ...inputs, filterWidth: Number(t) || 0 })} />
        <Field label="Filter height" suffix="in" value={String(inputs.filterHeight)} keyboardType="numeric" onChangeText={(t) => setInputs({ ...inputs, filterHeight: Number(t) || 0 })} />
        <PrimaryButton label="Calculate" icon="filter-alt" onPress={calculate} style={{ marginTop: 4 }} />
      </Panel>
      <MetricReadout result={result} accent={CATEGORY.duct} />
    </CalculatorShell>
  );
}

// ─── O₂ Excess Air ──────────────────────────────────────────────────

export function CombustionAnalysisScreen() {
  const { addCalculation } = useAppStore();
  const [o2Text, setO2Text] = useState('');
  const [result, setResult] = useState<MetricResult | null>(null);

  const calculate = () => {
    const inputs = { o2: requiredNumber(o2Text) };
    const res = HAVACEngine.combustionAnalysis(inputs);
    setResult(res);
    if (res.ok) addCalculation({ type: 'combustionAnalysis', inputs, result: res });
  };

  return (
    <CalculatorShell title="O₂ Excess Air" code="Dry-flue-gas dilution estimate, not a safety result">
      <Panel>
        <Field label="Measured O₂" suffix="%" value={o2Text} keyboardType="decimal-pad" onChangeText={setO2Text} placeholder="Required measurement" />
        <PrimaryButton label="Calculate" icon="fireplace" onPress={calculate} style={{ marginTop: 4 }} />
      </Panel>
      <MetricReadout result={result} accent={CATEGORY.general} />
    </CalculatorShell>
  );
}

// ─── Refrigerant Weight ──────────────────────────────────────────────

const CHARGE_REFRIGERANTS: RefrigerantType[] = ['R410A', 'R22', 'R32', 'R454B'];

export function RefrigerantWeightScreen() {
  const { addCalculation } = useAppStore();
  const [inputs, setInputs] = useState({
    installedLineLength: 15,
    factoryAllowance: 15,
    refrigerant: 'R410A' as RefrigerantType,
  });
  const [chargeRateText, setChargeRateText] = useState('');
  const [result, setResult] = useState<MetricResult | null>(null);

  const calculate = () => {
    const nextInputs = {
      ...inputs,
      manufacturerChargeRate: optionalNumber(chargeRateText),
    };
    const res = HAVACEngine.refrigerantWeight(nextInputs);
    setResult(res);
    if (res.ok) addCalculation({ type: 'refrigerantWeight', inputs: nextInputs, result: res });
  };

  return (
    <CalculatorShell title="Refrigerant Weight" code="Additional charge from manufacturer data">
      <Panel>
        <Segmented label="Refrigerant" value={inputs.refrigerant} options={CHARGE_REFRIGERANTS} onChange={(refrigerant) => setInputs({ ...inputs, refrigerant })} />
        <Field label="Installed line length" suffix="ft" value={String(inputs.installedLineLength)} keyboardType="decimal-pad" onChangeText={(t) => setInputs({ ...inputs, installedLineLength: Number(t) || 0 })} />
        <Field label="Factory line allowance" suffix="ft" value={String(inputs.factoryAllowance)} keyboardType="decimal-pad" onChangeText={(t) => setInputs({ ...inputs, factoryAllowance: Number(t) || 0 })} />
        <Field label="Manufacturer additional-charge rate" suffix="oz/ft" value={chargeRateText} keyboardType="decimal-pad" onChangeText={setChargeRateText} placeholder="Required" />
        <PrimaryButton label="Calculate" icon="scale" onPress={calculate} style={{ marginTop: 4 }} />
      </Panel>
      <MetricReadout result={result} accent={CATEGORY.refrigerant} />
    </CalculatorShell>
  );
}

// ─── Outdoor Airflow ─────────────────────────────────────────────────

export function EconomizerScreen() {
  const { addCalculation } = useAppStore();
  const [inputText, setInputText] = useState({
    zoneArea: '',
    occupancyDensity: '',
    cfmPerPerson: '',
    cfmPerArea: '',
  });
  const [result, setResult] = useState<MetricResult | null>(null);

  const calculate = () => {
    const inputs = {
      zoneArea: requiredNumber(inputText.zoneArea),
      occupancyDensity: requiredNumber(inputText.occupancyDensity),
      cfmPerPerson: requiredNumber(inputText.cfmPerPerson),
      cfmPerArea: requiredNumber(inputText.cfmPerArea),
    };
    const res = HAVACEngine.economizer(inputs);
    setResult(res);
    if (res.ok) addCalculation({ type: 'economizer', inputs, result: res });
  };

  return (
    <CalculatorShell title="Outdoor Airflow" code="Breathing-zone airflow from supplied rates">
      <Panel>
        <Field label="Zone area" suffix="ft²" value={inputText.zoneArea} keyboardType="numeric" onChangeText={(value) => setInputText({ ...inputText, zoneArea: value })} placeholder="Required" />
        <Field label="Occupancy density" suffix="ft²/person" value={inputText.occupancyDensity} keyboardType="numeric" onChangeText={(value) => setInputText({ ...inputText, occupancyDensity: value })} placeholder="Supplied design value" />
        <Field label="CFM per person" suffix="CFM" value={inputText.cfmPerPerson} keyboardType="numeric" onChangeText={(value) => setInputText({ ...inputText, cfmPerPerson: value })} placeholder="Supplied rate" />
        <Field label="CFM per area" suffix="CFM/ft²" value={inputText.cfmPerArea} keyboardType="decimal-pad" onChangeText={(value) => setInputText({ ...inputText, cfmPerArea: value })} placeholder="Supplied rate" />
        <PrimaryButton label="Calculate" icon="cloud" onPress={calculate} style={{ marginTop: 4 }} />
      </Panel>
      <MetricReadout result={result} accent={CATEGORY.airflow} />
    </CalculatorShell>
  );
}
