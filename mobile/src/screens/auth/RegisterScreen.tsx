/**
 * B12 — RegisterScreen (placeholder)
 * Full implementation: B14
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export function RegisterScreen(): React.JSX.Element {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Register</Text>
      <Text style={styles.subtitle}>[Placeholder — B14 implementa]</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  title: { fontSize: 22, fontWeight: '700' },
  subtitle: { fontSize: 14, color: '#666' },
});

export default RegisterScreen;
