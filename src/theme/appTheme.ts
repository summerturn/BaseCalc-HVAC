// BaseCalc HVAC "Field Instrument" design tokens.
// Raw color values (not Tailwind classes) so themed colors switch by mode via inline style.

export type ThemeMode = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

export const DEFAULT_THEME_MODE: ThemeMode = 'dark';

export type AppColors = {
  mode: ResolvedTheme;
  statusBarStyle: 'light' | 'dark';

  // Surfaces
  bg: string;
  bgElevated: string;
  panel: string;
  panelElevated: string;
  inset: string;

  // Lines
  border: string;
  borderStrong: string;
  divider: string;

  // Text
  text: string;
  textDim: string;
  textMuted: string;
  textFaint: string;

  // Brand (HVAC airflow teal) — token names kept as `amber*` for cross-app parity
  amber: string;
  amberBright: string;
  amberSoft: string;
  onAmber: string;

  // Semantic
  pass: string;
  passBg: string;
  passBorder: string;
  fail: string;
  failBg: string;
  failBorder: string;
  info: string;

  // Misc
  placeholder: string;
  shadow: string;
};

// Calculator category accents (consistent across modes).
export const CATEGORY = {
  airflow: '#38BDF8',
  load: '#FB923C',
  duct: '#A78BFA',
  refrigerant: '#22C55E',
  psychrometrics: '#2DD4BF',
  hydronics: '#60A5FA',
  efficiency: '#84CC16',
  general: '#FBBF24',
} as const;

const dark: AppColors = {
  mode: 'dark',
  statusBarStyle: 'light',
  bg: '#090B11',
  bgElevated: '#10141F',
  panel: '#181E2B',
  panelElevated: '#202838',
  inset: '#0D1119',
  border: 'rgba(255,255,255,0.13)',
  borderStrong: 'rgba(255,255,255,0.22)',
  divider: 'rgba(255,255,255,0.10)',
  text: '#F3F5F9',
  textDim: '#C5CDD8',
  textMuted: '#A8B0BC',
  textFaint: '#7A8491',
  amber: '#14B8A6',
  amberBright: '#2DD4BF',
  amberSoft: 'rgba(45,212,191,0.14)',
  onAmber: '#04201C',
  pass: '#34D399',
  passBg: 'rgba(52,211,153,0.12)',
  passBorder: 'rgba(52,211,153,0.32)',
  fail: '#FB7185',
  failBg: 'rgba(251,113,133,0.12)',
  failBorder: 'rgba(251,113,133,0.34)',
  info: '#38BDF8',
  placeholder: '#8A94A3',
  shadow: '#000000',
};

const light: AppColors = {
  mode: 'light',
  statusBarStyle: 'dark',
  bg: '#E2E7EE',
  bgElevated: '#EEF1F6',
  panel: '#FFFFFF',
  panelElevated: '#FFFFFF',
  inset: '#EDF1F6',
  border: '#C8D0DC',
  borderStrong: '#B4BDCB',
  divider: '#E2E7EE',
  text: '#0E1116',
  textDim: '#3D4550',
  textMuted: '#646C79',
  textFaint: '#9AA2AE',
  amber: '#0F766E',
  amberBright: '#14B8A6',
  amberSoft: 'rgba(20,184,166,0.16)',
  onAmber: '#04201C',
  pass: '#0E9F6E',
  passBg: 'rgba(16,185,129,0.12)',
  passBorder: 'rgba(16,185,129,0.30)',
  fail: '#E11D48',
  failBg: 'rgba(225,29,72,0.10)',
  failBorder: 'rgba(225,29,72,0.26)',
  info: '#0284C7',
  placeholder: '#9AA2AE',
  shadow: '#1B2330',
};

const palettes: Record<ResolvedTheme, AppColors> = { dark, light };

export const resolveTheme = (
  mode: ThemeMode,
  system: 'light' | 'dark' | null | undefined
): ResolvedTheme => {
  if (mode === 'system') return system === 'light' ? 'light' : 'dark';
  return mode;
};

export const getColors = (
  mode: ThemeMode,
  system: 'light' | 'dark' | null | undefined
): AppColors => palettes[resolveTheme(mode, system)];
