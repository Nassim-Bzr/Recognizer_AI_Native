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
import { colors, radius, spacing } from '@/lib/theme';

function frenchAuthError(message: string): string {
  if (message.includes('already registered')) return 'Un compte existe déjà avec cet email.';
  if (message.includes('at least 6 characters'))
    return 'Le mot de passe doit contenir au moins 6 caractères.';
  if (message.includes('invalid format') || message.includes('is invalid'))
    return "Cet email n'est pas valide.";
  return `Inscription impossible : ${message}`;
}

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const signUp = async () => {
    if (!email.trim() || !password) {
      setError('Renseigne ton email et ton mot de passe.');
      return;
    }
    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }
    if (password !== confirm) {
      setError('Les deux mots de passe ne correspondent pas.');
      return;
    }
    setError(null);
    setLoading(true);
    const { data, error: authError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });
    setLoading(false);
    if (authError) {
      setError(frenchAuthError(authError.message));
      return;
    }
    if (data.session) {
      // Confirmation email désactivée côté Supabase : connecté directement
      router.replace('/(tabs)/history');
    } else {
      setEmailSent(true);
    }
  };

  if (emailSent) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={[styles.content, { justifyContent: 'center' }]}>
          <View style={styles.confirmCard}>
            <Text style={{ fontSize: 48, textAlign: 'center' }}>📬</Text>
            <Text style={styles.confirmTitle}>Vérifie ta boîte mail</Text>
            <Text style={styles.confirmText}>
              Un lien de confirmation a été envoyé à {email.trim()}. Clique dessus puis
              reviens te connecter.
            </Text>
            <Button label="Retour à la connexion" onPress={() => router.replace('/(auth)/login')} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.title}>Créer un compte</Text>
            <Text style={styles.subtitle}>
              Ton historique de scans sera sauvegardé et accessible partout.
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
              placeholder="6 caractères minimum"
              secureTextEntry
            />
            <Input
              label="Confirme le mot de passe"
              value={confirm}
              onChangeText={setConfirm}
              placeholder="••••••••"
              secureTextEntry
              error={error}
              onSubmitEditing={signUp}
            />
            <Button label="Créer mon compte" onPress={signUp} loading={loading} />
          </View>

          <View style={styles.footer}>
            <Text style={{ color: colors.muted }}>Déjà un compte ?</Text>
            <Link href="/(auth)/login" style={styles.link}>
              Se connecter
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
  title: { color: colors.text, fontSize: 28, fontWeight: '800' },
  subtitle: {
    color: colors.muted,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 300,
  },
  form: { gap: spacing.md },
  footer: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  link: { color: colors.accent, fontWeight: '700' },
  confirmCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  confirmTitle: { color: colors.text, fontSize: 20, fontWeight: '800', textAlign: 'center' },
  confirmText: { color: colors.muted, fontSize: 14, textAlign: 'center', lineHeight: 21 },
});
