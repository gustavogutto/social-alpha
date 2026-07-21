import { supabase } from './supabase';
import type { Profile } from '../types';

export async function validateInviteCode(code: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('validate_invite_code', { p_code: code.trim() });
  if (error) throw error;
  return Boolean(data);
}

// Returns true if a confirmation e-mail was sent (no session yet -- the user must
// click the link and then log in). Returns false if signup logged the user in immediately.
export async function signUp(params: {
  email: string;
  password: string;
  username: string;
  displayName: string;
  inviteCode: string;
}): Promise<{ requiresEmailConfirmation: boolean }> {
  const { email, password, username, displayName, inviteCode } = params;

  // Client-side pre-check purely for a nicer error message -- the real enforcement
  // is the `on_auth_user_created` trigger on auth.users (see migrations/003), which
  // rejects account creation at the database level even if this check is bypassed.
  const isValid = await validateInviteCode(inviteCode);
  if (!isValid) {
    throw new Error('Código de convite inválido ou já usado.');
  }

  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        invite_code: inviteCode.trim(),
        username,
        display_name: displayName,
      },
    },
  });
  if (signUpError) {
    if (signUpError.message.toLowerCase().includes('database error')) {
      throw new Error('O código de convite foi usado por outra pessoa nesse instante. Peça um novo código.');
    }
    throw signUpError;
  }

  return { requiresEmailConfirmation: !signUpData.session };
}

export async function signIn(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (error) throw error;
  return data;
}
