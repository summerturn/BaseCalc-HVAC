import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState as NativeAppState } from 'react-native';
import mobileAds, {
  AdEventType,
  AdsConsent,
  AdsConsentPrivacyOptionsRequirementStatus,
  MaxAdContentRating,
  RewardedAd,
  RewardedAdEventType,
} from 'react-native-google-mobile-ads';
import { useAppStore } from '../store/useAppStore';
import { ADS_CONFIGURED, ADS_USE_TEST_IDS, REWARDED_AD_UNIT_ID } from './adConfig';
import {
  adsAllowedForPlan,
  rewardedTerminalOutcome,
  type RewardedAdOutcome,
  type RewardedAdStatus,
} from './adPolicy';

export type { RewardedAdOutcome, RewardedAdStatus } from './adPolicy';

type PendingReward = {
  resolve: (outcome: RewardedAdOutcome) => void;
  timeout: ReturnType<typeof setTimeout>;
};

type AdsContextValue = {
  adsReady: boolean;
  rewardedReady: boolean;
  rewardedStatus: RewardedAdStatus;
  privacyOptionsRequired: boolean;
  retryRewardedAd: () => void;
  showRewardedAd: () => Promise<RewardedAdOutcome>;
  showPrivacyOptions: () => Promise<boolean>;
};

const AdsContext = createContext<AdsContextValue | null>(null);
const MAX_REWARDED_RETRY_ATTEMPTS = 10;

function useStoreHydrated(): boolean {
  const [hydrated, setHydrated] = useState(() => useAppStore.persist.hasHydrated());

  useEffect(() => {
    const unsubscribe = useAppStore.persist.onFinishHydration(() => setHydrated(true));
    if (useAppStore.persist.hasHydrated()) setHydrated(true);
    return unsubscribe;
  }, []);

  return hydrated;
}

export function AdsProvider({ children }: { children: ReactNode }) {
  const isPro = useAppStore((state) => state.isPro);
  const refreshProStatus = useAppStore((state) => state.refreshProStatus);
  const storeHydrated = useStoreHydrated();
  const [entitlementChecked, setEntitlementChecked] = useState(false);
  const adsAllowed = adsAllowedForPlan({
    configured: ADS_CONFIGURED,
    storeHydrated,
    entitlementChecked,
    isPro,
  });
  const [adsReady, setAdsReady] = useState(false);
  const [rewardedStatus, setRewardedStatus] = useState<RewardedAdStatus>(
    ADS_CONFIGURED ? 'initializing' : 'disabled'
  );
  const [privacyOptionsRequired, setPrivacyOptionsRequired] = useState(false);
  const [rewardedGeneration, setRewardedGeneration] = useState(0);
  const [consentGeneration, setConsentGeneration] = useState(0);
  const rewardedRef = useRef<RewardedAd | null>(null);
  const pendingRewardRef = useRef<PendingReward | null>(null);
  const rewardEarnedRef = useRef(false);
  const rewardedRetryAttemptRef = useRef(0);
  const rewardedRetryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!storeHydrated) return undefined;
    let cancelled = false;
    void refreshProStatus()
      .catch((error: unknown) => {
        console.warn('[RevenueCat] Initial entitlement refresh failed:', error);
      })
      .finally(() => {
        if (!cancelled) setEntitlementChecked(true);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshProStatus, storeHydrated]);

  const clearRewardedRetryTimer = useCallback(() => {
    if (!rewardedRetryTimerRef.current) return;
    clearTimeout(rewardedRetryTimerRef.current);
    rewardedRetryTimerRef.current = null;
  }, []);

  const settleReward = useCallback((outcome: RewardedAdOutcome) => {
    const pending = pendingRewardRef.current;
    if (!pending) return;
    clearTimeout(pending.timeout);
    pendingRewardRef.current = null;
    pending.resolve(outcome);
  }, []);

  const scheduleRewardedReload = useCallback((delayMs: number) => {
    clearRewardedRetryTimer();
    rewardedRetryTimerRef.current = setTimeout(() => {
      rewardedRetryTimerRef.current = null;
      setRewardedGeneration((generation) => generation + 1);
    }, delayMs);
  }, [clearRewardedRetryTimer]);

  useEffect(() => {
    if (!adsAllowed) {
      clearRewardedRetryTimer();
      setAdsReady(false);
      setRewardedStatus('disabled');
      settleReward('unavailable');
      return;
    }

    let cancelled = false;
    setRewardedStatus('initializing');

    const startAds = async () => {
      try {
        let consentInfo;
        try {
          consentInfo = await AdsConsent.gatherConsent({ tagForUnderAgeOfConsent: false });
        } catch (error) {
          console.warn('[Ads] Consent refresh failed; checking the previous consent state:', error);
          consentInfo = await AdsConsent.getConsentInfo();
        }

        if (cancelled) return;
        setPrivacyOptionsRequired(
          consentInfo.privacyOptionsRequirementStatus ===
            AdsConsentPrivacyOptionsRequirementStatus.REQUIRED
        );
        if (!consentInfo.canRequestAds) {
          setAdsReady(false);
          setRewardedStatus('disabled');
          return;
        }

        await mobileAds().setRequestConfiguration({
          maxAdContentRating: MaxAdContentRating.PG,
          tagForChildDirectedTreatment: false,
          tagForUnderAgeOfConsent: false,
          testDeviceIdentifiers: ADS_USE_TEST_IDS ? ['EMULATOR'] : [],
        });
        await mobileAds().initialize();
        if (!cancelled) setAdsReady(true);
      } catch (error) {
        console.warn('[Ads] Google Mobile Ads initialization failed:', error);
        if (!cancelled) {
          setAdsReady(false);
          setRewardedStatus('error');
        }
      }
    };

    void startAds();
    return () => {
      cancelled = true;
    };
  }, [
    adsAllowed,
    clearRewardedRetryTimer,
    consentGeneration,
    settleReward,
  ]);

  useEffect(() => {
    if (!adsReady || isPro) {
      rewardedRef.current = null;
      rewardEarnedRef.current = false;
      setRewardedStatus('disabled');
      settleReward('unavailable');
      return;
    }

    const rewarded = RewardedAd.createForAdRequest(REWARDED_AD_UNIT_ID, {
      requestNonPersonalizedAdsOnly: true,
    });
    rewardedRef.current = rewarded;
    rewardEarnedRef.current = false;
    setRewardedStatus('loading');

    const unsubscribeLoaded = rewarded.addAdEventListener(
      RewardedAdEventType.LOADED,
      () => {
        rewardedRetryAttemptRef.current = 0;
        setRewardedStatus('ready');
      }
    );
    const unsubscribeOpened = rewarded.addAdEventListener(AdEventType.OPENED, () => {
      setRewardedStatus('showing');
    });
    const unsubscribeEarned = rewarded.addAdEventListener(
      RewardedAdEventType.EARNED_REWARD,
      () => {
        rewardEarnedRef.current = true;
      }
    );
    const unsubscribeClosed = rewarded.addAdEventListener(AdEventType.CLOSED, () => {
      const outcome = rewardedTerminalOutcome(rewardEarnedRef.current, 'closed');
      rewardEarnedRef.current = false;
      setRewardedStatus('loading');
      settleReward(outcome);
      scheduleRewardedReload(0);
    });
    const unsubscribeError = rewarded.addAdEventListener(AdEventType.ERROR, (error) => {
      console.warn('[Ads] Rewarded ad failed:', error);
      const outcome = rewardedTerminalOutcome(rewardEarnedRef.current, 'error');
      rewardEarnedRef.current = false;
      setRewardedStatus('error');
      settleReward(outcome);

      rewardedRetryAttemptRef.current += 1;
      if (rewardedRetryAttemptRef.current <= MAX_REWARDED_RETRY_ATTEMPTS) {
        const retryDelayMs = Math.min(
          30_000,
          2 ** rewardedRetryAttemptRef.current * 1_000
        );
        scheduleRewardedReload(retryDelayMs);
      }
    });

    rewarded.load();
    return () => {
      unsubscribeLoaded();
      unsubscribeOpened();
      unsubscribeEarned();
      unsubscribeClosed();
      unsubscribeError();
      if (rewardedRef.current === rewarded) rewardedRef.current = null;
    };
  }, [
    adsReady,
    isPro,
    rewardedGeneration,
    scheduleRewardedReload,
    settleReward,
  ]);

  useEffect(() => {
    const appStateSubscription = NativeAppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active' || !adsReady || isPro) return;
      if (rewardedStatus === 'ready' || rewardedStatus === 'showing') return;
      rewardedRetryAttemptRef.current = 0;
      scheduleRewardedReload(0);
    });
    return () => appStateSubscription.remove();
  }, [adsReady, isPro, rewardedStatus, scheduleRewardedReload]);

  useEffect(() => () => {
    clearRewardedRetryTimer();
    settleReward('unavailable');
  }, [clearRewardedRetryTimer, settleReward]);

  const retryRewardedAd = useCallback(() => {
    if (!adsReady || isPro || pendingRewardRef.current || rewardedStatus === 'showing') return;
    rewardedRetryAttemptRef.current = 0;
    setRewardedStatus('loading');
    scheduleRewardedReload(0);
  }, [adsReady, isPro, rewardedStatus, scheduleRewardedReload]);

  const showRewardedAd = useCallback(async (): Promise<RewardedAdOutcome> => {
    const rewarded = rewardedRef.current;
    if (
      !adsReady ||
      isPro ||
      rewardedStatus !== 'ready' ||
      !rewarded?.loaded ||
      pendingRewardRef.current
    ) {
      if (adsReady && !isPro && rewardedStatus !== 'loading' && rewardedStatus !== 'showing') {
        retryRewardedAd();
      }
      return 'unavailable';
    }

    setRewardedStatus('showing');
    rewardEarnedRef.current = false;
    return new Promise<RewardedAdOutcome>((resolve) => {
      pendingRewardRef.current = {
        resolve,
        timeout: setTimeout(() => {
          rewardEarnedRef.current = false;
          setRewardedStatus('error');
          settleReward('error');
          scheduleRewardedReload(30_000);
        }, 5 * 60 * 1_000),
      };
      void rewarded.show().catch((error: unknown) => {
        console.warn('[Ads] Rewarded ad could not be presented:', error);
        rewardEarnedRef.current = false;
        setRewardedStatus('error');
        settleReward('error');
        scheduleRewardedReload(30_000);
      });
    });
  }, [
    adsReady,
    isPro,
    retryRewardedAd,
    rewardedStatus,
    scheduleRewardedReload,
    settleReward,
  ]);

  const showPrivacyOptions = useCallback(async (): Promise<boolean> => {
    try {
      const consentInfo = await AdsConsent.showPrivacyOptionsForm();
      setPrivacyOptionsRequired(
        consentInfo.privacyOptionsRequirementStatus ===
          AdsConsentPrivacyOptionsRequirementStatus.REQUIRED
      );
      setConsentGeneration((generation) => generation + 1);
      return true;
    } catch (error) {
      console.warn('[Ads] Privacy options could not be shown:', error);
      return false;
    }
  }, []);

  const value = useMemo<AdsContextValue>(() => ({
    adsReady: adsReady && !isPro,
    rewardedReady: rewardedStatus === 'ready' && !isPro,
    rewardedStatus: isPro ? 'disabled' : rewardedStatus,
    privacyOptionsRequired: privacyOptionsRequired && !isPro,
    retryRewardedAd,
    showRewardedAd,
    showPrivacyOptions,
  }), [
    adsReady,
    isPro,
    privacyOptionsRequired,
    retryRewardedAd,
    rewardedStatus,
    showPrivacyOptions,
    showRewardedAd,
  ]);

  return <AdsContext.Provider value={value}>{children}</AdsContext.Provider>;
}

export function useAds(): AdsContextValue {
  const value = useContext(AdsContext);
  if (!value) throw new Error('useAds must be used inside AdsProvider.');
  return value;
}
