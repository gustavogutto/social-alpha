import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList, Group } from '../types';
import { fetchMyGroups } from '../services/groupService';

type Props = NativeStackScreenProps<RootStackParamList, 'Groups'>;

export default function GroupsScreen({ navigation }: Props) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setGroups(await fetchMyGroups());
  }, []);

  const reload = useCallback(() => {
    return load()
      .then(() => setError(null))
      .catch((e) => setError(e instanceof Error ? e.message : 'Não foi possível carregar os grupos.'));
  }, [load]);

  useEffect(() => {
    reload().finally(() => setLoading(false));
    const unsubscribe = navigation.addListener('focus', reload);
    return unsubscribe;
  }, [reload, navigation]);

  return (
    <View style={styles.container}>
      <FlatList
        data={groups}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.groupRow}>
            <Text style={styles.groupName}>{item.name}</Text>
          </View>
        )}
        ListEmptyComponent={
          loading ? null : error ? (
            <View style={styles.centered}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity onPress={reload}>
                <Text style={styles.retryText}>Tentar novamente</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <Text style={styles.emptyText}>Você ainda não faz parte de nenhum grupo.</Text>
          )
        }
      />
      <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('CreateGroup')}>
        <Text style={styles.buttonText}>+ Criar grupo</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  centered: { alignItems: 'center', justifyContent: 'center', marginTop: 32 },
  errorText: { color: '#c0392b', textAlign: 'center', marginBottom: 10 },
  retryText: { color: '#1a1a1a', fontWeight: '600' },
  list: { flexGrow: 1 },
  groupRow: {
    backgroundColor: '#f7f7f7',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
  },
  groupName: { fontSize: 16, fontWeight: '600' },
  emptyText: { color: '#666', textAlign: 'center', marginTop: 32 },
  button: {
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
