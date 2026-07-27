import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, formatDate, formatPrice, radius, spacing } from '@/lib/theme';
import { STATUS_LABELS, type Scan } from '@/lib/types';

const STATUS_COLORS = {
  kept: colors.muted,
  selling: colors.warning,
  sold: colors.accent,
} as const;

export function ScanCard({ scan, onPress }: { scan: Scan; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.75 }]}>
      {scan.image_url ? (
        <Image source={{ uri: scan.image_url }} style={styles.thumb} contentFit="cover" />
      ) : (
        <View style={[styles.thumb, styles.thumbPlaceholder]}>
          <Ionicons name="cube-outline" size={24} color={colors.muted} />
        </View>
      )}

      <View style={{ flex: 1, gap: 3 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text numberOfLines={1} style={styles.title}>
            {scan.title}
          </Text>
          {scan.is_favorite ? <Ionicons name="heart" size={14} color={colors.danger} /> : null}
        </View>
        <Text numberOfLines={1} style={styles.subtitle}>
          {scan.category} · {formatDate(scan.created_at)}
        </Text>
        <View style={[styles.statusBadge, { borderColor: STATUS_COLORS[scan.status] }]}>
          <Text style={[styles.statusLabel, { color: STATUS_COLORS[scan.status] }]}>
            {scan.status === 'sold' && scan.sold_price != null
              ? `Vendu ${formatPrice(scan.sold_price)}`
              : STATUS_LABELS[scan.status]}
          </Text>
        </View>
      </View>

      <View style={{ alignItems: 'flex-end', gap: 2 }}>
        <Text style={styles.price}>{formatPrice(scan.price_suggested)}</Text>
        <Text style={styles.priceRange}>
          {formatPrice(scan.price_min)} – {formatPrice(scan.price_max)}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  thumb: { width: 64, height: 64, borderRadius: radius.md, backgroundColor: colors.surface2 },
  thumbPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  title: { color: colors.text, fontSize: 15, fontWeight: '700', flexShrink: 1 },
  subtitle: { color: colors.muted, fontSize: 12 },
  statusBadge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 2,
  },
  statusLabel: { fontSize: 11, fontWeight: '700' },
  price: { color: colors.accent, fontSize: 17, fontWeight: '800' },
  priceRange: { color: colors.muted, fontSize: 11 },
});
