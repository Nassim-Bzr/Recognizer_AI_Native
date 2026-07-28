import { supabase } from './supabase';
import type { Estimation, EstimationHints } from './types';

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
    "Bonjour,\n\nJe vends ces AirPods Pro 2e génération en très bon état, très peu utilisés.\n\nCaractéristiques :\n- Boîtier de charge USB-C inclus\n- Embouts d'origine fournis\n- Son et réduction de bruit impeccables\n\nRemise en main propre ou envoi possible. N'hésite pas à me contacter pour plus d'informations.",
  description_variants: [
    "Bonjour,\n\nJe vends ces AirPods Pro 2e génération en très bon état, très peu utilisés.\n\nCaractéristiques :\n- Boîtier de charge USB-C inclus\n- Embouts d'origine fournis\n- Son et réduction de bruit impeccables\n\nRemise en main propre ou envoi possible. N'hésite pas à me contacter pour plus d'informations.",
    "Bonjour,\n\nAirPods Pro 2 avec boîtier USB-C à vendre, en très bon état et parfaitement fonctionnels.\n\nPoints clés :\n- Réduction de bruit active\n- Boîtier et embouts d'origine\n- Très peu utilisés\n\nEnvoi possible ou remise en main propre.",
    "Je vends mes AirPods Pro 2 USB-C, propres et en excellent état de fonctionnement.\n\nInclus :\n- Les deux écouteurs\n- Le boîtier de charge\n- Les embouts d'origine\n\nDisponibles immédiatement. Contacte-moi si tu souhaites davantage de photos ou d'informations.",
  ],
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
  hints: EstimationHints = {},
): Promise<Estimation> {
  if (MOCK_ENABLED) {
    await new Promise((resolve) => setTimeout(resolve, 2500));
    return MOCK_ESTIMATION;
  }

  const { data, error } = await supabase.functions.invoke('estimate', {
    body: { image: imageBase64, media_type: mediaType, hints },
  });

  if (error) {
    const response = (error as { context?: Response }).context;
    if (response) {
      let serverMessage: string | undefined;
      try {
        const payload = (await response.clone().json()) as { error?: unknown };
        if (typeof payload.error === 'string' && payload.error.trim()) {
          serverMessage = payload.error;
        }
      } catch {
        // Le corps n'est pas toujours du JSON (timeout, coupure réseau, passerelle).
      }
      if (serverMessage) throw new Error(serverMessage);
    }
    throw new Error(
      "L'estimation a échoué. Vérifie ta connexion et réessaie dans un instant.",
    );
  }
  if (data?.error) {
    throw new Error(String(data.error));
  }

  return data as Estimation;
}
