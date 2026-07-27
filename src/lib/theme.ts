export const colors = {
  bg: '#0B0F14',
  surface: '#141B23',
  surface2: '#1C2530',
  border: '#26313E',
  accent: '#34D399',
  accentSoft: 'rgba(52, 211, 153, 0.12)',
  text: '#F1F5F9',
  muted: '#8CA0B3',
  danger: '#F87171',
  dangerSoft: 'rgba(248, 113, 113, 0.12)',
  warning: '#FBBF24',
  warningSoft: 'rgba(251, 191, 36, 0.12)',
};

export const radius = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export function formatPrice(value: number | null | undefined): string {
  if (value == null) return '—';
  return `${Math.round(value)} €`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
