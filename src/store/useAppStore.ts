import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { File } from 'expo-file-system';
import * as SQLite from 'expo-sqlite';
import { DEFAULT_THEME_MODE, ThemeMode } from '../theme/appTheme';
import { isRevenueCatConfigured } from '../lib/config';
import {
  activeInvoiceCount,
  canCreateClient,
  canCreateInvoice,
  type CreationResult,
} from '../lib/accessPolicy';
import { SubscriptionService } from '../services/SubscriptionService';

// ─── Types ───────────────────────────────────────────────────────────

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  company: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
  synced: boolean;
}

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  fromCalculation?: boolean;
  calculationType?: string;
}

export interface Invoice {
  id: string;
  clientId: string;
  invoiceNumber: string;
  date: string;
  dueDate: string;
  lineItems: InvoiceLineItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  paymentTerms: string;
  notes: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue';
  createdAt: string;
  updatedAt: string;
  synced: boolean;
  pdfPath?: string;
}

export interface CalculationRecord {
  id: string;
  clientId?: string;
  type:
    | 'btuTons'
    | 'cfmFromBtu'
    | 'btuFromCfm'
    | 'ductSizing'
    | 'airVelocity'
    | 'psychrometrics'
    | 'refrigerantLines'
    | 'superheatSubcool'
    | 'roomLoad'
    | 'heatPumpBalance'
    | 'hydronics'
    | 'mixedAir'
    | 'airChanges'
    | 'evaporativeCooling'
    | 'filterVelocity'
    | 'combustionAnalysis'
    | 'refrigerantWeight'
    | 'economizer';
  inputs: Record<string, any>;
  result: Record<string, any>;
  createdAt: string;
  synced: boolean;
}

export interface CompanySettings {
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  email: string;
  logo?: string;
  taxRate: number;
  paymentTerms: string;
}

export interface PendingDeletes {
  clients: string[];
  invoices: string[];
  calculations: string[];
}

export interface AppState {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;

  // Clients
  clients: Client[];
  addClient: (client: Omit<Client, 'id' | 'createdAt' | 'updatedAt' | 'synced'>) => CreationResult;
  updateClient: (id: string, updates: Partial<Client>) => void;
  deleteClient: (id: string) => void;
  getClientById: (id: string) => Client | undefined;
  getClientJobs: (clientId: string) => (Invoice | CalculationRecord)[];

  // Invoices
  invoices: Invoice[];
  addInvoice: (invoice: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt' | 'synced'>) => CreationResult;
  updateInvoice: (id: string, updates: Partial<Invoice>) => void;
  deleteInvoice: (id: string) => void;
  getInvoiceById: (id: string) => Invoice | undefined;
  getInvoicesByClient: (clientId: string) => Invoice[];
  generateInvoiceNumber: () => string;

  // Calculations
  calculations: CalculationRecord[];
  addCalculation: (calc: Omit<CalculationRecord, 'id' | 'createdAt' | 'synced'>) => void;
  deleteCalculation: (id: string) => void;

  // Company
  company: CompanySettings;
  updateCompany: (updates: Partial<CompanySettings>) => void;

  // Offline/Sync
  isOnline: boolean;
  pendingDeletes: PendingDeletes;
  setOnline: (online: boolean) => void;
  sync: () => Promise<void>;
  pendingSyncCount: () => number;

  // RevenueCat
  isPro: boolean;
  proLastVerifiedAt: number | null;
  setPro: (pro: boolean) => void;
  refreshProStatus: () => Promise<void>;
}

const PRO_OFFLINE_GRACE_MS = 3 * 24 * 60 * 60 * 1000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function migratePersistedState(persistedState: unknown): unknown {
  if (!persistedState || typeof persistedState !== 'object') {
    return persistedState;
  }

  const state = persistedState as Record<string, unknown>;
  const verifiedAt = typeof state.proLastVerifiedAt === 'number' && Number.isFinite(state.proLastVerifiedAt)
    ? state.proLastVerifiedAt
    : null;
  const verificationAge = verifiedAt === null ? Number.POSITIVE_INFINITY : Date.now() - verifiedAt;
  const migrated: Record<string, unknown> = {
    ...state,
    clients: Array.isArray(state.clients) ? state.clients.filter(isRecord) : [],
    invoices: Array.isArray(state.invoices)
      ? state.invoices.filter((invoice) => isRecord(invoice) && Array.isArray(invoice.lineItems))
      : [],
    calculations: Array.isArray(state.calculations) ? state.calculations.filter(isRecord) : [],
    themeMode: state.themeMode === 'light' || state.themeMode === 'dark' ? state.themeMode : DEFAULT_THEME_MODE,
    isPro: state.isPro === true && verificationAge >= 0 && verificationAge <= PRO_OFFLINE_GRACE_MS,
    proLastVerifiedAt: verifiedAt,
  };
  if (!isRecord(state.company)) delete migrated.company;
  return migrated;
}

// ─── SQLite Setup (for offline persistence) ──────────────────────────

const APP_STORAGE_NAME = 'basecalc-hvac-storage';
const LEGACY_STORAGE_NAMES = ['nexduit-storage', 'tradecalc-storage', 'watthawk-storage', 'sparkcalc-storage'] as const;
const DATABASE_NAME = 'tradecalc.db';

const appStorage = {
  getItem: async (name: string) => {
    const value = await AsyncStorage.getItem(name);
    if (value !== null || name !== APP_STORAGE_NAME) return value;

    for (const legacyStorageName of LEGACY_STORAGE_NAMES) {
      const legacyValue = await AsyncStorage.getItem(legacyStorageName);
      if (legacyValue === null) continue;
      await AsyncStorage.setItem(APP_STORAGE_NAME, legacyValue);
      for (const staleStorageName of LEGACY_STORAGE_NAMES) {
        await AsyncStorage.removeItem(staleStorageName);
      }
      return legacyValue;
    }
    return null;
  },
  setItem: (name: string, value: string) => AsyncStorage.setItem(name, value),
  removeItem: async (name: string) => {
    await AsyncStorage.removeItem(name);
    if (name === APP_STORAGE_NAME) {
      for (const legacyStorageName of LEGACY_STORAGE_NAMES) {
        await AsyncStorage.removeItem(legacyStorageName);
      }
    }
  },
};

let db: SQLite.SQLiteDatabase | null = null;
let proStatusGeneration = 0;

function deleteGeneratedPdf(path: string | undefined): void {
  if (!path) return;
  try {
    const file = new File(path);
    if (file.exists) file.delete();
  } catch (error) {
    console.warn('[Storage] Could not remove generated worksheet PDF:', error);
  }
}

async function initDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;
  // Keep the existing on-device database filename so existing installs retain their data.
  db = await SQLite.openDatabaseAsync(DATABASE_NAME);

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS clients (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      address TEXT,
      company TEXT,
      notes TEXT,
      createdAt TEXT,
      updatedAt TEXT,
      synced INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS invoices (
      id TEXT PRIMARY KEY,
      clientId TEXT,
      invoiceNumber TEXT,
      date TEXT,
      dueDate TEXT,
      lineItems TEXT,
      subtotal REAL,
      taxRate REAL,
      taxAmount REAL,
      total REAL,
      paymentTerms TEXT,
      notes TEXT,
      status TEXT,
      createdAt TEXT,
      updatedAt TEXT,
      synced INTEGER DEFAULT 0,
      pdfPath TEXT
    );

    CREATE TABLE IF NOT EXISTS calculations (
      id TEXT PRIMARY KEY,
      clientId TEXT,
      type TEXT,
      inputs TEXT,
      result TEXT,
      createdAt TEXT,
      synced INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS company_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      name TEXT,
      address TEXT,
      city TEXT,
      state TEXT,
      zip TEXT,
      phone TEXT,
      email TEXT,
      logo TEXT,
      taxRate REAL DEFAULT 8.25,
      paymentTerms TEXT DEFAULT 'Create the final invoice in SpeakSheet.'
    );
  `);

  // Insert default company settings if not exists
  await db.runAsync(
    `INSERT OR IGNORE INTO company_settings (id, name, taxRate, paymentTerms) VALUES (1, 'My HVAC Company', 0, 'Create the final invoice in SpeakSheet.')`
  );

  return db;
}

// ─── Zustand Store ───────────────────────────────────────────────────

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // ─── Initial State ───
      clients: [],
      invoices: [],
      calculations: [],
      company: {
        name: 'My HVAC Company',
        address: '',
        city: '',
        state: '',
        zip: '',
        phone: '',
        email: '',
        taxRate: 0,
        paymentTerms: 'Create the final invoice in SpeakSheet.',
      },
      themeMode: DEFAULT_THEME_MODE,
      isOnline: true,
      pendingDeletes: emptyPendingDeletes(),
      isPro: false,
      proLastVerifiedAt: null,

      setThemeMode: (mode) => set({ themeMode: mode }),

      // ─── Client Actions ───
      addClient: (clientData) => {
        const state = get();
        if (!canCreateClient({
          isPro: state.isPro,
          clientCount: state.clients.length,
          activeInvoiceCount: activeInvoiceCount(state.invoices),
        })) {
          return { ok: false, reason: 'client_limit' };
        }

        const client: Client = {
          ...clientData,
          id: `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          synced: false,
        };
        set((state) => ({ clients: [...state.clients, client] }));
        get().sync();
        return { ok: true, id: client.id };
      },

      updateClient: (id, updates) => {
        set((state) => ({
          clients: state.clients.map((c) =>
            c.id === id
              ? { ...c, ...updates, updatedAt: new Date().toISOString(), synced: false }
              : c
          ),
        }));
        get().sync();
      },

      deleteClient: (id) => {
        const state = get();
        const invoiceIds = state.invoices.filter((i) => i.clientId === id).map((i) => i.id);
        const invoicePdfPaths = state.invoices
          .filter((i) => i.clientId === id)
          .map((i) => i.pdfPath);
        const calculationIds = state.calculations.filter((c) => c.clientId === id).map((c) => c.id);

        set((state) => ({
          clients: state.clients.filter((c) => c.id !== id),
          invoices: state.invoices.filter((i) => i.clientId !== id),
          calculations: state.calculations.filter((c) => c.clientId !== id),
          pendingDeletes: mergePendingDeletes(state.pendingDeletes, {
            clients: [id],
            invoices: invoiceIds,
            calculations: calculationIds,
          }),
        }));
        invoicePdfPaths.forEach(deleteGeneratedPdf);
        get().sync();
      },

      getClientById: (id) => {
        return get().clients.find((c) => c.id === id);
      },

      getClientJobs: (clientId) => {
        const invoices = get().invoices.filter((i) => i.clientId === clientId);
        const calcs = get().calculations.filter((c) => c.clientId === clientId);
        return [...invoices, ...calcs].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      },

      // ─── Invoice Actions ───
      addInvoice: (invoiceData) => {
        const state = get();
        if (!canCreateInvoice({
          isPro: state.isPro,
          clientCount: state.clients.length,
          activeInvoiceCount: activeInvoiceCount(state.invoices),
        })) {
          return { ok: false, reason: 'invoice_limit' };
        }

        const invoice: Invoice = {
          ...invoiceData,
          id: `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          synced: false,
        };
        set((state) => ({ invoices: [...state.invoices, invoice] }));
        get().sync();
        return { ok: true, id: invoice.id };
      },

      updateInvoice: (id, updates) => {
        set((state) => ({
          invoices: state.invoices.map((i) =>
            i.id === id
              ? { ...i, ...updates, updatedAt: new Date().toISOString(), synced: false }
              : i
          ),
        }));
        get().sync();
      },

      deleteInvoice: (id) => {
        const pdfPath = get().invoices.find((invoice) => invoice.id === id)?.pdfPath;
        set((state) => ({
          invoices: state.invoices.filter((i) => i.id !== id),
          pendingDeletes: mergePendingDeletes(state.pendingDeletes, { invoices: [id] }),
        }));
        deleteGeneratedPdf(pdfPath);
        get().sync();
      },

      getInvoiceById: (id) => {
        return get().invoices.find((i) => i.id === id);
      },

      getInvoicesByClient: (clientId) => {
        return get().invoices
          .filter((i) => i.clientId === clientId)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      },

      generateInvoiceNumber: () => {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const period = `${year}${month}`;
        const usedNumbers = new Set(get().invoices.map((invoice) => invoice.invoiceNumber));
        let nextSequence = get().invoices.reduce((max, invoice) => {
          const match = invoice.invoiceNumber.match(new RegExp(`^(?:JOB|INV)-${period}-(\\d+)$`));
          if (!match) return max;
          const sequence = Number(match[1]);
          return Number.isFinite(sequence) ? Math.max(max, sequence) : max;
        }, 0) + 1;
        let candidate = `JOB-${period}-${String(nextSequence).padStart(4, '0')}`;
        while (usedNumbers.has(candidate)) {
          nextSequence += 1;
          candidate = `JOB-${period}-${String(nextSequence).padStart(4, '0')}`;
        }
        return candidate;
      },

      // ─── Calculation Actions ───
      addCalculation: (calcData) => {
        const calc: CalculationRecord = {
          ...calcData,
          id: `calc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          createdAt: new Date().toISOString(),
          synced: false,
        };
        set((state) => ({ calculations: [...state.calculations, calc] }));
        get().sync();
      },

      deleteCalculation: (id) => {
        set((state) => ({
          calculations: state.calculations.filter((c) => c.id !== id),
          pendingDeletes: mergePendingDeletes(state.pendingDeletes, { calculations: [id] }),
        }));
        get().sync();
      },

      // ─── Company Actions ───
      updateCompany: (updates) => {
        set((state) => ({
          company: { ...state.company, ...updates },
        }));
        get().sync();
      },

      // ─── Offline/Sync Actions ───
      setOnline: (online) => {
        set({ isOnline: online });
        if (online) {
          get().sync();
        }
      },

      sync: async () => {
        // BaseCalc HVAC is intentionally device-local. Keep this no-op so existing write
        // paths can remain simple while cloud sync is removed from the build.
      },

      pendingSyncCount: () => {
        return 0;
      },

      // ─── RevenueCat ───
      setPro: (pro) => {
        proStatusGeneration += 1;
        set({ isPro: pro, proLastVerifiedAt: Date.now() });
      },

      refreshProStatus: async () => {
        const generation = ++proStatusGeneration;
        if (!isRevenueCatConfigured()) {
          if (generation === proStatusGeneration) set({ isPro: false, proLastVerifiedAt: Date.now() });
          return;
        }

        try {
          const isPro = await SubscriptionService.checkStatus({ forceRefresh: true });
          if (generation === proStatusGeneration) set({ isPro, proLastVerifiedAt: Date.now() });
        } catch (error) {
          const state = get();
          const age = state.proLastVerifiedAt === null
            ? Number.POSITIVE_INFINITY
            : Date.now() - state.proLastVerifiedAt;
          if (generation === proStatusGeneration && !(state.isPro && age >= 0 && age <= PRO_OFFLINE_GRACE_MS)) {
            set({ isPro: false });
          }
          console.warn('[RevenueCat] Unable to refresh entitlement status:', error);
        }
      },
    }),
    {
      name: APP_STORAGE_NAME,
      version: 3,
      storage: createJSONStorage(() => appStorage),
      migrate: migratePersistedState,
      partialize: (state) => ({
        clients: state.clients,
        invoices: state.invoices,
        calculations: state.calculations,
        themeMode: state.themeMode,
        company: state.company,
        isPro: state.isPro,
        proLastVerifiedAt: state.proLastVerifiedAt,
      }),
      onRehydrateStorage: () => (state) => {
        state?.refreshProStatus();
      },
    }
  )
);

// ─── Sync merge helpers ──────────────────────────────────────────────

function emptyPendingDeletes(): PendingDeletes {
  return { clients: [], invoices: [], calculations: [] };
}

function uniqueIds(ids: string[]): string[] {
  return [...new Set(ids.filter(Boolean))];
}

function mergePendingDeletes(current: PendingDeletes, next: Partial<PendingDeletes>): PendingDeletes {
  const existing = current ?? emptyPendingDeletes();
  return {
    clients: uniqueIds([...existing.clients, ...(next.clients ?? [])]),
    invoices: uniqueIds([...existing.invoices, ...(next.invoices ?? [])]),
    calculations: uniqueIds([...existing.calculations, ...(next.calculations ?? [])]),
  };
}
