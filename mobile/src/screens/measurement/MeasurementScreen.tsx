/**
 * B12 — MeasurementScreen (placeholder)
 * Full implementation: B13
 *
 * Portability matrix: MeasurementPage → Rewrite → B13
 * Navigation: AppTabs > Measurement
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export function MeasurementScreen(): React.JSX.Element {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Registrar Medición</Text>
      <Text style={styles.subtitle}>[Placeholder — B13 implementa]</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  title: { fontSize: 22, fontWeight: '700' },
  subtitle: { fontSize: 14, color: '#666' },
});

export default MeasurementScreen;
