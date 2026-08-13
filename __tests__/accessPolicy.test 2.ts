import {
  activeInvoiceCount,
  canCreateClient,
  canCreateInvoice,
} from '../src/lib/accessPolicy';

describe('free-tier access policy', () => {
  test('blocks the next client and open worksheet at the configured limits', () => {
    expect(canCreateClient({ isPro: false, clientCount: 2, activeInvoiceCount: 0 })).toBe(true);
    expect(canCreateClient({ isPro: false, clientCount: 3, activeInvoiceCount: 0 })).toBe(false);
    expect(canCreateInvoice({ isPro: false, clientCount: 0, activeInvoiceCount: 4 })).toBe(true);
    expect(canCreateInvoice({ isPro: false, clientCount: 0, activeInvoiceCount: 5 })).toBe(false);
  });

  test('counts every non-closed worksheet and ignores closed worksheets', () => {
    expect(activeInvoiceCount([
      { status: 'draft' },
      { status: 'sent' },
      { status: 'overdue' },
      { status: 'paid' },
    ])).toBe(3);
  });

  test('allows Pro creation beyond free-tier limits', () => {
    expect(canCreateClient({ isPro: true, clientCount: 100, activeInvoiceCount: 100 })).toBe(true);
    expect(canCreateInvoice({ isPro: true, clientCount: 100, activeInvoiceCount: 100 })).toBe(true);
  });
});
