import { FREE_TIER_LIMITS } from './config';

export type CreationBlockReason = 'client_limit' | 'invoice_limit';
export type CreationResult =
  | { ok: true; id: string }
  | { ok: false; reason: CreationBlockReason };

export interface AccessSnapshot {
  isPro: boolean;
  clientCount: number;
  activeInvoiceCount: number;
}

export function canCreateClient(snapshot: AccessSnapshot): boolean {
  return snapshot.isPro || snapshot.clientCount < FREE_TIER_LIMITS.maxClients;
}

export function canCreateInvoice(snapshot: AccessSnapshot): boolean {
  return snapshot.isPro || snapshot.activeInvoiceCount < FREE_TIER_LIMITS.maxActiveInvoices;
}

export function activeInvoiceCount(invoices: ReadonlyArray<{ status: string }>): number {
  return invoices.filter((invoice) => invoice.status !== 'paid').length;
}
