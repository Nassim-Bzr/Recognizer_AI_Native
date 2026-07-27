import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, SectionTitle } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { colors, formatPrice, radius, spacing } from '@/lib/theme';
import type { Scan } from '@/lib/types';

const AI_MOCK = process.env.EXPO_PUBLIC_AI_MOCK === '1';

export default function ProfileScreen() {
  const { session } = useAuth();
  const [scans, setScans] = useState<Scan[]>([]);

  useFocusEffect(
    useCallback(() => {
      supabase
        .from('scans')
        .select('*')
        .then(({ data }) => setScans((data as Scan[]) ?? []));
    }, []),
  );

  const stats = useMemo(() => {
    const sold = scans.filter((s) => s.status === 'sold');
    const byCategory = new Map<string, number>();
    for (const s of scans) {
      byCategory.set(s.category, (byCategory.get(s.category) ?? 0) + 1);
    }
    const topCategory =
      [...byCategory.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';
    return {
      count: scans.length,
      totalValue: scans.reduce((sum, s) => sum + (s.price_suggested ?? 0), 0),
      soldCount: sold.length,
      soldValue: sold.reduce((sum, s) => sum + (s.sold_price ?? 0), 0),
      favorites: scans.filter((s) => s.is_favorite).length,
      topCategory,
    };
  }, [scans]);

  const email = session?.user.email ?? '';
  const initial = email.charAt(0).toUpperCase() || '?';

  const signOut = () => {
    Alert.alert('Déconnexion', 'Tu veux vraiment te déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Me déconnecter',
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* --- Identité --- */}
        <View style={styles.identity}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <Text style={styles.email}>{email}</Text>
          {AI_MOCK ? (
            <View style={styles.mockBadge}>
              <Ionicons name="flask-outline" size={12} color={colors.warning} />
              <Text style={styles.mockText}>Mode démo IA (estimation simulée)</Text>
            </View>
          ) : null}
        </View>

        {/* --- Statistiques --- */}
        <SectionTitle>Mes statistiques</SectionTitle>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.count}</Text>
            <Text style={styles.statLabel}>Objets scannés</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: colors.accent }]}>
              {formatPrice(stats.totalValue)}
            </Text>
            <Text style={styles.statLabel}>Valeur estimée</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {stats.soldCount > 0 ? formatPrice(stats.soldValue) : '—'}
            </Text>
            <Text style={styles.statLabel}>
              {stats.soldCount > 0 ? `Vendu (${stats.soldCount})` : 'Rien de vendu'}
            </Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.topCategory}</Text>
            <Text style={styles.statLabel}>Catégorie favorite</Text>
          </View>
        </View>

        {/* --- À propos --- */}
        <SectionTitle>À propos</SectionTitle>
        <View style={styles.aboutCard}>
          <Text style={styles.aboutText}>
            Estimo estime le prix de revente de tes objets grâce à un modèle d'IA de
            vision (MiMo V2.5 via OpenCode Zen). Les prix sont des estimations du marché
            de l'occasion en France — à toi de fixer le prix final. 😉
          </Text>
        </View>

        <Button label="Me déconnecter" variant="danger" onPress={signOut} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, paddingBottom: spacing.xl, gap: spacing.md },
  identity: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.lg },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.accentSoft,
    borderWidth: 2,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.accent, fontSize: 30, fontWeight: '800' },
  email: { color: colors.text, fontSize: 16, fontWeight: '600' },
  mockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.warningSoft,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  mockText: { color: colors.warning, fontSize: 12, fontWeight: '600' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  statCard: {
    flexBasis: '48%',
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: 4,
  },
  statValue: { color: colors.text, fontSize: 20, fontWeight: '800' },
  statLabel: { color: colors.muted, fontSize: 12 },
  aboutCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  aboutText: { color: colors.muted, fontSize: 14, lineHeight: 21 },
});
