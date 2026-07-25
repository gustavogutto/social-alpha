import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList, Group } from '../types';
import { fetchMyGroups } from '../services/groupService';
import PageContainer from '../components/PageContainer';
import { colors } from '../theme/colors';

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
      <PageContainer maxWidth={480}>
        <View style={styles.content}>
          <FlatList
            style={styles.flatList}
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
      </PageContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.shell },
  content: { flex: 1, padding: 16 },
  flatList: { flex: 1 },
  centered: { alignItems: 'center', justifyContent: 'center', marginTop: 32 },
  errorText: { color: colors.danger, textAlign: 'center', marginBottom: 10 },
  retryText: { color: colors.accent, fontWeight: '600' },
  list: { flexGrow: 1 },
  groupRow: {
    backgroundColor: colors.card,
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
  },
  groupName: { fontSize: 16, fontWeight: '600', color: colors.text },
  emptyText: { color: colors.textMuted, textAlign: 'center', marginTop: 32 },
  button: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  buttonText: { color: colors.onAccent, fontSize: 16, fontWeight: '600' },
});
