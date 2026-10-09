/**
 * DEV ONLY — DevGateScreen
 *
 * Visual integration gate for Waves 1-3 (B08-B12).
 * Mounted only when __DEV__ === true (Metro dev builds).
 *
 * Gates exercised:
 *   B08 — ThemeProvider hydration, fonts loaded, 4 Montserrat weights
 *   B09 — RichText with HTML + var() tokens
 *   B10 — ConfirmModal, UvaBottomSheet, Toast, LoadingOverlay, AppIcon (SVG), MoonPhaseIcon
 *   B11 — Calendar (normal fixtures), Areachart (normal + detailedMode)
 *   B12 — Navigation between tabs, MoonPhase hidden route, ModalAlert modal group
 */

import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '@/navigation/types';

// B08 — Theme
import { useTheme } from '@/theme/ThemeProvider';
import { fontFamilyForWeight } from '@/theme/theme';

// B09 — RichText
import { RichText } from '@/components/rich-text';

// B10 — UI Primitives
import {
  ConfirmModal,
  UvaBottomSheet,
  LoadingOverlay,
  showToast,
  type BottomSheetRef,
} from '@/components/ui';
import { AppIcon } from '@/components/icons/AppIcons';
import { MoonPhaseIcon } from '@/components/icons/MoonPhaseIcons';

// B11 — Calendar + Areachart
import { Calendar } from '@/components/calendar';
import { Areachart } from '@/components/areachart';

// ─── Types ─────────────────────────────────────────────────────────────────────

type Props = NativeStackScreenProps<HomeStackParamList, 'DevGate'>;

// ─── Section header (declared outside render) ──────────────────────────────────

function SectionHeader({ title }: { title: string }): React.JSX.Element {
  return <Text style={sectionHeaderStyle}>{title}</Text>;
}

const sectionHeaderStyle = {
  fontSize: 14,
  fontFamily: fontFamilyForWeight('600'),
  color: '#14788A',
  marginTop: 20,
  marginBottom: 8,
  textTransform: 'uppercase' as const,
  letterSpacing: 0.5,
};

// ─── B11 data fixtures (static, outside component) ─────────────────────────────

const CALENDAR_VIEW_DATE = new Date(2025, 5, 1); // June 2025
const CHART_DATA = [22, 24, 21, 23, 20, 25, 22];
const CHART_LABELS = [
  '2025-06-01',
  '2025-06-02',
  '2025-06-03',
  '2025-06-04',
  '2025-06-05',
  '2025-06-06',
  '2025-06-07',
];
const CHART_MIN_DATA = [19, 21, 18, 20, 18, 21, 19];
const CHART_MAX_DATA = [26, 27, 24, 28, 24, 29, 26];

// B09 HTML fixture (tests var() token resolution)
const RICH_HTML = `
  <h3 style="color: var(--ion-color-uva_blue-500)">Temperatura</h3>
  <p>Toma la medición a la <strong>sombra</strong> y espera <em>5 minutos</em>.</p>
  <ul><li>Coloca el termómetro</li><li>Lee la escala</li></ul>
`;

// ─── Component ─────────────────────────────────────────────────────────────────

export function DevGateScreen({ navigation }: Props): React.JSX.Element {
  const { theme, fontsLoaded } = useTheme();

  // B10 state
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [loadingVisible, setLoadingVisible] = useState(false);
  const bottomSheetRef = useRef<BottomSheetRef>(null);

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      {/* ── B08: ThemeProvider status ──────────────────────────────────────── */}
      <SectionHeader title="B08 — Theme / Montserrat" />
      <View style={styles.row}>
        <Text style={{ fontFamily: 'Montserrat-Regular' }}>Regular 400</Text>
        <Text style={{ fontFamily: 'Montserrat-Medium' }}>Medium 500</Text>
        <Text style={{ fontFamily: 'Montserrat-SemiBold' }}>SemiBold 600</Text>
        <Text style={{ fontFamily: 'Montserrat-Bold' }}>Bold 700</Text>
      </View>
      <Text style={styles.status}>
        fontsLoaded:{' '}
        <Text
          style={{
            color: fontsLoaded
              ? theme.colors.green[500]
              : theme.colors.orange[500],
          }}
        >
          {String(fontsLoaded)}
        </Text>
      </Text>
      <Text style={styles.status}>
        blue[500]:{' '}
        <Text style={{ color: theme.colors.blue[500] }}>
          {theme.colors.blue[500]}
        </Text>
      </Text>

      {/* ── B09: RichText HTML ─────────────────────────────────────────────── */}
      <SectionHeader title="B09 — RichText HTML" />
      <View style={styles.card}>
        <RichText html={RICH_HTML} />
      </View>

      {/* ── B10: ConfirmModal ──────────────────────────────────────────────── */}
      <SectionHeader title="B10 — UI Primitives" />
      <Pressable style={styles.btn} onPress={() => setConfirmVisible(true)}>
        <Text style={styles.btnText}>Abrir ConfirmModal</Text>
      </Pressable>
      <ConfirmModal
        visible={confirmVisible}
        content="<p>¿Confirmas la acción?</p>"
        textOkButton="OK"
        textCancelButton="Cancelar"
        onResult={(r) => {
          setConfirmVisible(false);
          showToast({ message: `Modal: ${r}`, type: 'info' });
        }}
      />

      {/* B10: BottomSheet */}
      <Pressable
        style={styles.btn}
        onPress={() => bottomSheetRef.current?.present()}
      >
        <Text style={styles.btnText}>Abrir BottomSheet</Text>
      </Pressable>
      <UvaBottomSheet ref={bottomSheetRef} snapPoints={['40%', '70%']}>
        <View style={styles.sheetContent}>
          <Text style={styles.sheetText}>BottomSheet funcionando</Text>
          <Pressable
            style={styles.btn}
            onPress={() => bottomSheetRef.current?.dismiss()}
          >
            <Text style={styles.btnText}>Cerrar</Text>
          </Pressable>
        </View>
      </UvaBottomSheet>

      {/* B10: Toast */}
      <Pressable
        style={styles.btn}
        onPress={() =>
          showToast({
            message: 'Toast de prueba OK',
            type: 'success',
            position: 'bottom',
          })
        }
      >
        <Text style={styles.btnText}>Mostrar Toast</Text>
      </Pressable>

      {/* B10: LoadingOverlay */}
      <Pressable
        style={styles.btn}
        onPress={() => {
          setLoadingVisible(true);
          setTimeout(() => setLoadingVisible(false), 1500);
        }}
      >
        <Text style={styles.btnText}>LoadingOverlay (1.5s)</Text>
      </Pressable>
      <LoadingOverlay visible={loadingVisible} message="Cargando..." />

      {/* B10: AppIcon SVG */}
      <View style={styles.row}>
        <AppIcon name="check" width={32} height={32} />
        <AppIcon name="brote" width={32} height={32} />
        <AppIcon name="fire" width={32} height={32} />
        <AppIcon name="cloud" width={32} height={32} />
      </View>
      <Text style={styles.status}>AppIcons: check / brote / fire / cloud</Text>

      {/* B10: MoonPhaseIcon */}
      <View style={styles.row}>
        <MoonPhaseIcon phase="new" width={36} height={36} />
        <MoonPhaseIcon phase="crescent" width={36} height={36} />
        <MoonPhaseIcon phase="full" width={36} height={36} />
        <MoonPhaseIcon phase="declining" width={36} height={36} />
        <MoonPhaseIcon phase="eclipse" width={36} height={36} />
      </View>
      <Text style={styles.status}>
        MoonPhaseIcons: new/crescent/full/declining/eclipse
      </Text>

      {/* ── B11: Calendar ─────────────────────────────────────────────────── */}
      <SectionHeader title="B11 — Calendar" />
      <Calendar
        viewDate={CALENDAR_VIEW_DATE}
        daysComplete={[1, 5, 12, 18]}
        daysIncomplete={[3, 7, 15]}
        daysSaveStreak={[14]}
        hasHeader
        hasTitle
        title="Junio 2025"
      />

      {/* ── B11: Areachart (normal) ────────────────────────────────────────── */}
      <SectionHeader title="B11 — Areachart (normal)" />
      <Areachart
        chartData={CHART_DATA}
        chartLabels={CHART_LABELS}
        background="#FBA641"
        borderColor="#FBA641"
        height={180}
      />

      {/* ── B11: Areachart (detailedMode) ─────────────────────────────────── */}
      <SectionHeader title="B11 — Areachart (detailedMode)" />
      <Areachart
        chartData={CHART_DATA}
        chartLabels={CHART_LABELS}
        background="#10BCCA"
        borderColor="#10BCCA"
        height={200}
        detailedMode
        chartMinData={CHART_MIN_DATA}
        chartMaxData={CHART_MAX_DATA}
      />

      {/* ── B12: Navigation gates ─────────────────────────────────────────── */}
      <SectionHeader title="B12 — Navigation" />
      <Pressable
        style={styles.btn}
        onPress={() => navigation.navigate('MoonPhase')}
      >
        <Text style={styles.btnText}>Ir a MoonPhase (ruta oculta)</Text>
      </Pressable>

      <View style={{ height: 60 }} />
    </ScrollView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#f8f9fa' },
  container: { padding: 16, paddingBottom: 40 },
  status: { fontSize: 12, color: '#444', marginBottom: 4 },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 8,
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  btn: {
    backgroundColor: '#1a4a7a',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  sheetContent: { padding: 20, alignItems: 'center', gap: 12 },
  sheetText: { fontSize: 16, fontWeight: '600' },
});

export default DevGateScreen;
