/**
 * B12 — GuideMeasurementScreen (placeholder)
 * Full implementation: B13
 *
 * Portability matrix: GuideMeasurementComponent → Rewrite → B13
 * Navigation: AppStack > GuideMeasurement
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AppStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'GuideMeasurement'>;

export function GuideMeasurementScreen({ route }: Props): React.JSX.Element {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>GuideMeasurement</Text>
      {route.params.taskId ? (
        <Text style={styles.subtitle}>taskId: {route.params.taskId}</Text>
      ) : null}
      <Text style={styles.subtitle}>[Placeholder — B13 implementa]</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  title: { fontSize: 22, fontWeight: '700' },
  subtitle: { fontSize: 14, color: '#666' },
});

export default GuideMeasurementScreen;
