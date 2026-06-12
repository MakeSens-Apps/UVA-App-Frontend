/**
 * B12 — MeasurementDetailScreen (placeholder)
 * Full implementation: B15
 *
 * Portability matrix: MeasurementDetailPage → Rewrite → B15
 * Navigation: AppStack > MeasurementDetail
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AppStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'MeasurementDetail'>;

export function MeasurementDetailScreen({ route }: Props): React.JSX.Element {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>MeasurementDetail</Text>
      <Text style={styles.subtitle}>calendar: {route.params.calendar}</Text>
      <Text style={styles.subtitle}>origin: {route.params.origin}</Text>
      <Text style={styles.subtitle}>[Placeholder — B15 implementa]</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  title: { fontSize: 22, fontWeight: '700' },
  subtitle: { fontSize: 14, color: '#666' },
});

export default MeasurementDetailScreen;
