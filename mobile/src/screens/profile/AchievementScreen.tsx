/**
 * B12 — AchievementScreen (placeholder)
 * Full implementation: B16
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export function AchievementScreen(): React.JSX.Element {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Logros</Text>
      <Text style={styles.subtitle}>[Placeholder — B16 implementa]</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  title: { fontSize: 22, fontWeight: '700' },
  subtitle: { fontSize: 14, color: '#666' },
});

export default AchievementScreen;
