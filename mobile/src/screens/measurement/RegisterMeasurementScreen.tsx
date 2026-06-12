/**
 * B12 — RegisterMeasurementScreen (placeholder)
 * Full implementation: B13
 *
 * Portability matrix: RegisterMeasurementPage → Rewrite → B13
 * Navigation: AppStack > RegisterMeasurement
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AppStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'RegisterMeasurement'>;

export function RegisterMeasurementScreen({ route }: Props): React.JSX.Element {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>RegisterMeasurement</Text>
      <Text style={styles.subtitle}>taskId: {route.params.taskId}</Text>
      <Text style={styles.subtitle}>[Placeholder — B13 implementa]</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  title: { fontSize: 22, fontWeight: '700' },
  subtitle: { fontSize: 14, color: '#666' },
});

export default RegisterMeasurementScreen;
