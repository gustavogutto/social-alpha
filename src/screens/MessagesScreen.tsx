import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function MessagesScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mensagens</Text>
      <Text style={styles.subtitle}>Em breve: conversas diretas e em grupo.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: '700' },
  subtitle: { color: '#666', marginTop: 8, textAlign: 'center', paddingHorizontal: 32 },
});
