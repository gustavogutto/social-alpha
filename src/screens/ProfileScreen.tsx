import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { signOut } from '../services/authService';

export default function ProfileScreen() {
  const { profile } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{profile?.display_name ?? 'Perfil'}</Text>
      <Text style={styles.subtitle}>@{profile?.username}</Text>
      <TouchableOpacity style={styles.button} onPress={() => signOut()}>
        <Text style={styles.buttonText}>Sair</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: '700' },
  subtitle: { color: '#666', marginTop: 4 },
  button: {
    marginTop: 24,
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 32,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
