// Polyfills MUST be imported before anything else (required by B03: Amplify/DataStore)
import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';

import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>UVA App</Text>
      <Text style={styles.subtitle}>React Native — B01 scaffold</Text>
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
