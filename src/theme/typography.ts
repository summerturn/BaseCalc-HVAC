import {
  Saira_500Medium,
  Saira_600SemiBold,
  Saira_700Bold,
  Saira_900Black,
} from '@expo-google-fonts/saira';
import {
  JetBrainsMono_500Medium,
  JetBrainsMono_700Bold,
} from '@expo-google-fonts/jetbrains-mono';

// Passed to expo-font's useFonts(). Registered family name === key.
export const fontMap = {
  Saira_500Medium,
  Saira_600SemiBold,
  Saira_700Bold,
  Saira_900Black,
  JetBrainsMono_500Medium,
  JetBrainsMono_700Bold,
};

// Semantic font roles. iOS falls back to system font if a family fails to load.
export const Fonts = {
  body: 'Saira_500Medium',
  label: 'Saira_600SemiBold',
  heading: 'Saira_700Bold',
  display: 'Saira_900Black',
  mono: 'JetBrainsMono_500Medium',
  monoBold: 'JetBrainsMono_700Bold',
} as const;
