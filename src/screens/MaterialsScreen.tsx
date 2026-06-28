import { MaterialIcons } from '@expo/vector-icons';
import { View } from 'react-native';
import { Body, H2, Label, Small } from '../components/Type';
import {
  Divider,
  IconTile,
  ListScreenHeader,
  ListScreenScrollView,
  Panel,
  Screen,
  SECTION_GAP,
  useBottomClearance,
} from '../components/ui';
import { FooterAdBanner } from '../components/AdBanner';
import { useColors } from '../theme/useAppTheme';

type MaterialGroup = {
  title: string;
  subtitle: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  accent: string;
  items: string[];
};

const MATERIAL_GROUPS: MaterialGroup[] = [
  {
    title: 'Refrigerant + Lines',
    subtitle: 'Check after refrigerant line, superheat, subcool, and charge calculators.',
    icon: 'ac-unit',
    accent: 'blue',
    items: ['Refrigerant by system type', 'Copper suction line set', 'Copper liquid line set', 'Brazing rod and nitrogen purge'],
  },
  {
    title: 'Ductwork + Airflow',
    subtitle: 'Use after duct sizing, air velocity, and CFM calculations.',
    icon: 'air',
    accent: 'amber',
    items: ['Duct by size and gauge', 'Flex duct and collars', 'Dampers and balancing devices', 'Strap, hanger, and sealing supplies'],
  },
  {
    title: 'Electrical + Controls',
    subtitle: 'Match contactor, capacitor, thermostat, and disconnect notes.',
    icon: 'settings-input-component',
    accent: 'green',
    items: ['Capacitors and contactors', 'Thermostat and wire', 'Disconnect or fused switch', 'Low-voltage wire and connectors'],
  },
  {
    title: 'Filters + Closeout',
    subtitle: 'Keep the job worksheet useful before billing happens.',
    icon: 'fact-check',
    accent: 'purple',
    items: ['Correct filter size and MERV', 'Photos before cover-up', 'Permit or inspection notes', 'Final invoice goes to SpeakSheet'],
  },
];

function accentColor(colors: ReturnType<typeof useColors>, accent: MaterialGroup['accent']): string {
  if (accent === 'blue') return colors.info;
  if (accent === 'green') return colors.pass;
  if (accent === 'purple') return colors.textMuted;
  return colors.amberBright;
}

function MaterialPanel({ group }: { group: MaterialGroup }) {
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
      <View style={{ gap: 10 }}>
        {group.items.map((item) => (
          <View key={item} style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
            <MaterialIcons name="check-circle" size={18} color={color} />
            <Body tone="dim" style={{ flex: 1 }}>{item}</Body>
          </View>
        ))}
      </View>
    </Panel>
  );
}

export function MaterialsScreen() {
  const bottomClearance = useBottomClearance();

  return (
    <Screen>
      <ListScreenScrollView bottomPadding={bottomClearance}>
        <ListScreenHeader
          title="Materials"
          subtitle="Field pull-list starters tied to the calculator workflow."
        />
        <View style={{ marginBottom: 4 }}>
          <Label>Plan the job</Label>
        </View>
        {MATERIAL_GROUPS.map((group) => (
          <MaterialPanel key={group.title} group={group} />
        ))}
        <FooterAdBanner />
      </ListScreenScrollView>
    </Screen>
  );
}
