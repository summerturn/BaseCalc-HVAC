import { createContext, createElement, useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { useAppStore } from '../store/useAppStore';
import { AppColors, DEFAULT_THEME_MODE, getColors, ThemeMode } from './appTheme';

type ThemeContextValue = {
  colors: AppColors;
  mode: 'light' | 'dark';
  isDark: boolean;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
};

const fallback = getColors('dark', 'dark');
const ThemeContext = createContext<ThemeContextValue>({
  colors: fallback,
  mode: 'dark',
  isDark: true,
  themeMode: DEFAULT_THEME_MODE,
  setThemeMode: () => {},
});

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const themeMode = useAppStore((s) => s.themeMode);
  const setThemeMode = useAppStore((s) => s.setThemeMode);
  const systemTheme = useColorScheme();
  const resolvedSystem = systemTheme === 'light' || systemTheme === 'dark' ? systemTheme : 'dark';

  const value = useMemo<ThemeContextValue>(() => {
    const colors = getColors(themeMode, resolvedSystem);
    return {
      colors,
      mode: colors.mode,
      isDark: colors.mode === 'dark',
      themeMode,
      setThemeMode,
    };
  }, [themeMode, resolvedSystem, setThemeMode]);

  return createElement(ThemeContext.Provider, { value }, children);
}

export function useAppTheme() {
  return useContext(ThemeContext);
}

export function useColors() {
  return useContext(ThemeContext).colors;
}
