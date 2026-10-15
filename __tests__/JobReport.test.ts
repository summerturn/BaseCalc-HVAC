jest.mock('../src/lib/config', () => ({
  FREE_TIER_LIMITS: { maxClients: 3, maxActiveInvoices: 5 },
  isRevenueCatConfigured: jest.fn(() => false),
}));
jest.mock('../src/services/SubscriptionService', () => ({
  SubscriptionService: { checkStatus: jest.fn(() => Promise.resolve(false)) },
}));
jest.mock('expo-sqlite', () => ({ openDatabaseAsync: jest.fn() }));

import { generateInvoiceHTML } from '../src/services/InvoiceService';
import { useAppStore, type Invoice, type CalculationRecord } from '../src/store/useAppStore';

test('report includes worksheet, notes, and selected calculation inputs and results safely', () => {
  const invoice: Invoice = {
    id: 'job', clientId: 'client', invoiceNumber: 'JOB-1', date: '2026-01-01',
    dueDate: '2026-01-02', lineItems: [{ id: 'item', description: 'Filter <MERV>', quantity: 2, unitPrice: 0, total: 0 }],
    subtotal: 0, taxRate: 0, taxAmount: 0, total: 0, paymentTerms: '',
    notes: 'Inspect & document', status: 'draft', createdAt: '2026-01-01',
    updatedAt: '2026-01-01', synced: false,
  };
  const calc: CalculationRecord = {
    id: 'calc', type: 'ductLeakage', inputs: { fanCfm: 1000, deliveredCfm: 900 },
    result: { message: '10% <difference>', fields: [{ label: 'Difference', value: '10.0', unit: '%' }], details: ['Measured only'] },
    createdAt: '2026-01-01', synced: false,
  };
  const html = generateInvoiceHTML(invoice, useAppStore.getState().company, 'Synthetic & Contact', [calc], true);
  expect(html).toContain('JOB REPORT');
  expect(html).toContain('Saved Calculation History');
  expect(html).toContain('fanCfm');
  expect(html).toContain('10.0');
  expect(html).toContain('Filter &lt;MERV&gt;');
  expect(html).toContain('Inspect &amp; document');
  expect(html).not.toContain('10% <difference>');
});
