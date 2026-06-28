import { Invoice, InvoiceLineItem, CompanySettings } from '../store/useAppStore';
import { Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

// ─── Job Worksheet HTML Generator ────────────────────────────────────

function escapeHtml(value: string | number | undefined | null): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function generateInvoiceHTML(invoice: Invoice, company: CompanySettings, clientName: string): string {
  const worksheetNumber = invoice.invoiceNumber.replace(/^INV-/, 'JOB-');
  const lineItemsHTML = invoice.lineItems.map((item, index) => `
    <div class="work-row">
      <div class="check-cell">${index + 1}</div>
      <div class="work-copy">
        <p class="work-title">${escapeHtml(item.description || 'Work item')}</p>
        <p class="work-meta">Quantity: ${escapeHtml(item.quantity)}</p>
      </div>
    </div>
  `).join('');

  const status = invoice.status;
  const statusLabel = status === 'paid' ? 'closed' : status === 'sent' ? 'ready' : status === 'overdue' ? 'review' : 'draft';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1f2937; line-height: 1.5; background: #f8fafc; }
    .container { max-width: 800px; margin: 0 auto; padding: 40px; }
    .sheet { background: #ffffff; border: 1px solid #e5e7eb; border-radius: 18px; overflow: hidden; box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08); }
    .top-strip { height: 8px; background: #D97706; }
    .content { padding: 32px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; }
    .company-info h1 { font-size: 24px; font-weight: 700; color: #0f172a; margin-bottom: 4px; }
    .company-info p { font-size: 13px; color: #6b7280; margin: 2px 0; }
    .ticket-meta { text-align: right; }
    .ticket-meta h2 { font-size: 32px; font-weight: 800; color: #D97706; margin-bottom: 8px; letter-spacing: -0.02em; }
    .ticket-meta p { font-size: 13px; color: #6b7280; margin: 2px 0; }
    .status-badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; text-transform: uppercase; margin-top: 8px; }
    .status-draft { background: #f3f4f6; color: #6b7280; }
    .status-sent { background: #dbeafe; color: #1e40af; }
    .status-paid { background: #d1fae5; color: #065f46; }
    .status-overdue { background: #fee2e2; color: #991b1b; }
    .contact-section { background: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
    .contact-section h3 { font-size: 14px; font-weight: 600; color: #6b7280; text-transform: uppercase; margin-bottom: 8px; }
    .contact-section p { font-size: 14px; color: #374151; margin: 2px 0; }
    .section-title { font-size: 13px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #6b7280; margin-bottom: 12px; }
    .work-list { display: grid; gap: 10px; margin-bottom: 30px; }
    .work-row { display: flex; align-items: flex-start; gap: 12px; padding: 14px; border: 1px solid #e5e7eb; border-radius: 12px; background: #ffffff; }
    .check-cell { width: 28px; height: 28px; border-radius: 9999px; background: #FFFBEB; border: 1px solid #F59E0B; color: #B45309; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; flex: 0 0 auto; }
    .work-copy { flex: 1; }
    .work-title { font-size: 14px; color: #111827; font-weight: 600; margin-bottom: 3px; }
    .work-meta { font-size: 12px; color: #6b7280; }
    .notes-section { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
    .notes-section h3 { font-size: 14px; font-weight: 600; color: #6b7280; margin-bottom: 8px; }
    .notes-section p { font-size: 13px; color: #6b7280; }
    .handoff { margin-top: 20px; padding: 16px; background: #FFFBEB; border-radius: 8px; border-left: 4px solid #D97706; }
    .handoff p { font-size: 13px; color: #92400E; }
    .footer { margin-top: 60px; text-align: center; font-size: 12px; color: #9ca3af; }
  </style>
</head>
<body>
  <div class="container">
    <div class="sheet">
      <div class="top-strip"></div>
      <div class="content">
        <div class="header">
          <div class="company-info">
            <h1>${escapeHtml(company.name)}</h1>
            <p>${escapeHtml(company.address)}</p>
            <p>${escapeHtml(company.city)}, ${escapeHtml(company.state)} ${escapeHtml(company.zip)}</p>
            <p>${escapeHtml(company.phone)}</p>
            <p>${escapeHtml(company.email)}</p>
          </div>
          <div class="ticket-meta">
            <h2>JOB WORKSHEET</h2>
            <p><strong>${escapeHtml(worksheetNumber)}</strong></p>
            <p>Date: ${new Date(invoice.date).toLocaleDateString()}</p>
            <span class="status-badge status-${status}">${statusLabel}</span>
          </div>
        </div>

        <div class="contact-section">
          <h3>Job Contact</h3>
          <p><strong>${escapeHtml(clientName)}</strong></p>
        </div>

        <div class="section-title">Work Items</div>
        <div class="work-list">
          ${lineItemsHTML || '<div class="work-row"><div class="check-cell">1</div><div class="work-copy"><p class="work-title">No work items entered</p><p class="work-meta">Quantity: 0</p></div></div>'}
        </div>

        ${invoice.notes ? `
        <div class="notes-section">
          <h3>Site Notes</h3>
          <p>${escapeHtml(invoice.notes)}</p>
        </div>
        ` : ''}

        <div class="handoff">
          <p><strong>SpeakSheet handoff:</strong> BaseCalc stores scope, quantities, calculations, and field notes only. Create pricing, tax, terms, and the final customer invoice in SpeakSheet.</p>
        </div>

        <div class="footer">
          <p>Job worksheet only. No prices, tax, or payment terms are stored here.</p>
          <p style="margin-top: 4px; color: #D97706; font-weight: 600;">Generated with BaseCalc HVAC</p>
        </div>
      </div>
    </div>
  </div>
</body>
</html>
  `;
}

// ─── PDF Service ─────────────────────────────────────────────────────

export const InvoiceService = {
  async generatePDF(invoice: Invoice, company: CompanySettings, clientName: string): Promise<string | null> {
    try {
      const html = generateInvoiceHTML(invoice, company, clientName);

      if (Platform.OS === 'web') {
        // On web, create a blob and download
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${invoice.invoiceNumber.replace(/^INV-/, 'JOB-')}.html`;
        link.click();
        URL.revokeObjectURL(url);
        return null;
      }

      // Use Expo Print (works in Expo dev-client / bare workflow)
      const { uri } = await Print.printToFileAsync({ html });
      return uri || null;
    } catch (error) {
      console.error('PDF generation failed:', error);
      return null;
    }
  },

  async sharePDF(filePath: string): Promise<void> {
    try {
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(filePath, {
          mimeType: 'application/pdf',
          dialogTitle: 'Share Job Worksheet',
        });
      }
    } catch (error) {
      console.error('Share failed:', error);
    }
  },

  createLineItem(
    description: string,
    quantity: number,
    unitPrice: number,
    fromCalculation?: boolean,
    calculationType?: string
  ): InvoiceLineItem {
    return {
      id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      description,
      quantity,
      unitPrice,
      total: quantity * unitPrice,
      fromCalculation,
      calculationType,
    };
  },

  calculateTotals(lineItems: InvoiceLineItem[], taxRate: number): { subtotal: number; taxAmount: number; total: number } {
    const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0);
    const taxAmount = subtotal * (taxRate / 100);
    const total = subtotal + taxAmount;
    return { subtotal, taxAmount, total };
  },
};

export default InvoiceService;
