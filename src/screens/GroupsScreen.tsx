import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList, Group } from '../types';
import { fetchMyGroups } from '../services/groupService';

type Props = NativeStackScreenProps<RootStackParamList, 'Groups'>;

export default function GroupsScreen({ navigation }: Props) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setGroups(await fetchMyGroups());
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
    const unsubscribe = navigation.addListener('focus', load);
    return unsubscribe;
  }, [load, navigation]);

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
          !loading ? (
            <Text style={styles.emptyText}>Você ainda não faz parte de nenhum grupo.</Text>
          ) : null
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
