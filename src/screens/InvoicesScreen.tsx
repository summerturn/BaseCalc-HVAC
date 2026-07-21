import { useState } from 'react';
import { Alert, Pressable, ScrollView, Share, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Invoice, useAppStore } from '../store/useAppStore';
import { InvoiceService } from '../services/InvoiceService';
import { useColors } from '../theme/useAppTheme';
import { Body, Display, H1, H2, Label, Mono, Small } from '../components/Type';
import {
  BackBar,
  Divider,
  EmptyState,
  FAB,
  Field,
  FooterContentSpacer,
  LIST_CARD_GAP,
  LIST_FAB_PADDING,
  ListScreenScrollView,
  FormScrollView,
  ListScreenHeader,
  Panel,
  Pill,
  type PillTone,
  PrimaryButton,
  Screen,
  SearchBar,
  SecondaryButton,
  useBottomClearance,
} from '../components/ui';
import { useSubscription } from '../hooks/useSubscription';

const statusTone = (status: Invoice['status']): PillTone =>
  status === 'paid' ? 'pass' : status === 'overdue' ? 'fail' : status === 'sent' ? 'info' : 'neutral';

const JOB_STATUS_LABELS: Record<Invoice['status'], string> = {
  draft: 'Draft',
  sent: 'Ready',
  paid: 'Closed',
  overdue: 'Review',
};

function jobStatusLabel(status: Invoice['status']): string {
  return JOB_STATUS_LABELS[status] ?? 'Draft';
}

function displayTicketNumber(ticketNumber: string): string {
  return ticketNumber.replace(/^INV-/, 'JOB-');
}

function buildSpeakSheetHandoff(ticket: Invoice, contactName: string): string {
  const lines = ticket.lineItems
    .map((item) => `- ${item.description || 'Work item'}${item.quantity ? ` (qty ${item.quantity})` : ''}`)
    .join('\n');

  return [
    `BaseCalc HVAC job worksheet ${displayTicketNumber(ticket.invoiceNumber)}`,
    `Job contact: ${contactName}`,
    `Created: ${new Date(ticket.date).toLocaleDateString()}`,
    '',
    'Work items:',
    lines || '- No work items entered',
    ticket.notes ? `Notes: ${ticket.notes}` : '',
    '',
    'Create the final invoice in SpeakSheet.',
  ].filter(Boolean).join('\n');
}

// ─── List ────────────────────────────────────────────────────────────

export function JobTicketsScreen({ navigation }: { navigation: any }) {
  const { invoices, clients } = useAppStore();
  const c = useColors();
  const bottomClearance = useBottomClearance();
  const { canAddInvoice } = useSubscription();
  const [q, setQ] = useState('');

  const clientName = (id: string) => clients.find((cl) => cl.id === id)?.name || 'Unknown job contact';
  const filtered = invoices.filter(
    (inv) =>
      inv.invoiceNumber.toLowerCase().includes(q.toLowerCase()) ||
      clientName(inv.clientId).toLowerCase().includes(q.toLowerCase())
  );
  const openTickets = invoices.filter((i) => i.status !== 'paid').length;

  return (
    <Screen>
      <ListScreenScrollView bottomPadding={bottomClearance + LIST_FAB_PADDING}>
        <ListScreenHeader
          title="Jobs"
          subtitle={openTickets > 0 ? `${openTickets} open job ${openTickets === 1 ? 'worksheet' : 'worksheets'}` : 'Calculation handoffs and job records.'}
        />

        <View style={{ marginBottom: 12 }}>
          <SecondaryButton label="Job contacts" icon="person-outline" onPress={() => navigation.navigate('JobContacts')} />
        </View>

        <View style={{ marginBottom: 16 }}>
          <SearchBar value={q} onChangeText={setQ} placeholder="Search ticket or job contact…" />
        </View>

        {filtered.length === 0 ? (
          <EmptyState icon="work-outline" title={invoices.length ? 'No matches' : 'No job worksheets yet'} subtitle={invoices.length ? 'Try a different search.' : 'Tap + to capture the field notes for a job.'} />
        ) : (
          filtered.map((invoice) => (
            <Pressable
              key={invoice.id}
              onPress={() => navigation.navigate('JobTicketDetail', { invoiceId: invoice.id })}
              style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1, marginBottom: LIST_CARD_GAP })}
            >
              <Panel>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 13 }}>
                  <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: c.amberSoft, borderWidth: 1, borderColor: c.amberBright, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <MaterialIcons name="assignment" size={22} color={c.amber} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Mono tone="amber" style={{ fontSize: 12.5 }} numberOfLines={1}>{displayTicketNumber(invoice.invoiceNumber)}</Mono>
                    <H2 style={{ fontSize: 16, marginTop: 4 }} numberOfLines={1}>{clientName(invoice.clientId)}</H2>
                    <Mono tone="muted" style={{ fontSize: 11.5, marginTop: 4 }} numberOfLines={1}>
                      {new Date(invoice.date).toLocaleDateString()} · {invoice.lineItems.length} {invoice.lineItems.length === 1 ? 'item' : 'items'}
                    </Mono>
                  </View>
                  <View style={{ alignItems: 'flex-end', flexShrink: 0 }}>
                    <Pill label={jobStatusLabel(invoice.status)} tone={statusTone(invoice.status)} />
                  </View>
                </View>
              </Panel>
            </Pressable>
          ))
        )}
        <FooterContentSpacer />
      </ListScreenScrollView>
      <FAB onPress={() => { if (canAddInvoice()) navigation.navigate('CreateJobTicket'); }} />
    </Screen>
  );
}

// ─── Create ──────────────────────────────────────────────────────────

export function CreateJobTicketScreen({ route, navigation }: { route: any; navigation: any }) {
  const { clients, addInvoice, generateInvoiceNumber } = useAppStore();
  const { showLimitPrompt } = useSubscription();
  const c = useColors();
  const bottomClearance = useBottomClearance();

  const [clientId, setClientId] = useState(route.params?.clientId || '');
  const [lineItems, setLineItems] = useState([InvoiceService.createLineItem('Electrical work item', 1, 0)]);
  const [notes, setNotes] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);

  const selectedClient = clients.find((cl) => cl.id === clientId);

  const updateLineItem = (id: string, field: 'description' | 'quantity', value: string | number) => {
    setLineItems((items) =>
      items.map((item) => {
        if (item.id !== id) return item;
        return {
          ...item,
          [field]: value,
          unitPrice: 0,
          total: 0,
        };
      })
    );
  };

  const handleCreate = () => {
    if (!clientId) {
      Alert.alert('Job contact required', 'Please select or add a job contact for this worksheet.');
      return;
    }
    const result = addInvoice({
      clientId,
      invoiceNumber: generateInvoiceNumber(),
      date: new Date().toISOString(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      lineItems,
      subtotal: 0,
      taxRate: 0,
      taxAmount: 0,
      total: 0,
      paymentTerms: 'Create the final invoice in SpeakSheet.',
      notes,
      status: 'draft',
    });
    if (!result.ok) {
      showLimitPrompt('invoice');
      return;
    }
    navigation.goBack();
  };

  return (
    <Screen>
      <FormScrollView bottomPadding={bottomClearance + 24}>
        <BackBar onBack={() => navigation.goBack()} />
        <View style={{ marginBottom: 18 }}><Display>New Job Worksheet</Display></View>

        <Label style={{ marginBottom: 8, }}>Job contact</Label>
        <Panel style={{ marginBottom: 16 }}>
          <Pressable onPress={() => setPickerOpen((o) => !o)} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Body tone={selectedClient ? 'primary' : 'muted'}>{selectedClient?.name || 'Select a job contact…'}</Body>
            <MaterialIcons name={pickerOpen ? 'expand-less' : 'expand-more'} size={22} color={c.textMuted} />
          </Pressable>
          {pickerOpen ? (
            <View style={{ marginTop: 10 }}>
              {clients.length === 0 ? (
                <Pressable onPress={() => navigation.navigate('JobContacts', { screen: 'AddClient' })} style={{ paddingVertical: 10 }}>
                  <Label tone="amber">Add a job contact</Label>
                  <Small style={{ marginTop: 4 }}>Contacts support job worksheets only. Final billing belongs in SpeakSheet.</Small>
                </Pressable>
              ) : (
                clients.map((cl, idx) => (
                  <Pressable
                    key={cl.id}
                    onPress={() => { setClientId(cl.id); setPickerOpen(false); }}
                    style={{ paddingVertical: 11, borderTopWidth: idx === 0 ? 0 : 1, borderTopColor: c.divider, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
                  >
                    <Body tone={clientId === cl.id ? 'amber' : 'dim'} numberOfLines={1} style={{ flex: 1 }}>{cl.name}</Body>
                    {clientId === cl.id ? <MaterialIcons name="check" size={18} color={c.amber} /> : null}
                  </Pressable>
                ))
              )}
            </View>
          ) : null}
        </Panel>

        <Label style={{ marginBottom: 8, }}>Work items</Label>
        <Panel style={{ marginBottom: 16 }}>
          {lineItems.map((item, index) => (
            <View key={item.id} style={{ marginBottom: index === lineItems.length - 1 ? 0 : 16, paddingBottom: index === lineItems.length - 1 ? 0 : 16, borderBottomWidth: index === lineItems.length - 1 ? 0 : 1, borderBottomColor: c.divider }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <Label>Item {index + 1}</Label>
                {lineItems.length > 1 ? (
                  <Pressable onPress={() => setLineItems((items) => items.filter((i) => i.id !== item.id))} hitSlop={8}>
                    <MaterialIcons name="close" size={18} color={c.fail} />
                  </Pressable>
                ) : null}
              </View>
              <Field value={item.description} onChangeText={(t) => updateLineItem(item.id, 'description', t)} placeholder="Scope, material, calculation, or punch item" />
              <Field label="Qty" value={String(item.quantity)} onChangeText={(t) => updateLineItem(item.id, 'quantity', parseFloat(t) || 0)} keyboardType="decimal-pad" style={{ marginBottom: 0 }} />
            </View>
          ))}
          <Pressable onPress={() => setLineItems((items) => [...items, InvoiceService.createLineItem('', 1, 0)])} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16 }}>
            <MaterialIcons name="add" size={18} color={c.amber} />
            <Label tone="amber">Add work item</Label>
          </Pressable>
        </Panel>

        <Label style={{ marginBottom: 8, }}>Worksheet handoff</Label>
        <Panel style={{ marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: c.inset, borderWidth: 1, borderColor: c.border, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <MaterialIcons name="assignment" size={22} color={c.amber} />
            </View>
            <View style={{ flex: 1 }}>
              <H2 style={{ fontSize: 16 }}>Field worksheet only</H2>
              <Small tone="muted" style={{ marginTop: 4 }}>
                Keep scope, quantities, and site notes here. Create pricing, tax, terms, and the final customer invoice in SpeakSheet.
              </Small>
            </View>
          </View>
        </Panel>

        <Label style={{ marginBottom: 8, }}>Site notes</Label>
        <Panel style={{ marginBottom: 18 }}>
          <Field label="Notes" value={notes} onChangeText={setNotes} placeholder="Scope notes, site conditions, permit reminders..." multiline style={{ marginBottom: 0 }} />
        </Panel>

        <Panel style={{ marginBottom: 18 }}>
          <Small tone="muted">
            No prices are stored on this worksheet. That keeps BaseCalc focused on field math and job capture while SpeakSheet owns billing.
          </Small>
        </Panel>

        <PrimaryButton label="Save worksheet" icon="check" onPress={handleCreate} />
      </FormScrollView>
    </Screen>
  );
}

// ─── Detail ──────────────────────────────────────────────────────────

export function JobTicketDetailScreen({ route, navigation }: { route: any; navigation: any }) {
  const { invoiceId } = route.params;
  const { invoices, clients, company, updateInvoice, deleteInvoice } = useAppStore();
  const c = useColors();
  const bottomClearance = useBottomClearance();
  const invoice = invoices.find((i) => i.id === invoiceId);
  const client = clients.find((cl) => cl.id === invoice?.clientId);
  const [generating, setGenerating] = useState(false);

  if (!invoice) {
    return (
      <Screen>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Body tone="muted">Job worksheet not found</Body>
        </View>
      </Screen>
    );
  }

  const handlePDF = async () => {
    if (generating) return;
    const previousPath = invoice.pdfPath;
    setGenerating(true);
    try {
      const path = await InvoiceService.generatePDF(invoice, company, client?.name || 'Unknown job contact');
      if (!path) {
        Alert.alert('Error', 'Could not generate the PDF.');
        return;
      }
      if (!useAppStore.getState().getInvoiceById(invoice.id)) {
        InvoiceService.deletePDF(path);
        return;
      }
      updateInvoice(invoice.id, { pdfPath: path });
      if (previousPath && previousPath !== path) {
        InvoiceService.deletePDF(previousPath);
      }
      Alert.alert('PDF ready', 'Job worksheet PDF generated.', [
        { text: 'Share', onPress: () => InvoiceService.sharePDF(path) },
        { text: 'Done', style: 'cancel' },
      ]);
    } finally {
      setGenerating(false);
    }
  };

  const handleSpeakSheetHandoff = async () => {
    try {
      await Share.share({
        title: 'BaseCalc job worksheet',
        message: buildSpeakSheetHandoff(invoice, client?.name || 'Unknown job contact'),
      });
    } catch {
      Alert.alert('Share failed', 'Could not open the share sheet for this job worksheet.');
    }
  };

  const confirmDelete = () => {
    if (generating) return;
    Alert.alert(
      'Delete job worksheet',
      'Delete this worksheet and its generated in-app PDF? Files already shared to other apps are not affected.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteInvoice(invoice.id);
            navigation.goBack();
          },
        },
      ]
    );
  };

  const MetaRow = ({ label, value }: { label: string; value: string }) => (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
      <Mono tone="muted" style={{ fontSize: 12 }} numberOfLines={1}>{label}</Mono>
      <Mono tone="dim" style={{ fontSize: 12, textAlign: 'right', flex: 1, marginLeft: 12 }} numberOfLines={1}>{value}</Mono>
    </View>
  );

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 6, paddingBottom: bottomClearance }} showsVerticalScrollIndicator={false}>
        <BackBar onBack={() => navigation.goBack()} />

        <Panel style={{ marginBottom: 14, borderLeftWidth: 4, borderLeftColor: c.amberBright }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ flex: 1 }}>
              <Mono tone="amber" style={{ fontSize: 13 }} numberOfLines={1}>{displayTicketNumber(invoice.invoiceNumber)}</Mono>
              <H1 style={{ fontSize: 22, marginTop: 5 }} numberOfLines={1}>{client?.name || 'Unknown job contact'}</H1>
            </View>
            <Pill label={jobStatusLabel(invoice.status)} tone={statusTone(invoice.status)} />
          </View>
          <Divider style={{ marginVertical: 14 }} />
          <MetaRow label="CREATED" value={new Date(invoice.date).toLocaleDateString()} />
          <MetaRow label="JOB STATE" value={jobStatusLabel(invoice.status)} />
        </Panel>

        <Panel style={{ marginBottom: 14 }}>
          <Label style={{ marginBottom: 12 }}>Work items</Label>
          {invoice.lineItems.map((item) => (
            <View key={item.id} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
              <MaterialIcons name="check-circle" size={18} color={c.amber} style={{ marginTop: 2 }} />
              <View style={{ flex: 1 }}>
                <Body tone="primary" style={{ fontSize: 14 }}>{item.description || 'Work item'}</Body>
                <Mono tone="muted" style={{ fontSize: 11.5, marginTop: 2 }} numberOfLines={1}>Qty {item.quantity || 0}</Mono>
              </View>
            </View>
          ))}
        </Panel>

        {invoice.notes ? (
          <Panel style={{ marginBottom: 14 }}>
            <Label style={{ marginBottom: 6 }}>Notes</Label>
            <Body tone="dim">{invoice.notes}</Body>
          </Panel>
        ) : null}

        <Panel style={{ marginBottom: 16 }}>
          <Label style={{ marginBottom: 8 }}>SpeakSheet handoff</Label>
          <Body tone="dim" style={{ marginBottom: 12 }}>
            BaseCalc keeps the field math, quantities, and site notes here. Send the final customer invoice from SpeakSheet so billing traffic stays with your invoicing app.
          </Body>
          <SecondaryButton label="Send summary to SpeakSheet" icon="ios-share" tint={c.amberBright} onPress={handleSpeakSheetHandoff} />
        </Panel>

        <Label style={{ marginBottom: 8, }}>Update job state</Label>
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
          <SecondaryButton label="Ready" icon="send" tint={c.info} onPress={() => updateInvoice(invoice.id, { status: 'sent' })} />
          <SecondaryButton label="Closed" icon="check-circle" tint={c.pass} onPress={() => updateInvoice(invoice.id, { status: 'paid' })} />
          <SecondaryButton label="Review" icon="warning" tint={c.fail} onPress={() => updateInvoice(invoice.id, { status: 'overdue' })} />
        </View>

        <PrimaryButton label={generating ? 'Generating...' : 'Export worksheet PDF'} icon="picture-as-pdf" loading={generating} onPress={handlePDF} />
        <View style={{ marginTop: 12 }}>
          <SecondaryButton label="Delete worksheet" icon="delete-outline" tint={c.fail} onPress={confirmDelete} disabled={generating} />
        </View>
      </ScrollView>
    </Screen>
  );
}
