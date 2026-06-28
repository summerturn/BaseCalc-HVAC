import { Platform } from 'react-native';
import * as Application from 'expo-application';

interface AnalyticsEvent {
  name: string;
  params?: Record<string, any>;
  timestamp: string;
  userId?: string;
  sessionId: string;
}

class AnalyticsService {
  private events: AnalyticsEvent[] = [];
  private sessionId: string;
  private userId: string | null = null;
  private flushInterval: ReturnType<typeof setInterval> | null = null;
  private readonly MAX_BUFFER = 100;
  private readonly FLUSH_INTERVAL_MS = 30000; // 30 seconds

  constructor() {
    this.sessionId = this.generateSessionId();
    this.startFlushTimer();
  }

  private generateSessionId(): string {
    return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  setUserId(userId: string) {
    this.userId = userId;
  }

  clearUserId() {
    this.userId = null;
  }

  // ─── Core Event Tracking ───

  trackCalculationPerformed(type: string, inputs: Record<string, any>, result: any) {
    this.track('calculation_performed', {
      calculator_type: type,
      inputs_hash: this.hashInputs(inputs),
      passed: result?.passes ?? false,
      refrigerant: inputs.refrigerant,
      tons: inputs.tons,
      cfm: inputs.cfm,
      platform: Platform.OS,
    });
  }

  trackInvoiceGenerated(invoiceId: string, clientId: string, total: number, lineItemCount: number) {
    this.track('invoice_generated', {
      invoice_id_hash: this.hashString(invoiceId),
      client_id_hash: this.hashString(clientId),
      total_amount: total,
      line_item_count: lineItemCount,
      platform: Platform.OS,
    });
  }

  trackClientAdded(clientId: string, hasCompany: boolean) {
    this.track('client_added', {
      client_id_hash: this.hashString(clientId),
      has_company: hasCompany,
      platform: Platform.OS,
    });
  }

  trackClientDeleted(clientId: string) {
    this.track('client_deleted', { client_id_hash: this.hashString(clientId) });
  }

  trackInvoiceStatusChanged(invoiceId: string, from: string, to: string) {
    this.track('invoice_status_changed', {
      invoice_id_hash: this.hashString(invoiceId),
      from_status: from,
      to_status: to,
    });
  }

  trackPdfGenerated(invoiceId: string, success: boolean) {
    this.track('pdf_generated', {
      invoice_id_hash: this.hashString(invoiceId),
      success,
      platform: Platform.OS,
    });
  }

  trackSyncCompleted(pendingCount: number, durationMs: number) {
    this.track('sync_completed', {
      pending_items: pendingCount,
      duration_ms: durationMs,
    });
  }

  trackError(context: string, error: Error) {
    this.track('error', {
      context,
      error_message: error.message,
      // Stack traces are intentionally not collected to avoid leaking paths or
      // potentially sensitive data into analytics storage.
      platform: Platform.OS,
    });
  }

  // ─── Generic Track ───

  track(name: string, params?: Record<string, any>) {
    const event: AnalyticsEvent = {
      name,
      params,
      timestamp: new Date().toISOString(),
      userId: this.userId || undefined,
      sessionId: this.sessionId,
    };

    this.events.push(event);

    // Auto-flush if buffer gets large
    if (this.events.length >= this.MAX_BUFFER) {
      this.flush();
    }

    // Also log in development
    if (__DEV__) {
      console.log('[Analytics]', name, params);
    }
  }

  // ─── Flush / Send ───

  async flush(): Promise<void> {
    if (this.events.length === 0) return;

    const batch = [...this.events];
    this.events = [];

    try {
      await this.storeLocally(batch);
    } catch (error) {
      // Re-queue failed events
      this.events.unshift(...batch);
      console.error('Analytics flush failed:', error);
    }
  }

  private async storeLocally(events: AnalyticsEvent[]): Promise<void> {
    const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
    const existing = await AsyncStorage.getItem('analytics_queue');
    const queue = existing ? JSON.parse(existing) : [];
    queue.push(...events);
    await AsyncStorage.setItem('analytics_queue', JSON.stringify(queue.slice(-500))); // keep last 500
  }

  private startFlushTimer() {
    this.flushInterval = setInterval(() => {
      this.flush();
    }, this.FLUSH_INTERVAL_MS);
  }

  stopFlushTimer() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
  }

  private hashInputs(inputs: Record<string, any>): string {
    const str = JSON.stringify(inputs, Object.keys(inputs).sort());
    return this.hashString(str);
  }

  private hashString(value: string): string {
    // Simple, non-cryptographic hash used to pseudonymize identifiers before
    // storing them in analytics. Not reversible for arbitrary UUIDs.
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
      const char = value.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  }

  // ─── Getters ───

  getPendingCount(): number {
    return this.events.length;
  }

  getSessionId(): string {
    return this.sessionId;
  }
}

// Singleton instance
export const analytics = new AnalyticsService();
export default analytics;
