import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAppStore, type Invoice } from '../store/useAppStore';
import { InvoiceService } from '../services/InvoiceService';
import { useColors } from '../theme/useAppTheme';
import { Body, H2, Label, Small } from '../components/Type';
import {
  Divider,
  EmptyState,
  IconTile,
  ListScreenHeader,
  ListScreenScrollView,
  Panel,
  PrimaryButton,
  Screen,
  SearchBar,
  SECTION_GAP,
  useBottomClearance,
  withAlpha,
} from '../components/ui';
import { FooterAdBanner } from '../components/AdBanner';

type MaterialItem = {
  id: string;
  label: string;
};

type MaterialGroup = {
  title: string;
  subtitle: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  accent: string;
  items: MaterialItem[];
};

const MATERIAL_GROUPS: MaterialGroup[] = [
  {
    title: 'Refrigerant + Lines',
    subtitle: 'Pull-list items for refrigerant line and charge work.',
    icon: 'ac-unit',
    accent: 'blue',
    items: [
      { id: 'ref-refrigerant', label: 'Refrigerant by system type' },
      { id: 'ref-suction', label: 'Copper suction line set' },
      { id: 'ref-liquid', label: 'Copper liquid line set' },
      { id: 'ref-brazing', label: 'Brazing rod and nitrogen purge' },
    ],
  },
  {
    title: 'Ductwork + Airflow',
    subtitle: 'Items tied to duct sizing, velocity, and CFM calculations.',
    icon: 'air',
    accent: 'amber',
    items: [
      { id: 'duct-material', label: 'Duct by size and gauge' },
      { id: 'duct-flex', label: 'Flex duct and collars' },
      { id: 'duct-dampers', label: 'Dampers and balancing devices' },
      { id: 'duct-hangers', label: 'Strap, hanger, and sealing supplies' },
    ],
  },
  {
    title: 'Electrical + Controls',
    subtitle: 'Control and power items for the system.',
    icon: 'settings-input-component',
    accent: 'green',
    items: [
      { id: 'elec-capacitors', label: 'Capacitors and contactors' },
      { id: 'elec-thermostat', label: 'Thermostat and wire' },
      { id: 'elec-disconnect', label: 'Disconnect or fused switch' },
      { id: 'elec-low-voltage', label: 'Low-voltage wire and connectors' },
    ],
  },
  {
    title: 'Filters + Closeout',
    subtitle: 'Finish items and handoff notes.',
    icon: 'fact-check',
    accent: 'purple',
    items: [
      { id: 'closeout-filter', label: 'Correct filter size and MERV' },
      { id: 'closeout-photos', label: 'Photos before cover-up' },
      { id: 'closeout-permit', label: 'Permit or inspection notes' },
      { id: 'closeout-speaksheet', label: 'Final invoice goes to SpeakSheet' },
    ],
  },
];

function accentColor(colors: ReturnType<typeof useColors>, accent: MaterialGroup['accent']): string {
  if (accent === 'blue') return colors.info;
  if (accent === 'green') return colors.pass;
  if (accent === 'purple') return colors.textMuted;
  return colors.amberBright;
}

function MaterialPanel({
  group,
  selected,
  onToggle,
}: {
  group: MaterialGroup;
  selected: Set<string>;
  onToggle: (id: string) => void;
}) {
  const c = useColors();
  const color = accentColor(c, group.accent);

  return (
    <Panel style={{ marginBottom: SECTION_GAP }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 13 }}>
        <IconTile icon={group.icon} color={color} size={48} />
        <View style={{ flex: 1 }}>
          <H2 style={{ fontSize: 17 }} numberOfLines={1}>{group.title}</H2>
          <Small tone="muted" style={{ marginTop: 3 }}>{group.subtitle}</Small>
        </View>
      </View>
      <Divider style={{ marginVertical: 14 }} />
      <View style={{ gap: 6 }}>
        {group.items.map((item) => {
          const isSelected = selected.has(item.id);
          return (
            <Pressable
              key={item.id}
              onPress={() => onToggle(item.id)}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                paddingVertical: 10,
                paddingHorizontal: 12,
                borderRadius: 12,
                backgroundColor: isSelected ? withAlpha(color, 0.12) : 'transparent',
                borderWidth: 1,
                borderColor: isSelected ? withAlpha(color, 0.35) : 'transparent',
                opacity: pressed ? 0.75 : 1,
              })}
            >
              <MaterialIcons
                name={isSelected ? 'check-circle' : 'radio-button-unchecked'}
                size={22}
                color={isSelected ? color : c.textMuted}
              />
              <Body tone={isSelected ? 'primary' : 'dim'} style={{ flex: 1 }}>{item.label}</Body>
            </Pressable>
          );
        })}
      </View>
    </Panel>
  );
}

export function MaterialsScreen() {
  const navigation = useNavigation<any>();
  const { invoices, clients, updateInvoice } = useAppStore();
  const c = useColors();
  const bottomClearance = useBottomClearance();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pickerOpen, setPickerOpen] = useState(false);

  const openJobs = useMemo(
    () => invoices.filter((i) => i.status !== 'paid').sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [invoices]
  );

  const clientName = (id: string) => clients.find((cl) => cl.id === id)?.name || 'Unknown contact';

  const filteredGroups = useMemo(() => {
    const q = query.trim().toLowerCase();
    return MATERIAL_GROUPS.map((group) => ({
      ...group,
      items: q ? group.items.filter((item) => item.label.toLowerCase().includes(q)) : group.items,
    })).filter((group) => group.items.length > 0);
  }, [query]);

  const toggleItem = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const addToJob = (job: Invoice) => {
    const selectedItems = MATERIAL_GROUPS.flatMap((g) => g.items).filter((item) => selected.has(item.id));
    const newLineItems = selectedItems.map((item) => InvoiceService.createLineItem(item.label, 1, 0));
    const lineItems = [...job.lineItems, ...newLineItems];
    const { subtotal, taxAmount, total } = InvoiceService.calculateTotals(lineItems, job.taxRate);
    updateInvoice(job.id, { lineItems, subtotal, taxAmount, total });
    setSelected(new Set());
    setPickerOpen(false);
  };

  const createJob = () => {
    setPickerOpen(false);
    navigation.navigate('Jobs', { screen: 'CreateJobTicket' });
  };

  const selectedCount = selected.size;

  return (
    <Screen>
      <ListScreenScrollView bottomPadding={bottomClearance + 110}>
        <ListScreenHeader
          title="Materials"
          subtitle="Tap items to select, then add them to an open job worksheet."
        />
        <View style={{ marginBottom: SECTION_GAP }}>
          <SearchBar
            value={query}
            onChangeText={setQuery}
            placeholder="Search materials…"
          />
        </View>

        {filteredGroups.length === 0 ? (
          <EmptyState icon="search-off" title="No matches" subtitle="Try a different search term." />
        ) : (
          filteredGroups.map((group) => (
            <MaterialPanel
              key={group.title}
              group={group}
              selected={selected}
              onToggle={toggleItem}
            />
          ))
        )}
        <FooterAdBanner />
      </ListScreenScrollView>

      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          paddingHorizontal: 20,
          paddingTop: 14,
          paddingBottom: bottomClearance + 14,
          backgroundColor: c.bgElevated,
          borderTopWidth: 1,
          borderTopColor: c.border,
        }}
      >
        <PrimaryButton
          label={selectedCount === 0 ? 'Select items to add' : `Add ${selectedCount} item${selectedCount === 1 ? '' : 's'} to job worksheet`}
          icon={selectedCount === 0 ? undefined : 'assignment'}
          disabled={selectedCount === 0}
          onPress={() => setPickerOpen(true)}
        />
      </View>

      <Modal
        visible={pickerOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setPickerOpen(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' }}
          onPress={() => setPickerOpen(false)}
        >
          <Pressable
            style={{
              backgroundColor: c.panel,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              borderTopWidth: 1,
              borderTopColor: c.border,
              paddingTop: 20,
              paddingHorizontal: 20,
              paddingBottom: bottomClearance + 20,
              maxHeight: '80%',
            }}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <H2>Add to which job?</H2>
              <Pressable onPress={() => setPickerOpen(false)} hitSlop={10}>
                <MaterialIcons name="close" size={24} color={c.textMuted} />
              </Pressable>
            </View>

            {openJobs.length === 0 ? (
              <View>
                <Body tone="muted" style={{ marginBottom: 16 }}>
                  No open job worksheets. Create one first, then come back to add materials.
                </Body>
                <PrimaryButton label="Create job worksheet" icon="add" onPress={createJob} />
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={{ gap: 10 }}>
                  {openJobs.map((job) => (
                    <Pressable
                      key={job.id}
                      onPress={() => addToJob(job)}
                      style={({ pressed }) => ({
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 12,
                        padding: 14,
                        borderRadius: 16,
                        backgroundColor: c.inset,
                        borderWidth: 1,
                        borderColor: c.border,
                        opacity: pressed ? 0.75 : 1,
                      })}
                    >
                      <View style={{ flex: 1 }}>
                        <Body tone="primary">{job.invoiceNumber.replace(/^INV-/, 'JOB-')}</Body>
                        <Small style={{ marginTop: 3 }}>{clientName(job.clientId)} · {job.lineItems.length} item{job.lineItems.length === 1 ? '' : 's'}</Small>
                      </View>
                      <MaterialIcons name="add-circle-outline" size={24} color={c.amber} />
                    </Pressable>
                  ))}
                </View>
                <View style={{ marginTop: 16 }}>
                  <PrimaryButton label="Create new worksheet" icon="add" onPress={createJob} />
                </View>
              </ScrollView>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}
