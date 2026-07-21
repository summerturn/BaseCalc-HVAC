jest.mock('../src/lib/config', () => ({
  FREE_TIER_LIMITS: {
    maxClients: 3,
    maxActiveInvoices: 5,
  },
  isRevenueCatConfigured: jest.fn(() => true),
}));

jest.mock('../src/services/SubscriptionService', () => ({
  SubscriptionService: {
    checkStatus: jest.fn(() => Promise.resolve(false)),
  },
}));

jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn(),
}));

import { SubscriptionService } from '../src/services/SubscriptionService';
import { useAppStore } from '../src/store/useAppStore';

const checkStatusMock = jest.mocked(SubscriptionService.checkStatus);

const clientData = (name: string) => ({
  name,
  email: '',
  phone: '',
  address: '',
  company: '',
  notes: '',
});

const invoiceData = (sequence: number) => ({
  clientId: 'client-1',
  invoiceNumber: `JOB-TEST-${sequence}`,
  date: '2026-07-20T00:00:00.000Z',
  dueDate: '2026-08-20T00:00:00.000Z',
  lineItems: [],
  subtotal: 0,
  taxRate: 0,
  taxAmount: 0,
  total: 0,
  paymentTerms: '',
  notes: '',
  status: 'draft' as const,
});

describe('store-level access enforcement', () => {
  beforeEach(() => {
    checkStatusMock.mockReset().mockResolvedValue(false);
    useAppStore.setState({
      clients: [],
      invoices: [],
      calculations: [],
      isPro: false,
      proLastVerifiedAt: null,
    });
  });

  test('cannot bypass the client quota by calling the store directly', () => {
    expect(useAppStore.getState().addClient(clientData('One')).ok).toBe(true);
    expect(useAppStore.getState().addClient(clientData('Two')).ok).toBe(true);
    expect(useAppStore.getState().addClient(clientData('Three')).ok).toBe(true);

    expect(useAppStore.getState().addClient(clientData('Four'))).toEqual({
      ok: false,
      reason: 'client_limit',
    });
    expect(useAppStore.getState().clients).toHaveLength(3);
  });

  test('cannot bypass the active-worksheet quota by calling the store directly', () => {
    for (let sequence = 1; sequence <= 5; sequence += 1) {
      expect(useAppStore.getState().addInvoice(invoiceData(sequence)).ok).toBe(true);
    }

    expect(useAppStore.getState().addInvoice(invoiceData(6))).toEqual({
      ok: false,
      reason: 'invoice_limit',
    });
    expect(useAppStore.getState().invoices).toHaveLength(5);
  });

  test('does not duplicate worksheet numbers after a deletion', () => {
    const store = useAppStore.getState();
    const firstNumber = store.generateInvoiceNumber();
    const first = store.addInvoice({ ...invoiceData(1), invoiceNumber: firstNumber });
    const secondNumber = useAppStore.getState().generateInvoiceNumber();
    useAppStore.getState().addInvoice({ ...invoiceData(2), invoiceNumber: secondNumber });
    if (first.ok) useAppStore.getState().deleteInvoice(first.id);

    const nextNumber = useAppStore.getState().generateInvoiceNumber();
    expect(nextNumber).not.toBe(secondNumber);
    expect(nextNumber.endsWith('-0003')).toBe(true);
  });

  test('a failed entitlement refresh preserves recently verified Pro access', async () => {
    const warning = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    checkStatusMock.mockRejectedValueOnce(new Error('offline'));
    useAppStore.getState().setPro(true);

    await useAppStore.getState().refreshProStatus();

    expect(checkStatusMock).toHaveBeenCalledWith({ forceRefresh: true });
    expect(useAppStore.getState().isPro).toBe(true);
    warning.mockRestore();
  });

  test('a failed entitlement refresh revokes an expired offline grace record', async () => {
    const warning = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    checkStatusMock.mockRejectedValueOnce(new Error('offline'));
    useAppStore.setState({
      isPro: true,
      proLastVerifiedAt: Date.now() - 3 * 24 * 60 * 60 * 1000 - 1,
    });

    await useAppStore.getState().refreshProStatus();

    expect(useAppStore.getState().isPro).toBe(false);
    warning.mockRestore();
  });

  test('an older refresh cannot overwrite a newer purchase result', async () => {
    let resolveRefresh: ((active: boolean) => void) | undefined;
    checkStatusMock.mockImplementationOnce(() => new Promise<boolean>((resolve) => {
      resolveRefresh = resolve;
    }));

    const refresh = useAppStore.getState().refreshProStatus();
    useAppStore.getState().setPro(true);
    resolveRefresh?.(false);
    await refresh;

    expect(useAppStore.getState().isPro).toBe(true);
  });
});
