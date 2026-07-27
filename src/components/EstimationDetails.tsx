import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, formatPrice, radius, spacing } from '@/lib/theme';
import type { Estimation } from '@/lib/types';

function SellEaseDots({ value }: { value: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 4 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <View
          key={i}
          style={[
            styles.dot,
            { backgroundColor: i <= value ? colors.accent : colors.surface2 },
          ]}
        />
      ))}
    </View>
  );
}

function IndicatorRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.indicatorRow}>
      <Text style={styles.indicatorLabel}>{label}</Text>
      {children}
    </View>
  );
}

function badgeColor(value: string): string {
  if (['Forte', 'Faible concurrence', 'Haute'].includes(value)) return colors.accent;
  if (['Moyenne'].includes(value)) return colors.warning;
  return colors.danger;
}

/**
 * Bloc complet d'affichage d'une estimation IA :
 * prix, indicateurs de marché, conseil de vente et description d'annonce.
 * Utilisé sur l'écran Scanner (résultat) et sur l'écran Détail.
 */
export function EstimationDetails({ estimation }: { estimation: Estimation }) {
  const [copied, setCopied] = useState(false);
  const range = Math.max(estimation.price_max - estimation.price_min, 1);
  const position = Math.min(
    Math.max((estimation.price_suggested - estimation.price_min) / range, 0),
    1,
  );

  const copyDescription = async () => {
    await Clipboard.setStringAsync(`${estimation.title}\n\n${estimation.description}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <View style={{ gap: spacing.md }}>
      {/* --- Prix --- */}
      <View style={styles.priceCard}>
        <Text style={styles.priceLabel}>Prix de revente conseillé</Text>
        <Text style={styles.priceValue}>{formatPrice(estimation.price_suggested)}</Text>
        <View style={styles.rangeBar}>
          <View style={[styles.rangeFill, { width: `${Math.round(position * 100)}%` }]} />
          <View style={[styles.rangeDot, { left: `${Math.round(position * 100)}%` }]} />
        </View>
        <View style={styles.rangeLabels}>
          <View>
            <Text style={styles.rangeValue}>{formatPrice(estimation.price_min)}</Text>
            <Text style={styles.rangeHint}>vente rapide</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.rangeValue}>{formatPrice(estimation.price_max)}</Text>
            <Text style={styles.rangeHint}>vente patiente</Text>
          </View>
        </View>
      </View>

      {/* --- Indicateurs marché --- */}
      <View style={styles.card}>
        <IndicatorRow label="Facilité de vente">
          <SellEaseDots value={estimation.sell_ease} />
        </IndicatorRow>
        <View style={styles.separator} />
        <IndicatorRow label="Demande">
          <Text style={[styles.indicatorValue, { color: badgeColor(estimation.demand) }]}>
            {estimation.demand}
          </Text>
        </IndicatorRow>
        <View style={styles.separator} />
        <IndicatorRow label="Concurrence">
          <Text
            style={[
              styles.indicatorValue,
              { color: estimation.competition === 'Faible' ? colors.accent : badgeColor(estimation.competition) },
            ]}>
            {estimation.competition}
          </Text>
        </IndicatorRow>
        <View style={styles.separator} />
        <IndicatorRow label="État estimé">
          <Text style={styles.indicatorValue}>{estimation.condition}</Text>
        </IndicatorRow>
        <View style={styles.separator} />
        <IndicatorRow label="Fiabilité de l'estimation">
          <Text style={[styles.indicatorValue, { color: badgeColor(estimation.confidence) }]}>
            {estimation.confidence}
          </Text>
        </IndicatorRow>
      </View>

      {/* --- Conseil --- */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="bulb-outline" size={16} color={colors.warning} />
          <Text style={styles.cardTitle}>Conseil de vente</Text>
        </View>
        <Text style={styles.cardBody}>{estimation.advice}</Text>
      </View>

      {/* --- Description d'annonce --- */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="document-text-outline" size={16} color={colors.accent} />
          <Text style={styles.cardTitle}>Annonce prête à publier</Text>
          <Pressable onPress={copyDescription} style={styles.copyButton}>
            <Ionicons
              name={copied ? 'checkmark' : 'copy-outline'}
              size={14}
              color={copied ? colors.accent : colors.muted}
            />
            <Text style={[styles.copyLabel, copied && { color: colors.accent }]}>
              {copied ? 'Copié' : 'Copier'}
            </Text>
          </Pressable>
        </View>
        <Text style={styles.cardBody}>{estimation.description}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  priceCard: {
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  priceLabel: { color: colors.accent, fontSize: 13, fontWeight: '700', textAlign: 'center' },
  priceValue: {
    color: colors.text,
    fontSize: 44,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -1,
  },
  rangeBar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.surface2,
    marginTop: spacing.sm,
  },
  rangeFill: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent,
    opacity: 0.5,
  },
  rangeDot: {
    position: 'absolute',
    top: -4,
    width: 14,
    height: 14,
    marginLeft: -7,
    borderRadius: 7,
    backgroundColor: colors.accent,
  },
  rangeLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  rangeValue: { color: colors.text, fontSize: 14, fontWeight: '700' },
  rangeHint: { color: colors.muted, fontSize: 11 },

  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.sm,
  },
  cardTitle: { color: colors.text, fontSize: 14, fontWeight: '700', flex: 1 },
  cardBody: { color: colors.muted, fontSize: 14, lineHeight: 21 },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
    backgroundColor: colors.surface2,
  },
  copyLabel: { color: colors.muted, fontSize: 12, fontWeight: '600' },

  indicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  indicatorLabel: { color: colors.muted, fontSize: 14 },
  indicatorValue: { color: colors.text, fontSize: 14, fontWeight: '700' },
  separator: { height: 1, backgroundColor: colors.border },
  dot: { width: 10, height: 10, borderRadius: 5 },
});
