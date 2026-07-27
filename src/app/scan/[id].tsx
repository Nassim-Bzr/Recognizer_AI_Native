import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EstimationDetails } from '@/components/EstimationDetails';
import { EmptyState, SectionTitle } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { colors, formatDate, radius, spacing } from '@/lib/theme';
import { STATUS_LABELS, type Scan, type ScanStatus } from '@/lib/types';

export default function ScanDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [scan, setScan] = useState<Scan | null>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState('');
  const [soldPrice, setSoldPrice] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);

  useEffect(() => {
    if (!id) return;
    supabase
      .from('scans')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data }) => {
        const loaded = (data as Scan) ?? null;
        setScan(loaded);
        setNotes(loaded?.notes ?? '');
        setSoldPrice(loaded?.sold_price != null ? String(loaded.sold_price) : '');
        setLoading(false);
      });
  }, [id]);

  // ----- CRUD : Update -----

  const updateScan = async (patch: Partial<Scan>) => {
    if (!scan) return;
    setScan({ ...scan, ...patch });
    const { error } = await supabase.from('scans').update(patch).eq('id', scan.id);
    if (error) {
      Alert.alert('Erreur', 'La modification n’a pas pu être enregistrée.');
    }
  };

  const toggleFavorite = () => updateScan({ is_favorite: !scan?.is_favorite });

  const changeStatus = (status: ScanStatus) => {
    const patch: Partial<Scan> = { status };
    if (status !== 'sold') {
      patch.sold_price = null;
      setSoldPrice('');
    }
    updateScan(patch);
  };

  const saveSoldPrice = () => {
    const value = Number(soldPrice.replace(',', '.'));
    if (Number.isNaN(value) || value < 0) {
      Alert.alert('Prix invalide', 'Entre un montant en euros, par exemple 45.');
      return;
    }
    updateScan({ sold_price: value });
  };

  const saveNotes = async () => {
    setSavingNotes(true);
    await updateScan({ notes: notes.trim() || null });
    setSavingNotes(false);
    setNotesSaved(true);
    setTimeout(() => setNotesSaved(false), 2000);
  };

  // ----- CRUD : Delete -----

  const removeScan = () => {
    Alert.alert('Supprimer ce scan ?', 'Cette action est définitive.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          if (!scan) return;
          const { error } = await supabase.from('scans').delete().eq('id', scan.id);
          if (error) {
            Alert.alert('Erreur', 'La suppression a échoué. Réessaie.');
            return;
          }
          router.back();
        },
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (!scan) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.headerButton}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </Pressable>
        </View>
        <EmptyState
          emoji="🤔"
          title="Scan introuvable"
          subtitle="Cet objet a peut-être été supprimé."
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* --- En-tête --- */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.headerButton}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </Pressable>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {scan.title}
          </Text>
          <Pressable onPress={toggleFavorite} style={styles.headerButton}>
            <Ionicons
              name={scan.is_favorite ? 'heart' : 'heart-outline'}
              size={20}
              color={scan.is_favorite ? colors.danger : colors.text}
            />
          </Pressable>
          <Pressable onPress={removeScan} style={styles.headerButton}>
            <Ionicons name="trash-outline" size={19} color={colors.danger} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* --- Photo + identité --- */}
          {scan.image_url ? (
            <Image source={{ uri: scan.image_url }} style={styles.photo} contentFit="cover" />
          ) : null}
          <View style={{ gap: 2 }}>
            <Text style={styles.title}>{scan.title}</Text>
            <Text style={styles.subtitle}>
              {scan.brand} · {scan.model}
            </Text>
            <Text style={styles.meta}>
              {scan.category} · scanné le {formatDate(scan.created_at)}
            </Text>
          </View>

          {/* --- Statut --- */}
          <SectionTitle>Statut</SectionTitle>
          <View style={styles.statusRow}>
            {(Object.keys(STATUS_LABELS) as ScanStatus[]).map((status) => (
              <Pressable
                key={status}
                onPress={() => changeStatus(status)}
                style={[styles.statusOption, scan.status === status && styles.statusOptionActive]}>
                <Text
                  style={[
                    styles.statusOptionLabel,
                    scan.status === status && { color: colors.accent },
                  ]}>
                  {STATUS_LABELS[status]}
                </Text>
              </Pressable>
            ))}
          </View>

          {scan.status === 'sold' && (
            <View style={styles.soldRow}>
              <TextInput
                value={soldPrice}
                onChangeText={setSoldPrice}
                placeholder="Prix de vente réel (€)"
                placeholderTextColor={colors.muted}
                keyboardType="numeric"
                style={styles.soldInput}
              />
              <Pressable onPress={saveSoldPrice} style={styles.soldButton}>
                <Ionicons name="checkmark" size={20} color="#06281C" />
              </Pressable>
            </View>
          )}

          {/* --- Estimation IA --- */}
          <SectionTitle>Estimation IA</SectionTitle>
          <EstimationDetails estimation={scan} />

          {/* --- Notes --- */}
          <SectionTitle>Mes notes</SectionTitle>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Ex : vendu avec la boîte d'origine, léger accroc à l'arrière…"
            placeholderTextColor={colors.muted}
            multiline
            style={styles.notesInput}
          />
          <Pressable onPress={saveNotes} style={styles.notesButton} disabled={savingNotes}>
            {savingNotes ? (
              <ActivityIndicator color={colors.accent} size="small" />
            ) : (
              <Text style={styles.notesButtonLabel}>
                {notesSaved ? '✓ Notes enregistrées' : 'Enregistrer les notes'}
              </Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  headerTitle: { flex: 1, color: colors.text, fontSize: 16, fontWeight: '700' },
  content: { padding: spacing.md, paddingBottom: spacing.xl * 2, gap: spacing.md },
  photo: { width: '100%', aspectRatio: 4 / 3, borderRadius: radius.lg, backgroundColor: colors.surface },
  title: { color: colors.text, fontSize: 22, fontWeight: '800' },
  subtitle: { color: colors.muted, fontSize: 14 },
  meta: { color: colors.muted, fontSize: 12, marginTop: 2 },

  statusRow: { flexDirection: 'row', gap: spacing.sm },
  statusOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusOptionActive: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  statusOptionLabel: { color: colors.muted, fontSize: 13, fontWeight: '700' },

  soldRow: { flexDirection: 'row', gap: spacing.sm },
  soldInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 15,
  },
  soldButton: {
    width: 48,
    borderRadius: radius.md,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },

  notesInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    color: colors.text,
    fontSize: 14,
    minHeight: 90,
    textAlignVertical: 'top',
  },
  notesButton: {
    alignSelf: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  notesButtonLabel: { color: colors.accent, fontSize: 14, fontWeight: '700' },
});
