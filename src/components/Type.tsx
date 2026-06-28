import { Text, type TextProps, type TextStyle } from 'react-native';
import { Fonts } from '../theme/typography';
import { useColors } from '../theme/useAppTheme';
import type { AppColors } from '../theme/appTheme';

export type Tone =
  | 'primary' | 'dim' | 'muted' | 'faint'
  | 'amber' | 'bright' | 'pass' | 'fail' | 'info'
  | 'onAmber' | 'inherit';

function toneColor(c: AppColors, tone: Tone): string | undefined {
  switch (tone) {
    case 'primary': return c.text;
    case 'dim': return c.textDim;
    case 'muted': return c.textMuted;
    case 'faint': return c.textFaint;
    case 'amber': return c.amber;
    case 'bright': return c.amberBright;
    case 'pass': return c.pass;
    case 'fail': return c.fail;
    case 'info': return c.info;
    case 'onAmber': return c.onAmber;
    case 'inherit': return undefined;
  }
}

type Props = TextProps & { tone?: Tone; children?: React.ReactNode };

function make(base: TextStyle, defaultTone: Tone) {
  return function Component({ tone = defaultTone, style, ...rest }: Props) {
    const c = useColors();
    return <Text {...rest} style={[base, { color: toneColor(c, tone) }, style]} />;
  };
}

/** Big black display — screen titles, wordmark, hero numbers. */
const DisplayBase = make(
  { fontFamily: Fonts.display, fontSize: 28, lineHeight: 44, letterSpacing: 0.1 },
  'primary'
);
export function Display(props: Props) {
  return <DisplayBase numberOfLines={1} adjustsFontSizeToFit {...props} />;
}
/** Section / card titles. */
export const H1 = make(
  { fontFamily: Fonts.heading, fontSize: 22, lineHeight: 32, letterSpacing: 0.05 },
  'primary'
);
export const H2 = make(
  { fontFamily: Fonts.heading, fontSize: 17, lineHeight: 26 },
  'primary'
);
/** Default reading text. */
export const Body = make({ fontFamily: Fonts.body, fontSize: 16, lineHeight: 24 }, 'dim');
export const Small = make({ fontFamily: Fonts.body, fontSize: 13.5, lineHeight: 20 }, 'muted');
/** Uppercase monospace instrument label. */
export const Label = make(
  { fontFamily: Fonts.mono, fontSize: 11.5, lineHeight: 17, letterSpacing: 1.5, textTransform: 'uppercase' },
  'muted'
);
/** Monospace data / tape lines. */
export const Mono = make({ fontFamily: Fonts.mono, fontSize: 13, lineHeight: 19 }, 'dim');
/** Large monospace meter readout. */
export const MonoXL = make(
  { fontFamily: Fonts.monoBold, fontSize: 40, lineHeight: 54, letterSpacing: -0.5 },
  'primary'
);
