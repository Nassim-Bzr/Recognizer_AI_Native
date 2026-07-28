export const CATEGORIES = [
  'Tech',
  'Électroménager',
  'Mobilier',
  'Vêtements',
  'Sport',
  'Jeux & jouets',
  'Livres & médias',
  'Autre',
] as const;

export type Category = (typeof CATEGORIES)[number];

export type ScanStatus = 'kept' | 'selling' | 'sold';

/** Indices facultatifs fournis par l'utilisateur pour fiabiliser l'identification. */
export interface EstimationHints {
  productReference?: string;
  conditionNotes?: string;
  accessories?: string;
}

export const STATUS_LABELS: Record<ScanStatus, string> = {
  kept: 'À garder',
  selling: 'À vendre',
  sold: 'Vendu',
};

/** Résultat renvoyé par l'IA (Edge Function `estimate`) */
export interface Estimation {
  title: string;
  brand: string;
  model: string;
  category: string;
  condition: string;
  price_min: number;
  price_max: number;
  price_suggested: number;
  sell_ease: number; // 1 à 5
  demand: 'Forte' | 'Moyenne' | 'Faible';
  competition: 'Faible' | 'Moyenne' | 'Saturée';
  advice: string;
  description: string;
  /** Variantes pré-générées pendant l'estimation, jamais persistées en base. */
  description_variants?: string[];
  confidence: 'Haute' | 'Moyenne' | 'Basse';
}

/** Ligne de la table `scans` */
export interface Scan extends Estimation {
  id: string;
  user_id: string;
  image_url: string | null;
  notes: string | null;
  status: ScanStatus;
  sold_price: number | null;
  is_favorite: boolean;
  created_at: string;
}
