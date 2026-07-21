import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MainTabParamList, RootStackParamList } from '../types';
import { useAuth } from '../context/AuthContext';
import { signOut } from '../services/authService';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Profile'>,
  NativeStackScreenProps<RootStackParamList>
>;

export default function ProfileScreen({ navigation }: Props) {
  const { profile } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{profile?.display_name ?? 'Perfil'}</Text>
      <Text style={styles.subtitle}>@{profile?.username}</Text>
      <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.navigate('Groups')}>
        <Text style={styles.secondaryButtonText}>Meus grupos</Text>
      </TouchableOpacity>
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
  secondaryButton: {
    marginTop: 24,
    borderWidth: 1,
    borderColor: '#1a1a1a',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 32,
  },
  secondaryButtonText: { color: '#1a1a1a', fontSize: 16, fontWeight: '600' },
  button: {
    marginTop: 12,
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 32,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
