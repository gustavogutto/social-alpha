import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { Profile, RootStackParamList } from '../types';
import { useAuth } from '../context/AuthContext';
import { createGroup, fetchOtherProfiles } from '../services/groupService';

type Props = NativeStackScreenProps<RootStackParamList, 'CreateGroup'>;

export default function CreateGroupScreen({ navigation }: Props) {
  const { session } = useAuth();
  const [name, setName] = useState('');
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (session?.user) {
      fetchOtherProfiles(session.user.id)
        .then(setProfiles)
        .catch((e) => setError(e instanceof Error ? e.message : 'Não foi possível carregar as pessoas.'));
    }
  }, [session?.user]);

  function toggleMember(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSubmit() {
    if (!session?.user) return;
    if (!name.trim()) {
      setError('Dê um nome para o grupo.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await createGroup({
        name: name.trim(),
        creatorId: session.user.id,
        memberIds: Array.from(selectedIds),
      });
      navigation.goBack();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível criar o grupo.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Nome do grupo"
        value={name}
        onChangeText={setName}
      />
      <Text style={styles.sectionLabel}>Adicionar membros</Text>
      <FlatList
        data={profiles}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const selected = selectedIds.has(item.id);
          return (
            <TouchableOpacity style={styles.memberRow} onPress={() => toggleMember(item.id)}>
              <Text style={styles.memberName}>{item.display_name}</Text>
              <View style={[styles.checkbox, selected && styles.checkboxChecked]} />
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            {error ? error : 'Ninguém mais cadastrado ainda.'}
          </Text>
        }
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={submitting}>
        <Text style={styles.buttonText}>{submitting ? 'Criando...' : 'Criar grupo'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    marginBottom: 16,
  },
  sectionLabel: { fontWeight: '600', color: '#444', marginBottom: 8 },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  memberName: { fontSize: 15 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  checkboxChecked: { backgroundColor: '#1a1a1a', borderColor: '#1a1a1a' },
  emptyText: { color: '#666', textAlign: 'center', marginTop: 16 },
  button: {
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  error: { color: '#c0392b', marginTop: 12, textAlign: 'center' },
});
