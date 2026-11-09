import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { useAds } from '../ads/AdsProvider';
import { BANNER_AD_UNIT_ID } from '../ads/adConfig';
import { useAppStore } from '../store/useAppStore';
import { useColors } from '../theme/useAppTheme';
import { Label } from './Type';

const BANNER_RETRY_DELAY_MS = 30_000;
const INLINE_AD_MAX_HEIGHT = 100;
const INLINE_AD_SLOT_MIN_HEIGHT = 132;

export function AdBanner() {
  const isPro = useAppStore((state) => state.isPro);
  const { adsReady } = useAds();
  const colors = useColors();
  const [loaded, setLoaded] = useState(false);
  const [requestKey, setRequestKey] = useState(0);

  useEffect(() => {
    if (isPro || !adsReady) setLoaded(false);
  }, [adsReady, isPro]);

  useEffect(() => {
    if (isPro || !adsReady || loaded) return undefined;
    const timer = setTimeout(() => {
      setRequestKey((key) => key + 1);
    }, BANNER_RETRY_DELAY_MS);
    return () => clearTimeout(timer);
  }, [adsReady, isPro, loaded, requestKey]);

  if (isPro || !adsReady) return null;
  return (
    <View
      accessibilityLabel={loaded ? 'Sponsored advertisement' : undefined}
      style={{
        alignItems: 'center',
        alignSelf: 'stretch',
        justifyContent: 'center',
        minHeight: INLINE_AD_SLOT_MIN_HEIGHT,
        marginTop: 20,
        marginBottom: 4,
        paddingVertical: 10,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderTopColor: colors.border,
        borderBottomColor: colors.border,
      }}
    >
      <Label tone="muted" style={{ marginBottom: 6, fontSize: 10 }}>SPONSORED</Label>
      <BannerAd
        key={requestKey}
        unitId={BANNER_AD_UNIT_ID}
        size={BannerAdSize.INLINE_ADAPTIVE_BANNER}
        maxHeight={INLINE_AD_MAX_HEIGHT}
        requestOptions={{ requestNonPersonalizedAdsOnly: true }}
        onAdLoaded={() => setLoaded(true)}
        onAdFailedToLoad={(error) => {
          console.warn('[Ads] Banner failed to load:', error);
          setLoaded(false);
        }}
      />
    </View>
  );
}
