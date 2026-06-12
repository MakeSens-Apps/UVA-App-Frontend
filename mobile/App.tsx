/**
 * UVA App — React Native (Expo)
 * Entry point — B03: Amplify + DataStore + NetInfo bootstrap
 *
 * Import ORDER is critical (portability matrix §3.2, R-04):
 *  1. react-native-get-random-values  — must be FIRST (UUIDs for DataStore models)
 *  2. react-native-url-polyfill/auto  — URL API used by Amplify internally
 *  3. Amplify.configure(amplifyconfiguration) — before any generateClient/DataStore call
 *  4. DataStore.configure({ syncExpressions }) — selective sync identical to original
 *  5. subscribeToSync() — Hub listener for networkStatus + sync state
 *
 * References:
 *  - src/main.ts (Amplify.configure)
 *  - src/app/app.component.ts (DataStore.configure + subscribeToSync)
 *  - portability-matrix.md §3.2 "Amplify bootstrap" → Major
 *  - R-04: NetInfo required for Hub networkStatus emission
 */

/* eslint-disable import/first */

// ─── Step 1 & 2: Polyfills (MUST be before everything else) ─────────────────
import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';

// ─── Step 3 & 4: Amplify + DataStore configure ───────────────────────────────
import { bootstrapAmplify } from '@/data/amplify-bootstrap/amplify-config';
bootstrapAmplify();

// ─── Step 5: Hub subscription ────────────────────────────────────────────────
import { subscribeToSync } from '@/data/amplify-bootstrap/sync-monitor';
subscribeToSync();

/* eslint-enable import/first */

// ─── React / RN ──────────────────────────────────────────────────────────────
// eslint-disable-next-line import/first
import React from 'react';
// eslint-disable-next-line import/first
import { StatusBar } from 'expo-status-bar';
// eslint-disable-next-line import/first
import { StyleSheet, Text, View } from 'react-native';

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>UVA App</Text>
      <Text style={styles.subtitle}>React Native — B03 Amplify+DataStore</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E6F4FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1a4a7a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#4a7aaa',
  },
});
