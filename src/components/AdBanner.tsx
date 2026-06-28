import { View } from 'react-native';
import { useAppStore } from '../store/useAppStore';

export function AdBanner() {
  const { isPro } = useAppStore();
  if (isPro) return null;
  return null;
}

/** Pushes the banner to the bottom of a ScrollView/FlatList content area. */
export function FooterAdBanner() {
  return (
    <>
      <View style={{ flex: 1 }} />
      <AdBanner />
    </>
  );
}
