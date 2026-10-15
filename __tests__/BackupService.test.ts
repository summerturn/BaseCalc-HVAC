jest.mock('../src/lib/config', () => ({
  FREE_TIER_LIMITS: { maxClients: 3, maxActiveInvoices: 5 },
  isRevenueCatConfigured: jest.fn(() => false),
}));
jest.mock('../src/services/SubscriptionService', () => ({
  SubscriptionService: { checkStatus: jest.fn(() => Promise.resolve(false)) },
}));
jest.mock('expo-sqlite', () => ({ openDatabaseAsync: jest.fn() }));

import { createBackupJson, parseBackup } from '../src/services/BackupService';
import { useAppStore } from '../src/store/useAppStore';
import AsyncStorage from '@react-native-async-storage/async-storage';

describe('portable local backup', () => {
  const base = () => {
    const { company } = useAppStore.getState();
    return {
      clients: [{
        id: 'client-1', name: 'Fictional Contact', email: '', phone: '', address: '',
        company: '', notes: '', createdAt: '2026-01-01', updatedAt: '2026-01-01', synced: false,
      }],
      invoices: [{
        id: 'job-1', clientId: 'client-1', invoiceNumber: 'JOB-1', date: '2026-01-01',
        dueDate: '2026-01-02', lineItems: [], subtotal: 0, taxRate: 0, taxAmount: 0,
        total: 0, paymentTerms: '', notes: '', status: 'draft' as const,
        createdAt: '2026-01-01', updatedAt: '2026-01-01', synced: false,
        pdfPath: 'file:///private/stale.pdf',
      }],
      calculations: [],
      templates: [],
      company,
    };
  };

  test('round trips job data without file paths or entitlement', () => {
    const json = createBackupJson(base());
    expect(json).not.toContain('stale.pdf');
    expect(json).not.toContain('isPro');
    expect(parseBackup(json).invoices[0].pdfPath).toBeUndefined();
  });

  test('rejects wrong trade, version, malformed records, and broken references', () => {
    const data = base();
    expect(() => parseBackup('{}')).toThrow('supported BaseCalc HVAC');
    expect(() => parseBackup(createBackupJson(data).replace('"version":1', '"version":2'))).toThrow('supported BaseCalc HVAC');
    expect(() => parseBackup(createBackupJson({ ...data, invoices: [{ ...data.invoices[0], clientId: 'missing' }] }))).toThrow('broken job references');
    expect(() => parseBackup(createBackupJson(data).replace('"name":"Fictional Contact"', '"name":123'))).toThrow('invalid');
  });

  test('restoring records leaves subscription state untouched', async () => {
    useAppStore.setState({ isPro: true, proLastVerifiedAt: 1234 });
    await useAppStore.getState().restoreLocalData(base());
    expect(useAppStore.getState().isPro).toBe(true);
    expect(useAppStore.getState().proLastVerifiedAt).toBe(1234);
    const writes = jest.mocked(AsyncStorage.setItem).mock.calls;
    const persisted = JSON.parse(writes[writes.length - 1][1]) as { state: { isPro: boolean; invoices: { pdfPath?: string }[] } };
    expect(persisted.state.isPro).toBe(true);
    expect(persisted.state.invoices[0].pdfPath).toBeUndefined();
  });

  test('deleting attached history removes dangling worksheet references', async () => {
    const data = base();
    await useAppStore.getState().restoreLocalData({
      ...data,
      invoices: [{ ...data.invoices[0], calculationIds: ['calc-1'] }],
      calculations: [{
        id: 'calc-1', type: 'ductLeakage', inputs: { fanCfm: 1000 },
        result: { ok: true, message: '', fields: [], details: [] },
        createdAt: '2026-01-01', synced: false,
      }],
    });
    useAppStore.getState().deleteCalculation('calc-1');
    expect(useAppStore.getState().invoices[0].calculationIds).toEqual([]);
    expect(() => parseBackup(createBackupJson({
      clients: useAppStore.getState().clients,
      invoices: useAppStore.getState().invoices,
      calculations: useAppStore.getState().calculations,
      templates: [],
      company: useAppStore.getState().company,
    }))).not.toThrow();
  });

  test('worksheet templates require Pro at the store boundary', async () => {
    const data = base();
    await useAppStore.getState().restoreLocalData(data);
    useAppStore.setState({ isPro: false });
    useAppStore.getState().addTemplate('Service', data.invoices[0]);
    expect(useAppStore.getState().templates).toHaveLength(0);
    useAppStore.setState({ isPro: true });
    useAppStore.getState().addTemplate('Service', data.invoices[0]);
    expect(useAppStore.getState().templates[0].name).toBe('Service');
  });

  test('a rejected durable write leaves live job records unchanged', async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
    const previous = base();
    await useAppStore.getState().restoreLocalData(previous);
    await new Promise((resolve) => setTimeout(resolve, 0));
    const originalClient = useAppStore.getState().clients[0];
    jest.mocked(AsyncStorage.setItem).mockRejectedValueOnce(new Error('storage unavailable'));
    await expect(useAppStore.getState().restoreLocalData({
      ...previous,
      clients: [{ ...originalClient, name: 'Replacement' }],
    })).rejects.toThrow('storage unavailable');
    expect(useAppStore.getState().clients[0]).toEqual(originalClient);
    expect(useAppStore.getState().invoices[0].pdfPath).toBeUndefined();
  });

  test('live records change only after the backup write resolves', async () => {
    const previous = base();
    await useAppStore.getState().restoreLocalData(previous);
    let finishWrite: (() => void) | undefined;
    jest.mocked(AsyncStorage.setItem).mockImplementationOnce(() => new Promise<void>((resolve) => {
      finishWrite = resolve;
    }));
    const pending = useAppStore.getState().restoreLocalData({
      ...previous,
      clients: [{ ...previous.clients[0], name: 'New Contact' }],
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(useAppStore.getState().clients[0].name).toBe('Fictional Contact');
    expect(finishWrite).toBeDefined();
    finishWrite?.();
    await pending;
    expect(useAppStore.getState().clients[0].name).toBe('New Contact');
  });

  test('an intervening ordinary update cannot overwrite restored records', async () => {
    const previous = base();
    await useAppStore.getState().restoreLocalData(previous);
    await new Promise((resolve) => setTimeout(resolve, 0));
    let finishFirstWrite: (() => void) | undefined;
    const writesBefore = jest.mocked(AsyncStorage.setItem).mock.calls.length;
    jest.mocked(AsyncStorage.setItem).mockImplementationOnce(() => new Promise<void>((resolve) => {
      finishFirstWrite = resolve;
    }));
    const pending = useAppStore.getState().restoreLocalData({
      ...previous,
      clients: [{ ...previous.clients[0], name: 'Restored Contact' }],
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(finishFirstWrite).toBeDefined();
    useAppStore.getState().setPro(true);
    finishFirstWrite?.();
    await pending;
    const writes = jest.mocked(AsyncStorage.setItem).mock.calls.slice(writesBefore);
    expect(writes).toHaveLength(2);
    const finalStored = JSON.parse(writes[writes.length - 1][1]) as {
      state: { clients: { name: string }[]; isPro: boolean };
    };
    expect(finalStored.state.clients[0].name).toBe('Restored Contact');
    expect(finalStored.state.isPro).toBe(true);
    expect(useAppStore.getState().clients[0].name).toBe('Restored Contact');
  });

  test('a failed follow-up settings write does not split live records from a saved restore', async () => {
    const previous = base();
    await useAppStore.getState().restoreLocalData(previous);
    await new Promise((resolve) => setTimeout(resolve, 0));
    let finishFirstWrite: (() => void) | undefined;
    const writesBefore = jest.mocked(AsyncStorage.setItem).mock.calls.length;
    jest.mocked(AsyncStorage.setItem).mockImplementationOnce(() => new Promise<void>((resolve) => {
      finishFirstWrite = resolve;
    }));
    jest.mocked(AsyncStorage.setItem).mockRejectedValueOnce(new Error('second write unavailable'));
    const warning = jest.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const pending = useAppStore.getState().restoreLocalData({
        ...previous,
        clients: [{ ...previous.clients[0], name: 'Saved Replacement' }],
      });
      await new Promise((resolve) => setTimeout(resolve, 0));
      useAppStore.getState().setPro(true);
      finishFirstWrite?.();
      await expect(pending).resolves.toBeUndefined();
      const writes = jest.mocked(AsyncStorage.setItem).mock.calls.slice(writesBefore);
      expect(writes).toHaveLength(2);
      const savedReplacement = JSON.parse(writes[0][1]) as { state: { clients: { name: string }[] } };
      expect(savedReplacement.state.clients[0].name).toBe('Saved Replacement');
      expect(useAppStore.getState().clients[0].name).toBe('Saved Replacement');
      expect(warning).toHaveBeenCalledWith('[Storage] Could not save a concurrent settings update after restore.');
    } finally {
      warning.mockRestore();
    }
  });

  test('a later settings update queues after a delayed follow-up write', async () => {
    const previous = base();
    await useAppStore.getState().restoreLocalData(previous);
    useAppStore.getState().setThemeMode('light');
    await new Promise((resolve) => setTimeout(resolve, 0));
    let finishFirstWrite: (() => void) | undefined;
    let finishFollowUp: (() => void) | undefined;
    const writesBefore = jest.mocked(AsyncStorage.setItem).mock.calls.length;
    jest.mocked(AsyncStorage.setItem).mockImplementationOnce(() => new Promise<void>((resolve) => {
      finishFirstWrite = resolve;
    }));
    jest.mocked(AsyncStorage.setItem).mockImplementationOnce(() => new Promise<void>((resolve) => {
      finishFollowUp = resolve;
    }));
    const pending = useAppStore.getState().restoreLocalData({
      ...previous,
      clients: [{ ...previous.clients[0], name: 'Transferred Contact' }],
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
    useAppStore.getState().setPro(true);
    finishFirstWrite?.();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(finishFollowUp).toBeDefined();
    useAppStore.getState().setThemeMode('dark');
    finishFollowUp?.();
    await pending;
    await new Promise((resolve) => setTimeout(resolve, 0));
    const writes = jest.mocked(AsyncStorage.setItem).mock.calls.slice(writesBefore);
    expect(writes).toHaveLength(3);
    const last = JSON.parse(writes[writes.length - 1][1]) as {
      state: { clients: { name: string }[]; themeMode: string };
    };
    expect(last.state.clients[0].name).toBe('Transferred Contact');
    expect(last.state.themeMode).toBe('dark');
  });
});
