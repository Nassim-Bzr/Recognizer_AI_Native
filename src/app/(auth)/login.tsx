import { Link, router } from 'expo-router';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Input } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { colors, spacing } from '@/lib/theme';

function frenchAuthError(message: string): string {
  if (message.includes('Invalid login credentials')) return 'Email ou mot de passe incorrect.';
  if (message.includes('Email not confirmed'))
    return 'Email non confirmé. Vérifie ta boîte mail (ou désactive la confirmation dans Supabase).';
  if (message.includes('network') || message.includes('fetch'))
    return 'Impossible de joindre le serveur. Vérifie ta connexion.';
  return `Connexion impossible : ${message}`;
}

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const signIn = async () => {
    if (!email.trim() || !password) {
      setError('Renseigne ton email et ton mot de passe.');
      return;
    }
    setError(null);
    setLoading(true);
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);
    if (authError) {
      setError(frenchAuthError(authError.message));
      return;
    }
    router.replace('/(tabs)/history');
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.logo}>📸</Text>
            <Text style={styles.title}>Estimo</Text>
            <Text style={styles.subtitle}>
              Prends un objet en photo, l'IA te dit combien le revendre.
            </Text>
          </View>

          <View style={styles.form}>
            <Input
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="toi@exemple.com"
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
            />
            <Input
              label="Mot de passe"
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              secureTextEntry
              error={error}
              onSubmitEditing={signIn}
            />
            <Button label="Se connecter" onPress={signIn} loading={loading} />
          </View>

          <View style={styles.footer}>
            <Text style={{ color: colors.muted }}>Pas encore de compte ?</Text>
            <Link href="/(auth)/register" style={styles.link}>
              Créer un compte
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { flexGrow: 1, justifyContent: 'center', padding: spacing.lg, gap: spacing.xl },
  header: { alignItems: 'center', gap: spacing.sm },
  logo: { fontSize: 56 },
  title: { color: colors.text, fontSize: 34, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: {
    color: colors.muted,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
  },
  form: { gap: spacing.md },
  footer: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  link: { color: colors.accent, fontWeight: '700' },
});
