/**
 * B12 — HomeScreen (placeholder)
 * Full implementation: B13
 *
 * Portability matrix: HomePage → Rewrite → B13
 * Navigation: AppTabs > HomeStack > Home
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<HomeStackParamList, 'Home'>;

export function HomeScreen({ navigation }: Props): React.JSX.Element {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Home</Text>
      <Text style={styles.subtitle}>[Placeholder — B13 implementa]</Text>
      <Pressable
        style={styles.button}
        onPress={() => navigation.navigate('MoonPhase')}
      >
        <Text style={styles.buttonText}>Ir a Fase Lunar</Text>
      </Pressable>
      {__DEV__ && (
        <Pressable
          style={[styles.button, { backgroundColor: '#8B0000' }]}
          onPress={() => navigation.navigate('DevGate')}
        >
          <Text style={styles.buttonText}>DEV: Gate Waves 1-3</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  title: { fontSize: 22, fontWeight: '700' },
  subtitle: { fontSize: 14, color: '#666' },
  button: {
    backgroundColor: '#1a4a7a',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 12,
  },
  buttonText: { color: '#fff', fontWeight: '600' },
});

export default HomeScreen;
