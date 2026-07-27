import { Ionicons } from '@expo/vector-icons';
import { decode } from 'base64-arraybuffer';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EstimationDetails } from '@/components/EstimationDetails';
import { Button } from '@/components/ui';
import { estimateObject } from '@/lib/ai';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { colors, radius, spacing } from '@/lib/theme';
import type { Estimation } from '@/lib/types';

type Step = 'idle' | 'preview' | 'analyzing' | 'result';

interface PickedImage {
  uri: string;
  base64: string;
  mediaType: string;
}

const ANALYZING_MESSAGES = [
  "Identification de l'objet…",
  'Détection de la marque et du modèle…',
  'Analyse du marché de l’occasion…',
  'Comparaison avec les annonces similaires…',
  'Calcul de la fourchette de prix…',
];

const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  quality: 0.5,
  base64: true,
};

export default function ScanScreen() {
  const { session } = useAuth();
  const [step, setStep] = useState<Step>('idle');
  const [image, setImage] = useState<PickedImage | null>(null);
  const [estimation, setEstimation] = useState<Estimation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [messageIndex, setMessageIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  // Fait défiler les messages pendant l'analyse
  useEffect(() => {
    if (step !== 'analyzing') return;
    setMessageIndex(0);
    const interval = setInterval(() => {
      setMessageIndex((i) => (i + 1) % ANALYZING_MESSAGES.length);
    }, 1800);
    return () => clearInterval(interval);
  }, [step]);

  const handlePicked = (result: ImagePicker.ImagePickerResult) => {
    if (result.canceled || !result.assets?.[0]?.base64) return;
    const asset = result.assets[0];
    setImage({
      uri: asset.uri,
      base64: asset.base64!,
      mediaType: asset.mimeType ?? 'image/jpeg',
    });
    setEstimation(null);
    setError(null);
    setStep('preview');
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Caméra indisponible',
        "Autorise l'accès à la caméra dans les réglages pour scanner un objet.",
      );
      return;
    }
    handlePicked(await ImagePicker.launchCameraAsync(PICKER_OPTIONS));
  };

  const pickFromGallery = async () => {
    handlePicked(await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS));
  };

  const analyze = async () => {
    if (!image) return;
    setStep('analyzing');
    setError(null);
    try {
      const result = await estimateObject(image.base64, image.mediaType);
      setEstimation(result);
      setStep('result');
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Une erreur est survenue pendant l’analyse.');
      setStep('preview');
    }
  };

  const save = async () => {
    if (!estimation || !image || !session) return;
    setSaving(true);
    try {
      // 1. Upload de la photo dans le bucket `scans` (dossier = id utilisateur)
      let imageUrl: string | null = null;
      const path = `${session.user.id}/${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('scans')
        .upload(path, decode(image.base64), { contentType: image.mediaType });
      if (!uploadError) {
        imageUrl = supabase.storage.from('scans').getPublicUrl(path).data.publicUrl;
      }

      // 2. Insertion du scan (CRUD : Create)
      const { data, error: insertError } = await supabase
        .from('scans')
        .insert({ ...estimation, image_url: imageUrl })
        .select('id')
        .single();
      if (insertError) throw insertError;

      reset();
      router.push(`/scan/${data.id}`);
    } catch {
      Alert.alert('Erreur', "Impossible d'enregistrer le scan. Réessaie dans un instant.");
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    setStep('idle');
    setImage(null);
    setEstimation(null);
    setError(null);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        {/* ---------- Étape 1 : choisir une photo ---------- */}
        {step === 'idle' && (
          <View style={styles.idleWrap}>
            <View style={styles.hero}>
              <Text style={{ fontSize: 56 }}>📸</Text>
              <Text style={styles.heroTitle}>Scanne un objet</Text>
              <Text style={styles.heroSubtitle}>
                Prends-le en photo : l'IA l'identifie, estime son prix de revente et analyse
                le marché de l'occasion.
              </Text>
            </View>

            <Pressable onPress={takePhoto} style={({ pressed }) => [styles.bigAction, pressed && { opacity: 0.8 }]}>
              <View style={styles.bigActionIcon}>
                <Ionicons name="camera" size={28} color="#06281C" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.bigActionTitle}>Prendre une photo</Text>
                <Text style={styles.bigActionSubtitle}>Cadre bien l'objet, en pleine lumière</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.muted} />
            </Pressable>

            <Pressable onPress={pickFromGallery} style={({ pressed }) => [styles.bigAction, pressed && { opacity: 0.8 }]}>
              <View style={[styles.bigActionIcon, { backgroundColor: colors.surface2 }]}>
                <Ionicons name="images" size={26} color={colors.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.bigActionTitle}>Choisir dans la galerie</Text>
                <Text style={styles.bigActionSubtitle}>Une photo déjà prise fait l'affaire</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.muted} />
            </Pressable>
          </View>
        )}

        {/* ---------- Étape 2 : aperçu + lancement ---------- */}
        {(step === 'preview' || step === 'analyzing') && image && (
          <View style={{ gap: spacing.md }}>
            <View style={styles.previewWrap}>
              <Image source={{ uri: image.uri }} style={styles.preview} contentFit="cover" />
              {step === 'analyzing' && (
                <View style={styles.analyzingOverlay}>
                  <ActivityIndicator size="large" color={colors.accent} />
                  <Text style={styles.analyzingText}>{ANALYZING_MESSAGES[messageIndex]}</Text>
                </View>
              )}
            </View>

            {error ? (
              <View style={styles.errorCard}>
                <Ionicons name="warning-outline" size={18} color={colors.danger} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {step === 'preview' && (
              <View style={{ gap: spacing.sm }}>
                <Button label="✨ Estimer le prix" onPress={analyze} />
                <Button label="Changer de photo" variant="secondary" onPress={reset} />
              </View>
            )}
          </View>
        )}

        {/* ---------- Étape 3 : résultat ---------- */}
        {step === 'result' && estimation && image && (
          <View style={{ gap: spacing.md }}>
            <View style={styles.resultHeader}>
              <Image source={{ uri: image.uri }} style={styles.resultThumb} contentFit="cover" />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.resultTitle}>{estimation.title}</Text>
                <Text style={styles.resultSubtitle}>
                  {estimation.brand} · {estimation.model}
                </Text>
                <Text style={styles.resultCategory}>{estimation.category}</Text>
              </View>
            </View>

            <EstimationDetails estimation={estimation} />

            <View style={{ gap: spacing.sm }}>
              <Button label="Enregistrer dans l'historique" onPress={save} loading={saving} />
              <Button label="Scanner un autre objet" variant="secondary" onPress={reset} />
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, paddingBottom: spacing.xl, flexGrow: 1 },

  idleWrap: { flex: 1, justifyContent: 'center', gap: spacing.md },
  hero: { alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg },
  heroTitle: { color: colors.text, fontSize: 26, fontWeight: '800' },
  heroSubtitle: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    maxWidth: 300,
  },
  bigAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  bigActionIcon: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bigActionTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  bigActionSubtitle: { color: colors.muted, fontSize: 13, marginTop: 2 },

  previewWrap: { borderRadius: radius.lg, overflow: 'hidden' },
  preview: { width: '100%', aspectRatio: 1, backgroundColor: colors.surface },
  analyzingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(11, 15, 20, 0.82)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.lg,
  },
  analyzingText: { color: colors.text, fontSize: 16, fontWeight: '600', textAlign: 'center' },

  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  errorText: { color: colors.danger, fontSize: 14, flex: 1, lineHeight: 20 },

  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  resultThumb: { width: 72, height: 72, borderRadius: radius.md },
  resultTitle: { color: colors.text, fontSize: 16, fontWeight: '800' },
  resultSubtitle: { color: colors.muted, fontSize: 13 },
  resultCategory: { color: colors.accent, fontSize: 12, fontWeight: '700', marginTop: 2 },
});
