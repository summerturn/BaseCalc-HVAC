import { Alert } from 'react-native';
import { useNavigation, type NavigationProp, type ParamListBase } from '@react-navigation/native';
import { useAppStore } from '../store/useAppStore';
import { FREE_TIER_LIMITS } from '../lib/config';
import { activeInvoiceCount, canCreateClient, canCreateInvoice } from '../lib/accessPolicy';

export function useSubscription() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { isPro, clients, invoices } = useAppStore();
  const snapshot = {
    isPro,
    clientCount: clients.length,
    activeInvoiceCount: activeInvoiceCount(invoices),
  };

  const canAddClient = (): boolean => {
    if (canCreateClient(snapshot)) return true;
    showLimitPrompt('client');
    return false;
  };

  const canAddInvoice = (): boolean => {
    if (canCreateInvoice(snapshot)) return true;
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
