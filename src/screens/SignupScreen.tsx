import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types';
import { signUp } from '../services/authService';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'Signup'>;

export default function SignupScreen({ navigation }: Props) {
  const [inviteCode, setInviteCode] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState(false);

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      const result = await signUp({
        email: email.trim(),
        password,
        username: username.trim(),
        displayName: displayName.trim(),
        inviteCode,
      });
      if (result.requiresEmailConfirmation) {
        setConfirmationSent(true);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível criar a conta.');
    } finally {
      setSubmitting(false);
    }
  }

  if (confirmationSent) {
    return (
      <View style={styles.confirmContainer}>
        <Text style={styles.title}>Quase lá!</Text>
        <Text style={styles.subtitle}>
          Enviamos um link de confirmação para {email.trim()}. Clique nele e depois volte aqui para
          entrar.
        </Text>
        <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('Login')}>
          <Text style={styles.buttonText}>Ir para o login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Criar conta</Text>
        <Text style={styles.subtitle}>Rede privada — só entra quem tem convite.</Text>
        <TextInput
          style={styles.input}
          placeholder="Código de convite"
          autoCapitalize="none"
          value={inviteCode}
          onChangeText={setInviteCode}
        />
        <TextInput
          style={styles.input}
          placeholder="Nome de usuário"
          autoCapitalize="none"
          value={username}
          onChangeText={setUsername}
        />
        <TextInput
          style={styles.input}
          placeholder="Nome de exibição"
          value={displayName}
          onChangeText={setDisplayName}
        />
        <TextInput
          style={styles.input}
          placeholder="E-mail"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Senha"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={submitting}>
          <Text style={styles.buttonText}>{submitting ? 'Criando...' : 'Criar conta'}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text style={styles.link}>Já tenho conta</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.shell },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  confirmContainer: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: colors.shell },
  title: { fontSize: 28, fontWeight: '700', textAlign: 'center', color: colors.text },
  subtitle: { textAlign: 'center', color: colors.textMuted, marginTop: 4, marginBottom: 24 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    fontSize: 16,
    backgroundColor: colors.card,
    color: colors.text,
  },
  button: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: { color: colors.onAccent, fontSize: 16, fontWeight: '600' },
  link: { textAlign: 'center', marginTop: 16, color: colors.accent },
  error: { color: colors.danger, marginBottom: 8, textAlign: 'center' },
});
