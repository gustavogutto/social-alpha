import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation, useNavigationState } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MainTabParamList, RootStackParamList } from '../types';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';

const TABS: { name: keyof MainTabParamList; label: string }[] = [
  { name: 'Feed', label: 'Início' },
  { name: 'Stories', label: 'Stories' },
  { name: 'Messages', label: 'Mensagens' },
  { name: 'Notifications', label: 'Notificações' },
  { name: 'Profile', label: 'Perfil' },
];

export default function TopNavBar() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { profile } = useAuth();

  const activeTab = useNavigationState((state) => {
    const mainRoute = state?.routes.find((r) => r.name === 'Main');
    const nestedState = mainRoute?.state;
    if (nestedState && 'routes' in nestedState && typeof nestedState.index === 'number') {
      return nestedState.routes[nestedState.index]?.name;
    }
    return 'Feed';
  });

  return (
    <View style={styles.bar}>
      <View style={styles.inner}>
        <Text style={styles.logo}>SOCIAL</Text>
        <View style={styles.links}>
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab.name}
              style={styles.linkButton}
              onPress={() => navigation.navigate('Main', { screen: tab.name })}
            >
              <Text style={[styles.linkText, activeTab === tab.name && styles.linkTextActive]}>{tab.label}</Text>
              {activeTab === tab.name && <View style={styles.linkUnderline} />}
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity
          style={styles.identity}
          onPress={() => navigation.navigate('Main', { screen: 'Profile' })}
        >
          {profile?.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]} />
          )}
          <Text style={styles.identityText} numberOfLines={1}>
            {profile?.display_name ?? 'Perfil'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: 1100,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    gap: 24,
  },
  logo: { fontSize: 20, fontWeight: '800', color: colors.accent, letterSpacing: 0.5 },
  links: { flexDirection: 'row', gap: 8, flex: 1 },
  linkButton: { paddingVertical: 6, paddingHorizontal: 10 },
  linkText: { color: colors.textMuted, fontWeight: '600', fontSize: 14 },
  linkTextActive: { color: colors.accent },
  linkUnderline: { height: 2, backgroundColor: colors.accent, borderRadius: 1, marginTop: 4 },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 8, maxWidth: 160 },
  avatar: { width: 28, height: 28, borderRadius: 14 },
  avatarPlaceholder: { backgroundColor: colors.placeholder },
  identityText: { color: colors.text, fontWeight: '600', fontSize: 13 },
});
