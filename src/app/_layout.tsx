import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthProvider } from '@/lib/auth';
import { isSupabaseConfigured } from '@/lib/supabase';
import { colors, radius, spacing } from '@/lib/theme';

/** Écran affiché tant que le fichier .env n'est pas configuré */
function SetupScreen() {
  return (
    <SafeAreaView style={styles.setupContainer}>
      <ScrollView contentContainerStyle={styles.setupContent}>
        <Text style={{ fontSize: 48 }}>⚙️</Text>
        <Text style={styles.setupTitle}>Configuration requise</Text>
        <Text style={styles.setupText}>
          Estimo a besoin d'un projet Supabase pour démarrer.
        </Text>
        <View style={styles.setupCard}>
          <Text style={styles.setupStep}>1. Crée un projet sur supabase.com</Text>
          <Text style={styles.setupStep}>2. Exécute supabase/schema.sql dans le SQL Editor</Text>
          <Text style={styles.setupStep}>3. Copie .env.example en .env et remplis :</Text>
          <Text style={styles.setupCode}>
            EXPO_PUBLIC_SUPABASE_URL{'\n'}EXPO_PUBLIC_SUPABASE_ANON_KEY
          </Text>
          <Text style={styles.setupStep}>4. Relance : npx expo start --clear</Text>
        </View>
        <Text style={[styles.setupText, { fontSize: 13 }]}>
          Détails complets dans le README du projet.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

export default function RootLayout() {
  if (!isSupabaseConfigured) {
    return (
      <>
        <StatusBar style="light" />
        <SetupScreen />
      </>
    );
  }

  return (
    <AuthProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
        }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="scan/[id]" />
      </Stack>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  setupContainer: { flex: 1, backgroundColor: colors.bg },
  setupContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  setupTitle: { color: colors.text, fontSize: 24, fontWeight: '800' },
  setupText: { color: colors.muted, fontSize: 15, textAlign: 'center', lineHeight: 22 },
  setupCard: {
    alignSelf: 'stretch',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  setupStep: { color: colors.text, fontSize: 14, lineHeight: 20 },
  setupCode: {
    color: colors.accent,
    fontSize: 13,
    fontFamily: 'monospace',
    backgroundColor: colors.bg,
    borderRadius: radius.sm,
    padding: spacing.sm,
  },
});
