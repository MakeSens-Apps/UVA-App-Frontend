/**
 * B12 — HistoricalScreen (placeholder)
 * Full implementation: B13 (lista/calendario) + B15 (gráfica/reporte)
 *
 * Portability matrix: HistoricalPage → Rewrite → B13/B15
 * Navigation: AppTabs > Historical
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { AppTabsParamList } from '@/navigation/types';

type Props = BottomTabScreenProps<AppTabsParamList, 'Historical'>;

export function HistoricalScreen({ route }: Props): React.JSX.Element {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Historial</Text>
      {route.params?.selectedDate ? (
        <Text style={styles.subtitle}>selectedDate: {route.params.selectedDate}</Text>
      ) : null}
      <Text style={styles.subtitle}>[Placeholder — B13+B15 implementan]</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  title: { fontSize: 22, fontWeight: '700' },
  subtitle: { fontSize: 14, color: '#666' },
});

export default HistoricalScreen;
