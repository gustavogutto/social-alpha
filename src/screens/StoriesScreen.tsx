import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function StoriesScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Stories</Text>
      <Text style={styles.subtitle}>Em breve: fotos e vídeos que somem depois de 24h.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: '700' },
  subtitle: { color: '#666', marginTop: 8, textAlign: 'center', paddingHorizontal: 32 },
});
