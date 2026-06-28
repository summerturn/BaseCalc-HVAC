import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppStore } from '../store/useAppStore';
import { FREE_TIER_LIMITS, isRevenueCatConfigured } from '../lib/config';

export function useSubscription() {
  const navigation = useNavigation<any>();
  const { isPro, clients, invoices } = useAppStore();
  const purchasesEnabled = isRevenueCatConfigured();

  const canAddClient = (): boolean => {
    if (!purchasesEnabled) return true;
    if (isPro) return true;
    if (clients.length < FREE_TIER_LIMITS.maxClients) return true;
    showLimitPrompt('client');
    return false;
  };

  const canAddInvoice = (): boolean => {
    if (!purchasesEnabled) return true;
    if (isPro) return true;
    const active = invoices.filter((i) => i.status !== 'paid');
    if (active.length < FREE_TIER_LIMITS.maxActiveInvoices) return true;
    showLimitPrompt('invoice');
    return false;
  };

  const showLimitPrompt = (type: 'client' | 'invoice') => {
    const label = type === 'client' ? 'job contacts' : 'open job worksheets';
    const limit = type === 'client' ? FREE_TIER_LIMITS.maxClients : FREE_TIER_LIMITS.maxActiveInvoices;
    Alert.alert(
      'Free limit reached',
      `The free plan allows up to ${limit} ${label}. Upgrade to Pro for unlimited local field records.`,
      [
        { text: 'Not now', style: 'cancel' },
        { text: 'Upgrade', onPress: () => navigation.navigate('Paywall') },
      ]
    );
  };

  return { isPro, canAddClient, canAddInvoice, showLimitPrompt };
}
