/**
 * B12 — MoonPhaseScreen (placeholder)
 * Full implementation: B15
 *
 * Portability matrix: MoonPhasePage → Rewrite → B15
 * Navigation: AppTabs > HomeStack > MoonPhase (hidden from tabs)
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export function MoonPhaseScreen(): React.JSX.Element {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Fase Lunar</Text>
      <Text style={styles.subtitle}>[Placeholder — B15 implementa]</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  title: { fontSize: 22, fontWeight: '700' },
  subtitle: { fontSize: 14, color: '#666' },
});

export default MoonPhaseScreen;
