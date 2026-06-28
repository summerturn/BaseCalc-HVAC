import { type ComponentProps, type ReactNode, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Keyboard,
  type KeyboardEvent,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  useWindowDimensions,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, type Edge, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Fonts } from '../theme/typography';
import { useColors } from '../theme/useAppTheme';
import type { CalculationResult, MetricResult } from '../engine/HAVACEngine';
import { Body, Display, Label, Mono, MonoXL, Small, H2 } from './Type';

type IconName = ComponentProps<typeof MaterialIcons>['name'];

const GRID_DARK = require('../../assets/grid-dark.png');
const GRID_LIGHT = require('../../assets/grid-light.png');
const GLOW = require('../../assets/glow-amber.png');

/** Horizontal screen padding — used by all list and form screens. */
export const SCREEN_H_PAD = 20;
export const SCREEN_TOP_PAD = 6;
export const SECTION_GAP = 18;
export const CONTROL_GAP = 10;
export const LIST_CARD_GAP = 12;
export const FAB_SIZE = 60;
export const FAB_OFFSET = 20;
export const LIST_FAB_PADDING = FAB_SIZE + FAB_OFFSET + 8;
export const RIGHT_VALUE_RAIL_WIDTH = 104;
export const ACTION_RAIL_WIDTH = 42;
export const TAB_BAR_MIN_HEIGHT = 58;

/** Width at/above which we treat the device as a tablet (iPad). */
export const TABLET_BREAKPOINT = 768;

/** True on iPad-class widths. */
export function useIsTablet() {
  const { width } = useWindowDimensions();
  return width >= TABLET_BREAKPOINT;
}

/** Breathing room above the docked tab bar for scroll content. */
export const TAB_CLEARANCE = 24;

/**
 * Bottom padding for scroll content. The tab bar is docked (it reserves its own
 * layout space and covers the home indicator), so content only needs a small
 * gap above it.
 */
export function useBottomClearance() {
  return TAB_CLEARANCE;
}

/** hex (#RRGGBB) -> rgba string. */
export function withAlpha(hex: string, a: number): string {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((x) => x + x).join('') : h, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

// ─── Screen shell ────────────────────────────────────────────────────

export function Screen({
  children,
  edges = ['top'],
  glow = true,
}: {
  children: ReactNode;
  edges?: Edge[];
  glow?: boolean;
}) {
  const c = useColors();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const glowSize = Math.min(520, Math.round(width * 1.12));
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const handleShow = (event: KeyboardEvent) => {
      setKeyboardHeight(Math.max(0, event.endCoordinates.height));
    };
    const handleHide = () => setKeyboardHeight(0);

    const showEvent = 'keyboardDidShow';
    const hideEvent = 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, handleShow);
    const hideSub = Keyboard.addListener(hideEvent, handleHide);

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, overflow: 'hidden' }}>
      <Image
        source={c.mode === 'dark' ? GRID_DARK : GRID_LIGHT}
        resizeMode="repeat"
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: c.mode === 'dark' ? 0.42 : 0.26 }}
      />
      {glow ? (
        <Image
          source={GLOW}
          style={{
            position: 'absolute',
            top: -glowSize * 0.38,
            alignSelf: 'center',
            width: glowSize,
            height: glowSize,
            opacity: c.mode === 'dark' ? 0.28 : 0.08,
          }}
        />
      ) : null}
      <SafeAreaView edges={edges} style={{ flex: 1 }}>
        {children}
      </SafeAreaView>
      {keyboardHeight > 0 ? (
        <View
          pointerEvents="box-none"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: keyboardHeight + Math.max(insets.bottom, 12),
            alignItems: 'center',
          }}
        >
          <Pressable
            onPress={Keyboard.dismiss}
            hitSlop={8}
            style={({ pressed }) => ({
              minWidth: 88,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 999,
              borderWidth: 1,
              borderColor: withAlpha(c.amberBright, 0.4),
              backgroundColor: pressed ? c.amberSoft : c.bgElevated,
              paddingHorizontal: 16,
              paddingVertical: 10,
              shadowColor: c.shadow,
              shadowOpacity: c.mode === 'dark' ? 0.35 : 0.12,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 6 },
            })}
          >
            <Text
              style={{
                fontFamily: Fonts.label,
                fontSize: 13,
                lineHeight: 16,
                letterSpacing: 0.6,
                textTransform: 'uppercase',
                color: c.amberBright,
              }}
            >
              Done
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

export function FormScrollView({
  children,
  bottomPadding,
  contentContainerStyle,
  keyboardShouldPersistTaps = 'handled',
}: {
  children: ReactNode;
  bottomPadding: number;
  contentContainerStyle?: StyleProp<ViewStyle>;
  keyboardShouldPersistTaps?: 'always' | 'handled' | 'never';
}) {
  // NOTE: do NOT wrap this in a KeyboardAvoidingView. On iOS,
  // `automaticallyAdjustKeyboardInsets` already insets the scroll content for
  // the keyboard AND scrolls the focused field above it. Combining the two adds
  // the keyboard height twice, which leaves the focused input covered by the
  // number pad — the bug this component exists to prevent.
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
      keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[
        {
          flexGrow: 1,
          paddingHorizontal: SCREEN_H_PAD,
          paddingTop: SCREEN_TOP_PAD,
          paddingBottom: bottomPadding,
        },
        contentContainerStyle,
      ]}
    >
      {children}
    </ScrollView>
  );
}

export function ListScreenScrollView({
  children,
  bottomPadding,
  contentContainerStyle,
}: {
  children: ReactNode;
  bottomPadding: number;
  contentContainerStyle?: StyleProp<ViewStyle>;
}) {
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[
        {
          flexGrow: 1,
          paddingHorizontal: SCREEN_H_PAD,
          paddingTop: SCREEN_TOP_PAD,
          paddingBottom: bottomPadding,
        },
        contentContainerStyle,
      ]}
    >
      {children}
    </ScrollView>
  );
}

// ─── List screen header ──────────────────────────────────────────────

export function ListScreenHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={{ marginTop: 4, marginBottom: SECTION_GAP }}>
      <Display>{title}</Display>
      {subtitle ? <Body tone="muted" style={{ marginTop: 6 }}>{subtitle}</Body> : null}
    </View>
  );
}

// ─── Panel / card ────────────────────────────────────────────────────

export function Panel({
  children,
  style,
  elevated,
  padded = true,
}: {
  children: ReactNode;
  style?: ViewStyle;
  elevated?: boolean;
  padded?: boolean;
}) {
  const c = useColors();
  return (
    <View
      style={[
        {
          backgroundColor: elevated ? c.panelElevated : c.panel,
          borderColor: c.border,
          borderWidth: 1,
          borderRadius: 20,
          padding: padded ? 16 : 0,
          shadowColor: c.shadow,
          shadowOpacity: c.mode === 'dark' ? 0.4 : 0.13,
          shadowRadius: c.mode === 'dark' ? 18 : 13,
          shadowOffset: { width: 0, height: c.mode === 'dark' ? 10 : 6 },
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function Divider({ style }: { style?: ViewStyle }) {
  const c = useColors();
  return <View style={[{ height: 1, backgroundColor: c.divider }, style]} />;
}

// ─── Inputs ──────────────────────────────────────────────────────────

type FieldProps = {
  label?: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'numeric' | 'decimal-pad' | 'email-address' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoComplete?: 'email' | 'password' | 'name' | 'tel' | 'street-address' | 'postal-code' | 'off';
  secureTextEntry?: boolean;
  multiline?: boolean;
  suffix?: string;
  maxLength?: number;
  autoFocus?: boolean;
  style?: ViewStyle;
};

export function Field({
  label, value, onChangeText, placeholder, keyboardType,
  autoCapitalize, autoComplete, secureTextEntry, multiline, suffix, maxLength, autoFocus, style,
}: FieldProps) {
  const c = useColors();
  const [focus, setFocus] = useState(false);
  return (
    <View style={[{ marginBottom: 14 }, style]}>
      {label ? <Label style={{ marginBottom: 7 }}>{label}</Label> : null}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: c.inset,
          borderColor: focus ? c.amberBright : c.border,
          borderWidth: 1,
          borderRadius: 14,
          paddingHorizontal: 14,
        }}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={c.placeholder}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoComplete={autoComplete}
          secureTextEntry={secureTextEntry}
          multiline={multiline}
          maxLength={maxLength}
          autoFocus={autoFocus}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          returnKeyType={multiline ? 'default' : 'done'}
          blurOnSubmit={!multiline}
          style={{
            flex: 1,
            paddingVertical: multiline ? 12 : 13,
            minHeight: multiline ? 76 : undefined,
            textAlignVertical: multiline ? 'top' : 'center',
            fontFamily: Fonts.body,
            fontSize: 16,
            color: c.text,
          }}
        />
        {suffix ? <Mono tone="muted" style={{ marginLeft: 8 }}>{suffix}</Mono> : null}
      </View>
    </View>
  );
}

export function ReadOnlyField({
  label,
  value,
  style,
}: {
  label: string;
  value: string;
  style?: ViewStyle;
}) {
  const c = useColors();
  return (
    <View style={[{ marginBottom: 14 }, style]}>
      <Label style={{ marginBottom: 7 }}>{label}</Label>
      <View
        style={{
          backgroundColor: c.bg,
          borderColor: c.border,
          borderWidth: 1,
          borderRadius: 14,
          paddingHorizontal: 14,
          paddingVertical: 13,
          minHeight: 50,
          justifyContent: 'center',
        }}
      >
        <Mono style={{ color: c.text }}>{value}</Mono>
      </View>
    </View>
  );
}

export function Segmented<T extends string>({
  label, value, options, onChange, format,
}: {
  label?: string;
  value: T;
  options: readonly T[];
  onChange: (v: T) => void;
  format?: (v: T) => string;
}) {
  const c = useColors();
  return (
    <View style={{ marginBottom: 14 }}>
      {label ? <Label style={{ marginBottom: 8 }}>{label}</Label> : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {options.map((opt) => {
          const active = opt === value;
          return (
            <Pressable
              key={opt}
              onPress={() => onChange(opt)}
              style={({ pressed }) => ({
                paddingHorizontal: 14,
                paddingVertical: 9,
                borderRadius: 11,
                borderWidth: 1,
                backgroundColor: active ? c.amberSoft : c.inset,
                borderColor: active ? c.amberBright : c.border,
                opacity: pressed ? 0.75 : 1,
              })}
            >
              <Text
                style={{
                  fontFamily: active ? Fonts.label : Fonts.body,
                  fontSize: 13.5,
                  color: active ? (c.mode === 'dark' ? c.amberBright : c.amber) : c.textDim,
                }}
              >
                {format ? format(opt) : opt}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function SearchBar({
  value, onChangeText, placeholder,
}: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
}) {
  const c = useColors();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: c.inset,
        borderColor: c.border,
        borderWidth: 1,
        borderRadius: 14,
        paddingHorizontal: 14,
      }}
    >
      <MaterialIcons name="search" size={20} color={c.textMuted} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={c.placeholder}
        autoCapitalize="none"
        style={{ flex: 1, paddingVertical: 12, fontFamily: Fonts.body, fontSize: 16, color: c.text }}
      />
    </View>
  );
}

// ─── Buttons ─────────────────────────────────────────────────────────

export function PrimaryButton({
  label, onPress, icon, loading, disabled, style,
}: {
  label: string;
  onPress: () => void;
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}) {
  const c = useColors();
  const off = disabled || loading;
  const [pressed, setPressed] = useState(false);
  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: off ? c.inset : c.amberBright,
        borderColor: off ? c.border : c.amber,
        borderWidth: 1,
        borderRadius: 15,
        paddingVertical: 15,
        transform: [{ scale: pressed ? 0.985 : 1 }],
        shadowColor: c.amberBright,
        shadowOpacity: off ? 0 : c.mode === 'dark' ? 0.5 : 0.32,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 6 },
        ...style,
      }}
    >
      {loading ? (
        <ActivityIndicator color={off ? c.textMuted : c.onAmber} />
      ) : icon ? (
        <MaterialIcons name={icon} size={20} color={off ? c.textMuted : c.onAmber} />
      ) : null}
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        style={{
          fontFamily: Fonts.label,
          fontSize: 14,
          lineHeight: 18,
          letterSpacing: 1,
          textTransform: 'uppercase',
          color: off ? c.textMuted : c.onAmber,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function SecondaryButton({
  label, onPress, icon, tint, style,
}: {
  label: string;
  onPress: () => void;
  icon?: IconName;
  tint?: string; // hex accent; when set, button is tinted
  style?: ViewStyle;
}) {
  const c = useColors();
  const fg = tint ?? (c.mode === 'light' ? c.text : c.textDim);
  const bg = tint
    ? withAlpha(tint, c.mode === 'dark' ? 0.16 : 0.12)
    : (c.mode === 'light' ? c.bgElevated : c.inset);
  const bd = tint ? withAlpha(tint, 0.4) : c.borderStrong;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          backgroundColor: bg,
          borderColor: bd,
          borderWidth: 1,
          borderRadius: 13,
          paddingVertical: 13,
          opacity: pressed ? 0.7 : 1,
        },
        style,
      ]}
    >
      {icon ? <MaterialIcons name={icon} size={17} color={fg} /> : null}
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        style={{ fontFamily: Fonts.label, fontSize: 12.5, lineHeight: 16, letterSpacing: 0.6, color: fg }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function FAB({ icon = 'add', onPress }: { icon?: IconName; onPress: () => void }) {
  const c = useColors();
  const [pressed, setPressed] = useState(false);
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      hitSlop={10}
      style={{
        position: 'absolute',
        right: SCREEN_H_PAD,
        bottom: FAB_OFFSET,
        width: FAB_SIZE,
        height: FAB_SIZE,
        borderRadius: 20,
        backgroundColor: c.amberBright,
        borderColor: c.amber,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
        elevation: 10,
        shadowColor: c.amberBright,
        shadowOpacity: 0.5,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 8 },
        transform: [{ scale: pressed ? 0.94 : 1 }],
      }}
    >
      <MaterialIcons name={icon} size={30} color={c.onAmber} />
    </Pressable>
  );
}

export function BackBar({ onBack, title }: { onBack: () => void; title?: string }) {
  const c = useColors();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18 }}>
      <Pressable
        onPress={onBack}
        hitSlop={8}
        style={({ pressed }) => ({
          width: 42,
          height: 42,
          borderRadius: 13,
          backgroundColor: c.panel,
          borderColor: c.border,
          borderWidth: 1,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: pressed ? 0.65 : 1,
        })}
      >
        <MaterialIcons name="chevron-left" size={26} color={c.amber} />
      </Pressable>
      {title ? <H2 numberOfLines={1} style={{ flex: 1, fontSize: 19 }}>{title}</H2> : null}
    </View>
  );
}

// ─── Misc ────────────────────────────────────────────────────────────

export function IconTile({ icon, color, size = 52 }: { icon: IconName; color: string; size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.28,
        backgroundColor: withAlpha(color, 0.14),
        borderColor: withAlpha(color, 0.32),
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <MaterialIcons name={icon} size={size * 0.5} color={color} />
    </View>
  );
}

export type PillTone = 'neutral' | 'amber' | 'pass' | 'fail' | 'info';

export function Pill({ label, tone = 'neutral' }: { label: string; tone?: PillTone }) {
  const c = useColors();
  const map: Record<PillTone, { fg: string; bg: string; bd: string }> = {
    neutral: { fg: c.textDim, bg: c.inset, bd: c.border },
    amber: { fg: c.amber, bg: c.amberSoft, bd: withAlpha(c.amberBright, 0.4) },
    pass: { fg: c.pass, bg: c.passBg, bd: c.passBorder },
    fail: { fg: c.fail, bg: c.failBg, bd: c.failBorder },
    info: { fg: c.info, bg: withAlpha(c.info, 0.14), bd: withAlpha(c.info, 0.38) },
  };
  const s = map[tone];
  return (
    <View style={{ backgroundColor: s.bg, borderColor: s.bd, borderWidth: 1, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 4 }}>
      <Text numberOfLines={1} adjustsFontSizeToFit style={{ fontFamily: Fonts.label, fontSize: 10.5, lineHeight: 15, letterSpacing: 1, textTransform: 'uppercase', color: s.fg }}>
        {label}
      </Text>
    </View>
  );
}

export function EmptyState({ icon, title, subtitle }: { icon: IconName; title: string; subtitle?: string }) {
  const c = useColors();
  return (
    <View style={{ alignItems: 'center', paddingVertical: 56, width: '100%' }}>
      <View
        style={{
          width: 66,
          height: 66,
          borderRadius: 19,
          backgroundColor: c.inset,
          borderColor: c.border,
          borderWidth: 1,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 16,
        }}
      >
        <MaterialIcons name={icon} size={30} color={c.textMuted} />
      </View>
      <H2>{title}</H2>
      {subtitle ? <Small style={{ marginTop: 6, textAlign: 'center', maxWidth: 260 }}>{subtitle}</Small> : null}
    </View>
  );
}

/** LCD-style meter readout for calculator results. */
export function ResultReadout({ result }: { result: CalculationResult | null }) {
  const c = useColors();
  if (!result) return null;
  const ok = result.passes;
  const accent = ok ? c.pass : c.fail;
  const intUnits = ['AWG', 'kcmil'];
  const display =
    !Number.isFinite(result.value) ? '—'
      : intUnits.includes(result.unit) ? String(Math.round(result.value))
        : result.value.toFixed(2);

  return (
    <View style={{ marginTop: 20 }}>
      <Label style={{ marginBottom: 8 }}>Result</Label>
      <View style={{ backgroundColor: c.inset, borderColor: c.border, borderWidth: 1, borderRadius: 18, overflow: 'hidden' }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', padding: 18, paddingBottom: 12 }}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <MonoXL numberOfLines={1} adjustsFontSizeToFit>{display}</MonoXL>
            <Mono tone="muted" style={{ marginTop: 4 }} numberOfLines={1}>
              {result.unit}
              {result.limit != null ? `   ·   limit ${result.limit}` : ''}
            </Mono>
          </View>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 7,
              backgroundColor: ok ? c.passBg : c.failBg,
              borderColor: ok ? c.passBorder : c.failBorder,
              borderWidth: 1,
              borderRadius: 999,
              paddingHorizontal: 12,
              paddingVertical: 7,
            }}
          >
            <View style={{ width: 9, height: 9, borderRadius: 9, backgroundColor: accent, shadowColor: accent, shadowOpacity: 0.9, shadowRadius: 6 }} />
            <Text numberOfLines={1} adjustsFontSizeToFit style={{ fontFamily: Fonts.label, fontSize: 12, lineHeight: 16, letterSpacing: 1.5, color: accent }}>{ok ? 'PASS' : 'FAIL'}</Text>
          </View>
        </View>

        <View style={{ paddingHorizontal: 18, paddingBottom: result.details.length ? 14 : 18 }}>
          <Body tone="primary" style={{ fontSize: 14.5 }}>{result.message}</Body>
        </View>

        {result.details.length > 0 ? (
          <View
            style={{
              borderTopWidth: 1,
              borderTopColor: c.divider,
              backgroundColor: c.mode === 'dark' ? 'rgba(0,0,0,0.22)' : 'rgba(15,20,30,0.02)',
              paddingHorizontal: 16,
              paddingVertical: 14,
              gap: 4,
            }}
          >
            {result.details.map((d, i) => (
              <Mono key={i} tone="muted" style={{ fontSize: 11.5, lineHeight: 17 }}>{d}</Mono>
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}

/** Informational readout for multi-output calculators (no pass/fail badge). */
export function MetricReadout({ result, accent }: { result: MetricResult | null; accent?: string }) {
  const c = useColors();
  if (!result) return null;
  const tint = accent ?? c.amberBright;

  if (!result.ok) {
    return (
      <View style={{ marginTop: 20 }}>
        <Label style={{ marginBottom: 8 }}>Result</Label>
        <Panel><Body tone="primary">{result.message}</Body></Panel>
      </View>
    );
  }

  const primary = result.fields.filter((f) => f.emphasis);
  const secondary = result.fields.filter((f) => !f.emphasis);

  return (
    <View style={{ marginTop: 20 }}>
      <Label style={{ marginBottom: 8 }}>Result</Label>
      <View style={{ backgroundColor: c.inset, borderColor: c.border, borderWidth: 1, borderRadius: 18, overflow: 'hidden' }}>
        <View style={{ height: 4, backgroundColor: tint }} />

        <View style={{ flexDirection: 'row', gap: 14, paddingHorizontal: 18, paddingTop: 16, paddingBottom: secondary.length ? 14 : 18 }}>
          {primary.map((field, i) => (
            <View key={i} style={{ flex: 1 }}>
              <Label tone="muted" numberOfLines={1}>{field.label}</Label>
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                style={{ fontFamily: Fonts.monoBold, fontSize: 34, lineHeight: 40, color: c.text, letterSpacing: -0.5, marginTop: 6 }}
              >
                {field.value}
              </Text>
              {field.unit ? <Mono tone="muted" style={{ marginTop: 2 }} numberOfLines={1}>{field.unit}</Mono> : null}
            </View>
          ))}
        </View>

        {secondary.length > 0 ? (
          <View style={{ borderTopWidth: 1, borderTopColor: c.divider, paddingHorizontal: 18, paddingVertical: 12, gap: 9 }}>
            {secondary.map((field, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Mono tone="muted" numberOfLines={1} style={{ flex: 1, marginRight: 12 }}>{field.label}</Mono>
                <Mono style={{ color: c.text }} numberOfLines={1}>{field.value}{field.unit ? ` ${field.unit}` : ''}</Mono>
              </View>
            ))}
          </View>
        ) : null}

        {result.details.length > 0 ? (
          <View
            style={{
              borderTopWidth: 1,
              borderTopColor: c.divider,
              backgroundColor: c.mode === 'dark' ? 'rgba(0,0,0,0.22)' : 'rgba(15,20,30,0.02)',
              paddingHorizontal: 16,
              paddingVertical: 14,
              gap: 4,
            }}
          >
            {result.details.map((d, i) => (
              <Mono key={i} tone="muted" style={{ fontSize: 11.5, lineHeight: 17 }}>{d}</Mono>
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}
