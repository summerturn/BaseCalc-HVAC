import { Pressable, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAppStore } from '../store/useAppStore';
import { CATEGORY } from '../theme/appTheme';
import { useColors } from '../theme/useAppTheme';
import { Body, H2, Label, Mono } from '../components/Type';
import {
  ACTION_RAIL_WIDTH,
  EmptyState,
  LIST_CARD_GAP,
  ListScreenHeader,
  ListScreenScrollView,
  Panel,
  Screen,
  useBottomClearance,
} from '../components/ui';
import { FooterAdBanner } from '../components/AdBanner';

const typeLabels: Record<string, string> = {
  btuTons: 'BTU ↔ Tons',
  cfmFromBtu: 'CFM from BTU',
  btuFromCfm: 'BTU from CFM',
  ductSizing: 'Duct Sizing',
  airVelocity: 'Air Velocity',
  psychrometrics: 'Psychrometrics',
  refrigerantLines: 'Refrigerant Lines',
  superheatSubcool: 'Superheat / Subcool',
  roomLoad: 'Room Load',
  heatPumpBalance: 'Heat Pump Balance',
  hydronics: 'Hydronics',
  mixedAir: 'Mixed Air',
  airChanges: 'Air Changes',
  evaporativeCooling: 'Evaporative Cooling',
  filterVelocity: 'Filter Velocity',
  combustionAnalysis: 'Combustion Analysis',
  refrigerantWeight: 'Refrigerant Weight',
  economizer: 'Economizer',
};

const typeColors: Record<string, string> = {
  btuTons: CATEGORY.load,
  cfmFromBtu: CATEGORY.airflow,
  btuFromCfm: CATEGORY.airflow,
  ductSizing: CATEGORY.duct,
  airVelocity: CATEGORY.airflow,
  psychrometrics: CATEGORY.psychrometrics,
  refrigerantLines: CATEGORY.refrigerant,
  superheatSubcool: CATEGORY.refrigerant,
  roomLoad: CATEGORY.load,
  heatPumpBalance: CATEGORY.load,
  hydronics: CATEGORY.hydronics,
  mixedAir: CATEGORY.airflow,
  airChanges: CATEGORY.airflow,
  evaporativeCooling: CATEGORY.efficiency,
  filterVelocity: CATEGORY.duct,
  combustionAnalysis: CATEGORY.general,
  refrigerantWeight: CATEGORY.refrigerant,
  economizer: CATEGORY.airflow,
};

export function HistoryScreen() {
  const { calculations, deleteCalculation } = useAppStore();
  const c = useColors();
  const bottomClearance = useBottomClearance();

  const items = [...calculations].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <Screen>
      <ListScreenScrollView bottomPadding={bottomClearance}>
        <ListScreenHeader title="History" subtitle="Saved calculations on this device." />

        {items.length === 0 ? (
          <EmptyState icon="history" title="No history yet" subtitle="Run a calculation to keep a job-site record here." />
        ) : (
          items.map((item) => {
            const color = typeColors[item.type] ?? c.amber;
            return (
              <Panel key={item.id} style={{ marginBottom: LIST_CARD_GAP }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                  <View style={{ width: 9, height: 9, borderRadius: 9, backgroundColor: color, marginTop: 7 }} />
                  <View style={{ flex: 1 }}>
                    <H2 style={{ fontSize: 17 }} numberOfLines={1}>{typeLabels[item.type] || item.type}</H2>
                    <Mono tone="muted" style={{ fontSize: 11.5, marginTop: 3 }} numberOfLines={1}>
                      {new Date(item.createdAt).toLocaleString()}
                    </Mono>
                    {item.result?.message ? (
                      <Body tone="dim" style={{ marginTop: 10 }} numberOfLines={2}>{item.result.message}</Body>
                    ) : null}
                  </View>
                  <Pressable
                    onPress={() => deleteCalculation(item.id)}
                    hitSlop={8}
                    style={({ pressed }) => ({
                      width: ACTION_RAIL_WIDTH,
                      height: 38,
                      borderRadius: 12,
                      backgroundColor: c.inset,
                      borderColor: c.border,
                      borderWidth: 1,
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      opacity: pressed ? 0.6 : 1,
                    })}
                  >
                    <MaterialIcons name="delete-outline" size={20} color={c.textMuted} />
                  </Pressable>
                </View>
              </Panel>
            );
          })
        )}
        <FooterAdBanner />
      </ListScreenScrollView>
    </Screen>
  );
}
