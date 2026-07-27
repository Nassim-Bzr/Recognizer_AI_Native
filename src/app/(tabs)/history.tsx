import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScanCard } from '@/components/ScanCard';
import { Chip, EmptyState } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { colors, formatPrice, radius, spacing } from '@/lib/theme';
import { CATEGORIES, type Scan } from '@/lib/types';

export default function HistoryScreen() {
  const [scans, setScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  const fetchScans = useCallback(async () => {
    setErrorMessage(null);
    const { data, error } = await supabase
      .from('scans')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      setErrorMessage('Impossible de charger ton historique. Tire vers le bas pour réessayer.');
    } else {
      setScans((data as Scan[]) ?? []);
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchScans();
    }, [fetchScans]),
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return scans.filter((scan) => {
      if (favoritesOnly && !scan.is_favorite) return false;
      if (category && scan.category !== category) return false;
      if (
        query &&
        !`${scan.title} ${scan.brand} ${scan.model}`.toLowerCase().includes(query)
      )
        return false;
      return true;
    });
  }, [scans, search, category, favoritesOnly]);

  const totalValue = useMemo(
    () => scans.reduce((sum, scan) => sum + (scan.price_suggested ?? 0), 0),
    [scans],
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* --- En-tête + stats --- */}
      <View style={styles.header}>
        <View>
          <Text style={styles.appName}>Estimo</Text>
          <Text style={styles.headerSubtitle}>
            {scans.length} objet{scans.length > 1 ? 's' : ''} scanné{scans.length > 1 ? 's' : ''}
          </Text>
        </View>
        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>Valeur estimée</Text>
          <Text style={styles.totalValue}>{formatPrice(totalValue)}</Text>
        </View>
      </View>

      {/* --- Recherche --- */}
      <View style={styles.searchRow}>
        <Ionicons name="search" size={18} color={colors.muted} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Rechercher un objet, une marque…"
          placeholderTextColor={colors.muted}
          style={styles.searchInput}
        />
      </View>

      {/* --- Filtres catégories --- */}
      <View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}>
          <Chip label="Tout" active={!category && !favoritesOnly} onPress={() => { setCategory(null); setFavoritesOnly(false); }} />
          <Chip label="♥ Favoris" active={favoritesOnly} onPress={() => setFavoritesOnly((v) => !v)} />
          {CATEGORIES.map((cat) => (
            <Chip
              key={cat}
              label={cat}
              active={category === cat}
              onPress={() => setCategory(category === cat ? null : cat)}
            />
          ))}
        </ScrollView>
      </View>

      {/* --- Liste --- */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} size="large" />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchScans();
              }}
              tintColor={colors.accent}
            />
          }
          ListEmptyComponent={
            errorMessage ? (
              <EmptyState emoji="😕" title="Oups" subtitle={errorMessage} />
            ) : scans.length === 0 ? (
              <EmptyState
                emoji="📸"
                title="Aucun scan pour l'instant"
                subtitle="Va dans l'onglet Scanner, prends un objet en photo et découvre combien tu peux le revendre."
              />
            ) : (
              <EmptyState
                emoji="🔍"
                title="Aucun résultat"
                subtitle="Aucun objet ne correspond à ta recherche ou à tes filtres."
              />
            )
          }
          renderItem={({ item }) => (
            <ScanCard scan={item} onPress={() => router.push(`/scan/${item.id}`)} />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  appName: { color: colors.text, fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  headerSubtitle: { color: colors.muted, fontSize: 13, marginTop: 2 },
  totalCard: {
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: 'flex-end',
  },
  totalLabel: { color: colors.accent, fontSize: 11, fontWeight: '700' },
  totalValue: { color: colors.text, fontSize: 18, fontWeight: '800' },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
  },
  searchInput: { flex: 1, paddingVertical: 12, color: colors.text, fontSize: 15 },
  filters: {
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  list: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
