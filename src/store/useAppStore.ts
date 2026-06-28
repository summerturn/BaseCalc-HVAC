import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SQLite from 'expo-sqlite';
import { DEFAULT_THEME_MODE, ThemeMode } from '../theme/appTheme';
import { isRevenueCatConfigured } from '../lib/config';
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
  addClient: (client: Omit<Client, 'id' | 'createdAt' | 'updatedAt' | 'synced'>) => void;
  updateClient: (id: string, updates: Partial<Client>) => void;
  deleteClient: (id: string) => void;
  getClientById: (id: string) => Client | undefined;
  getClientJobs: (clientId: string) => (Invoice | CalculationRecord)[];

  // Invoices
  invoices: Invoice[];
  addInvoice: (invoice: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt' | 'synced'>) => void;
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
  setPro: (pro: boolean) => void;
  refreshProStatus: () => Promise<void>;
}

function migratePersistedState(persistedState: unknown): unknown {
  if (!persistedState || typeof persistedState !== 'object') {
    return persistedState;
  }

  const state = persistedState as { themeMode?: ThemeMode };
  return {
    ...state,
    themeMode: state.themeMode === 'system' || !state.themeMode ? DEFAULT_THEME_MODE : state.themeMode,
  };
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

      setThemeMode: (mode) => set({ themeMode: mode }),

      // ─── Client Actions ───
      addClient: (clientData) => {
        const client: Client = {
          ...clientData,
          id: `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          synced: false,
        };
        set((state) => ({ clients: [...state.clients, client] }));
        get().sync();
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
        const invoice: Invoice = {
          ...invoiceData,
          id: `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          synced: false,
        };
        set((state) => ({ invoices: [...state.invoices, invoice] }));
        get().sync();
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
        set((state) => ({
          invoices: state.invoices.filter((i) => i.id !== id),
          pendingDeletes: mergePendingDeletes(state.pendingDeletes, { invoices: [id] }),
        }));
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
        const count = get().invoices.length + 1;
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        return `JOB-${year}${month}-${String(count).padStart(4, '0')}`;
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
        set({ isPro: pro });
      },

      refreshProStatus: async () => {
        const pro = isRevenueCatConfigured()
          ? await SubscriptionService.checkStatus().catch(() => false)
          : false;
        set({ isPro: pro });
      },
    }),
    {
      name: APP_STORAGE_NAME,
      version: 1,
      storage: createJSONStorage(() => appStorage),
      migrate: migratePersistedState,
      partialize: (state) => ({
        clients: state.clients,
        invoices: state.invoices,
        calculations: state.calculations,
        themeMode: state.themeMode,
        company: state.company,
        // Pro status is intentionally NOT persisted locally. It is always
        // re-verified via RevenueCat on startup to prevent tampered local
        // storage from unlocking Pro features.
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
