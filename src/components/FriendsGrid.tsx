import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { Profile, RootStackParamList } from '../types';
import { colors } from '../theme/colors';

export default function FriendsGrid({
  friends,
  emptyText,
  onSeeAll,
}: {
  friends: Profile[];
  emptyText: string;
  onSeeAll?: () => void;
}) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  if (friends.length === 0) {
    return <Text style={styles.emptyText}>{emptyText}</Text>;
  }

  return (
    <View>
      <View style={styles.grid}>
        {friends.map((friend) => (
          <TouchableOpacity
            key={friend.id}
            style={styles.cell}
            onPress={() => navigation.navigate('UserProfile', { userId: friend.id })}
          >
            {friend.avatar_url ? (
              <Image source={{ uri: friend.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]} />
            )}
            <Text style={styles.name} numberOfLines={1}>
              {friend.display_name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {onSeeAll ? (
        <TouchableOpacity onPress={onSeeAll}>
          <Text style={styles.seeAll}>Ver todos os amigos</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center' },
  cell: { width: 64, alignItems: 'center' },
  avatar: { width: 52, height: 52, borderRadius: 26, borderWidth: 2, borderColor: colors.accent },
  avatarPlaceholder: { backgroundColor: colors.placeholder },
  name: { fontSize: 11, marginTop: 4, color: colors.text, textAlign: 'center' },
  emptyText: { color: colors.textMuted, textAlign: 'center' },
  seeAll: { color: colors.accent, fontWeight: '600', textAlign: 'center', marginTop: 12 },
});
