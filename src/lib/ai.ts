import { supabase } from './supabase';
import type { Estimation } from './types';

const MOCK_ENABLED = process.env.EXPO_PUBLIC_AI_MOCK === '1';

const MOCK_ESTIMATION: Estimation = {
  title: 'AirPods Pro (2ᵉ génération) - Apple',
  brand: 'Apple',
  model: 'AirPods Pro 2 (USB-C)',
  category: 'Tech',
  condition: 'Très bon état',
  price_min: 110,
  price_max: 160,
  price_suggested: 135,
  sell_ease: 5,
  demand: 'Forte',
  competition: 'Saturée',
  advice:
    "Vends sur Leboncoin ou Back Market. Affiche 145 € pour laisser une marge de négociation, et précise que le boîtier est inclus : ça part en général en moins d'une semaine.",
  description:
    "AirPods Pro 2ᵉ génération en très bon état, très peu servis. Boîtier de charge USB-C inclus, embouts d'origine. Son et réduction de bruit impeccables. Remise en main propre ou envoi possible.",
  confidence: 'Haute',
};

/**
 * Envoie la photo (base64) à l'Edge Function `estimate` qui interroge
 * un modèle de vision (MiMo V2.5 via OpenCode Zen) et renvoie une
 * estimation structurée.
 *
 * Si EXPO_PUBLIC_AI_MOCK=1, renvoie une estimation simulée après un délai
 * (pratique pour développer l'UI sans consommer de crédits API).
 */
export async function estimateObject(
  imageBase64: string,
  mediaType: string = 'image/jpeg',
): Promise<Estimation> {
  if (MOCK_ENABLED) {
    await new Promise((resolve) => setTimeout(resolve, 2500));
    return MOCK_ESTIMATION;
  }

  const { data, error } = await supabase.functions.invoke('estimate', {
    body: { image: imageBase64, media_type: mediaType },
  });

  if (error) {
    throw new Error(
      "L'estimation a échoué. Vérifie ta connexion et réessaie dans un instant.",
    );
  }
  if (data?.error) {
    throw new Error(String(data.error));
  }

  return data as Estimation;
}
