import { useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAppStore, Client, CalculationRecord, Invoice } from '../store/useAppStore';
import { useColors } from '../theme/useAppTheme';
import { Body, Display, H1, H2, Label, Mono, Small } from '../components/Type';
import {
  ACTION_RAIL_WIDTH,
  BackBar,
  Divider,
  EmptyState,
  FAB,
  Field,
  FooterContentSpacer,
  FormScrollView,
  LIST_CARD_GAP,
  LIST_FAB_PADDING,
  ListScreenScrollView,
  IconTile,
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

// ─── List ────────────────────────────────────────────────────────────

function contactValue(value: string | undefined): string {
  return value ?? '';
}

function isJobWorksheet(job: Invoice | CalculationRecord): job is Invoice {
  return 'invoiceNumber' in job;
}

function displayTicketNumber(ticketNumber: string): string {
  return ticketNumber.replace(/^INV-/, 'JOB-');
}

const jobStatusTone = (status: Invoice['status']): PillTone =>
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

export function ClientsScreen({ navigation }: { navigation: any }) {
  const { clients, deleteClient } = useAppStore();
  const c = useColors();
  const bottomClearance = useBottomClearance();
  const { canAddClient } = useSubscription();
  const [q, setQ] = useState('');

  const filtered = clients.filter((cl) =>
    [cl.name, cl.company, cl.email].some((f) => contactValue(f).toLowerCase().includes(q.toLowerCase()))
  );

  const confirmDelete = (client: Client) => {
    Alert.alert('Delete job contact', `Delete ${client.name}? This also removes their job worksheets and calculations.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteClient(client.id) },
    ]);
  };

  return (
    <Screen>
      <ListScreenScrollView bottomPadding={bottomClearance + LIST_FAB_PADDING}>
        <ListScreenHeader
          title="Job Contacts"
          subtitle={`${clients.length} ${clients.length === 1 ? 'contact' : 'contacts'} saved for job worksheets.`}
        />

        <View style={{ marginBottom: 16 }}>
          <SearchBar value={q} onChangeText={setQ} placeholder="Search name, company, email..." />
        </View>

        {filtered.length === 0 ? (
          <EmptyState icon="people-outline" title={clients.length ? 'No matches' : 'No job contacts yet'} subtitle={clients.length ? 'Try a different search.' : 'Tap + to add your first job contact.'} />
        ) : (
          filtered.map((client) => (
            <Pressable
              key={client.id}
              onPress={() => navigation.navigate('ClientDetail', { clientId: client.id })}
              style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1, marginBottom: LIST_CARD_GAP })}
            >
              <Panel>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 13 }}>
                  <IconTile icon="person" color={c.amberBright} size={44} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <H2 style={{ fontSize: 17 }} numberOfLines={1}>{client.name}</H2>
                    {client.company ? <Small style={{ marginTop: 1 }} numberOfLines={1}>{client.company}</Small> : null}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 9 }}>
                      <MaterialIcons name="phone" size={13} color={c.textMuted} />
                      <Mono tone="muted" style={{ fontSize: 11.5 }} numberOfLines={1}>{client.phone || 'No phone'}</Mono>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
                      <MaterialIcons name="mail-outline" size={13} color={c.textMuted} />
                      <Mono tone="muted" style={{ fontSize: 11.5 }} numberOfLines={1}>{client.email || 'No email'}</Mono>
                    </View>
                  </View>
                  <View style={{ width: ACTION_RAIL_WIDTH, alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <Pressable onPress={() => navigation.navigate('EditClient', { clientId: client.id })} hitSlop={6} style={{ width: 34, height: 34, borderRadius: 11, backgroundColor: c.inset, borderColor: c.border, borderWidth: 1, alignItems: 'center', justifyContent: 'center' }}>
                      <MaterialIcons name="edit" size={16} color={c.textDim} />
                    </Pressable>
                    <Pressable onPress={() => confirmDelete(client)} hitSlop={6} style={{ width: 34, height: 34, borderRadius: 11, backgroundColor: c.inset, borderColor: c.border, borderWidth: 1, alignItems: 'center', justifyContent: 'center' }}>
                      <MaterialIcons name="delete-outline" size={16} color={c.fail} />
                    </Pressable>
                  </View>
                </View>
              </Panel>
            </Pressable>
          ))
        )}
        <FooterContentSpacer />
      </ListScreenScrollView>
      <FAB onPress={() => { if (canAddClient()) navigation.navigate('AddClient'); }} />
    </Screen>
  );
}

// ─── Shared form ─────────────────────────────────────────────────────

type ClientFields = Pick<Client, 'name' | 'email' | 'phone' | 'address' | 'company' | 'notes'>;

function ClientForm({
  title,
  initial,
  submitLabel,
  onSubmit,
}: {
  title: string;
  initial: ClientFields;
  submitLabel: string;
  onSubmit: (f: ClientFields) => boolean;
}) {
  const navigation = useNavigation();
  const bottomClearance = useBottomClearance();
  const [form, setForm] = useState<ClientFields>(initial);

  const submit = () => {
    if (!form.name.trim()) {
      Alert.alert('Name required', 'Please enter a job contact name.');
      return;
    }
    if (onSubmit(form)) navigation.goBack();
  };

  return (
    <Screen>
      <FormScrollView bottomPadding={bottomClearance + 24}>
        <BackBar onBack={() => navigation.goBack()} />
        <View style={{ marginBottom: 18 }}><Display>{title}</Display></View>
        <Panel>
          <Field label="Name *" value={form.name} onChangeText={(t) => setForm({ ...form, name: t })} placeholder="John Smith" />
          <Field label="Company" value={form.company} onChangeText={(t) => setForm({ ...form, company: t })} placeholder="Job site or company" />
          <Field label="Email" value={form.email} onChangeText={(t) => setForm({ ...form, email: t })} placeholder="john@example.com" keyboardType="email-address" autoCapitalize="none" />
          <Field label="Phone" value={form.phone} onChangeText={(t) => setForm({ ...form, phone: t })} placeholder="(555) 123-4567" keyboardType="phone-pad" />
          <Field label="Address" value={form.address} onChangeText={(t) => setForm({ ...form, address: t })} placeholder="123 Main St, City, ST" />
          <Field label="Notes" value={form.notes} onChangeText={(t) => setForm({ ...form, notes: t })} placeholder="Site notes, gate codes…" multiline />
        </Panel>
        <PrimaryButton label={submitLabel} icon="check" onPress={submit} style={{ marginTop: 16 }} />
      </FormScrollView>
    </Screen>
  );
}

export function AddClientScreen() {
  const { addClient } = useAppStore();
  const { showLimitPrompt } = useSubscription();
  return (
    <ClientForm
      title="New Job Contact"
      submitLabel="Save contact"
      initial={{ name: '', email: '', phone: '', address: '', company: '', notes: '' }}
      onSubmit={(f) => {
        const result = addClient(f);
        if (result.ok) return true;
        showLimitPrompt('client');
        return false;
      }}
    />
  );
}

export function EditClientScreen({ route }: { route: any }) {
  const { clientId } = route.params;
  const { getClientById, updateClient } = useAppStore();
  const client = getClientById(clientId);

  if (!client) {
    return (
      <Screen>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Body tone="muted">Job contact not found</Body>
        </View>
      </Screen>
    );
  }

  return (
    <ClientForm
      title="Edit Job Contact"
      submitLabel="Update contact"
      initial={{ name: client.name, email: client.email, phone: client.phone, address: client.address, company: client.company, notes: client.notes }}
      onSubmit={(f) => {
        updateClient(clientId, f);
        return true;
      }}
    />
  );
}

// ─── Detail ──────────────────────────────────────────────────────────

export function ClientDetailScreen({ route, navigation }: { route: any; navigation: any }) {
  const { clientId } = route.params;
  const { getClientById, getClientJobs } = useAppStore();
  const { canAddInvoice } = useSubscription();
  const c = useColors();
  const bottomClearance = useBottomClearance();
  const client = getClientById(clientId);
  const jobs = client ? getClientJobs(clientId) : [];

  if (!client) {
    return (
      <Screen>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Body tone="muted">Job contact not found</Body>
        </View>
      </Screen>
    );
  }

  const ContactRow = ({ icon, text }: { icon: any; text: string }) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 }}>
      <MaterialIcons name={icon} size={17} color={c.amber} />
      <Body tone="dim" numberOfLines={1} style={{ flex: 1 }}>{text}</Body>
    </View>
  );

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 6, paddingBottom: bottomClearance }} showsVerticalScrollIndicator={false}>
        <BackBar onBack={() => navigation.goBack()} />

        <Panel style={{ marginBottom: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <IconTile icon="person" color={c.amberBright} size={54} />
            <View style={{ flex: 1 }}>
              <H1 style={{ fontSize: 23 }} numberOfLines={1}>{client.name}</H1>
              {client.company ? <Small style={{ marginTop: 2 }} numberOfLines={1}>{client.company}</Small> : null}
            </View>
          </View>

          {client.phone || client.email || client.address ? (
            <>
              <Divider style={{ marginVertical: 14 }} />
              {client.phone ? <ContactRow icon="phone" text={client.phone} /> : null}
              {client.email ? <ContactRow icon="mail-outline" text={client.email} /> : null}
              {client.address ? <ContactRow icon="location-on" text={client.address} /> : null}
            </>
          ) : null}

          {client.notes ? (
            <>
              <Divider style={{ marginVertical: 14 }} />
              <Label style={{ marginBottom: 6 }}>Notes</Label>
              <Body tone="dim">{client.notes}</Body>
            </>
          ) : null}
        </Panel>

        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 22 }}>
          <SecondaryButton label="New worksheet" icon="work-outline" tint={c.amberBright} onPress={() => { if (canAddInvoice()) navigation.navigate('CreateJobTicket', { clientId }); }} />
          <SecondaryButton label="Edit" icon="edit" onPress={() => navigation.navigate('EditClient', { clientId })} />
        </View>

        <Label style={{ marginBottom: 10 }}>Job History</Label>
        {jobs.length === 0 ? (
          <EmptyState icon="work-outline" title="No jobs yet" subtitle="Job worksheets and calculations will appear here." />
        ) : (
          jobs.map((job) => {
            const isWorksheet = isJobWorksheet(job);
            return (
              <Pressable
                key={job.id}
                onPress={() => isWorksheet && navigation.navigate('JobTicketDetail', { invoiceId: job.id })}
                style={({ pressed }) => ({ opacity: pressed && isWorksheet ? 0.85 : 1, marginBottom: 10 })}
              >
                <Panel>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flex: 1 }}>
                      <H2 style={{ fontSize: 15 }} numberOfLines={1}>{isWorksheet ? `Worksheet ${displayTicketNumber(job.invoiceNumber)}` : 'Calculation'}</H2>
                      <Mono tone="muted" style={{ fontSize: 11.5, marginTop: 3 }} numberOfLines={1}>
                        {new Date(job.createdAt).toLocaleDateString()}
                        {isWorksheet ? ` · ${job.lineItems.length} ${job.lineItems.length === 1 ? 'item' : 'items'}` : ''}
                      </Mono>
                    </View>
                    {isWorksheet ? <Pill label={jobStatusLabel(job.status)} tone={jobStatusTone(job.status)} /> : <MaterialIcons name="calculate" size={20} color={c.textMuted} />}
                  </View>
                </Panel>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </Screen>
  );
}
