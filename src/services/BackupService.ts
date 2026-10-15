import { File, Paths } from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import {
  type CalculationRecord,
  type Client,
  type CompanySettings,
  type Invoice,
  type JobTemplate,
  useAppStore,
} from '../store/useAppStore';

export interface BackupData {
  clients: Client[];
  invoices: Invoice[];
  calculations: CalculationRecord[];
  templates: JobTemplate[];
  company: CompanySettings;
}

const BACKUP_KIND = 'basecalc-hvac-local-backup';
const BACKUP_VERSION = 1;
const MAX_BACKUP_BYTES = 50 * 1024 * 1024;

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function string(value: unknown): value is string {
  return typeof value === 'string';
}

function finite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function date(value: unknown): value is string {
  return string(value) && Number.isFinite(Date.parse(value));
}

function uniqueIds(rows: { id: string }[]): boolean {
  return new Set(rows.map((row) => row.id)).size === rows.length;
}

function validClient(value: unknown): value is Client {
  return record(value) && string(value.id) && value.id.length > 0
    && ['name', 'email', 'phone', 'address', 'company', 'notes'].every((key) => string(value[key]))
    && date(value.createdAt) && date(value.updatedAt);
}

function validItem(value: unknown): boolean {
  return record(value) && string(value.id) && string(value.description)
    && finite(value.quantity) && value.quantity >= 0
    && finite(value.unitPrice) && finite(value.total);
}

function validInvoice(value: unknown): value is Invoice {
  return record(value) && string(value.id) && value.id.length > 0
    && ['clientId', 'invoiceNumber', 'notes', 'paymentTerms'].every((key) => string(value[key]))
    && ['date', 'dueDate', 'createdAt', 'updatedAt'].every((key) => date(value[key]))
    && ['subtotal', 'taxRate', 'taxAmount', 'total'].every((key) => finite(value[key]))
    && ['draft', 'sent', 'paid', 'overdue'].includes(String(value.status))
    && Array.isArray(value.lineItems) && value.lineItems.every(validItem)
    && (value.calculationIds === undefined || (Array.isArray(value.calculationIds) && value.calculationIds.every(string)));
}

function validCalculation(value: unknown): value is CalculationRecord {
  return record(value) && string(value.id) && value.id.length > 0 && string(value.type)
    && date(value.createdAt) && (value.clientId === undefined || string(value.clientId))
    && record(value.inputs) && record(value.result)
    && typeof value.result.ok === 'boolean' && string(value.result.message)
    && Array.isArray(value.result.fields) && value.result.fields.every((field: unknown) =>
      record(field) && string(field.label) && string(field.value)
      && (field.unit === undefined || string(field.unit)))
    && Array.isArray(value.result.details) && value.result.details.every(string);
}

function validTemplate(value: unknown): value is JobTemplate {
  return record(value) && string(value.id) && value.id.length > 0
    && string(value.name) && value.name.trim().length > 0 && string(value.notes)
    && Array.isArray(value.lineItems) && value.lineItems.every((item) =>
      record(item) && string(item.description) && finite(item.quantity) && item.quantity >= 0);
}

function validCompany(value: unknown): value is CompanySettings {
  return record(value) && ['name', 'address', 'city', 'state', 'zip', 'phone', 'email', 'paymentTerms'].every((key) => string(value[key]))
    && finite(value.taxRate);
}

export function parseBackup(json: string): BackupData {
  if (json.length > MAX_BACKUP_BYTES) throw new Error('Backup exceeds the 50 MB size limit.');
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error('This file is not valid JSON.');
  }
  if (!record(parsed) || parsed.kind !== BACKUP_KIND || parsed.version !== BACKUP_VERSION || !record(parsed.data)) {
    throw new Error('This is not a supported BaseCalc HVAC backup.');
  }
  const data = parsed.data;
  if (!Array.isArray(data.clients) || !data.clients.every(validClient)
    || !Array.isArray(data.invoices) || !data.invoices.every(validInvoice)
    || !Array.isArray(data.calculations) || !data.calculations.every(validCalculation)
    || !Array.isArray(data.templates) || !data.templates.every(validTemplate)
    || !validCompany(data.company)) {
    throw new Error('Backup records are incomplete or invalid.');
  }
  if (![data.clients, data.invoices, data.calculations, data.templates].every(uniqueIds)) {
    throw new Error('Backup contains duplicate record IDs.');
  }
  const clientIds = new Set(data.clients.map((client) => client.id));
  const calculationIds = new Set(data.calculations.map((calculation) => calculation.id));
  if (data.invoices.some((invoice) => !clientIds.has(invoice.clientId)
    || (invoice.calculationIds ?? []).some((id) => !calculationIds.has(id)))) {
    throw new Error('Backup has broken job references.');
  }
  return {
    clients: data.clients,
    invoices: data.invoices.map((invoice) => ({ ...invoice, pdfPath: undefined })),
    calculations: data.calculations,
    templates: data.templates,
    company: data.company,
  };
}

export function createBackupJson(data: BackupData): string {
  const portable = {
    ...data,
    invoices: data.invoices.map(({ pdfPath: _pdfPath, ...invoice }) => invoice),
  };
  return JSON.stringify({ kind: BACKUP_KIND, version: BACKUP_VERSION, exportedAt: new Date().toISOString(), data: portable });
}

export const BackupService = {
  async export(): Promise<void> {
    if (!(await Sharing.isAvailableAsync())) throw new Error('File sharing is unavailable on this device.');
    const { clients, invoices, calculations, templates, company } = useAppStore.getState();
    const json = createBackupJson({ clients, invoices, calculations, templates, company });
    if (json.length > MAX_BACKUP_BYTES) throw new Error('Backup exceeds the 50 MB size limit.');
    const file = new File(Paths.cache, `basecalc-hvac-backup-${new Date().toISOString().slice(0, 10)}.json`);
    file.create({ overwrite: true });
    try {
      file.write(json);
      await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: 'Export BaseCalc HVAC backup' });
    } finally {
      if (file.exists) file.delete();
    }
  },
  async pickAndValidate(): Promise<BackupData | null> {
    const picked = await DocumentPicker.getDocumentAsync({
      type: ['application/json', 'text/plain'],
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (picked.canceled) return null;
    const asset = picked.assets[0];
    if (!asset) throw new Error('No backup file was selected.');
    if (asset.size !== undefined && asset.size > MAX_BACKUP_BYTES) throw new Error('Backup exceeds the 50 MB size limit.');
    const file = new File(asset.uri);
    if (file.size > MAX_BACKUP_BYTES) throw new Error('Backup exceeds the 50 MB size limit.');
    return parseBackup(await file.text());
  },
};
