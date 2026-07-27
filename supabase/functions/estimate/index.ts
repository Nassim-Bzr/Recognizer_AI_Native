// ============================================================
// Edge Function `estimate` — analyse une photo d'objet avec
// un modèle de vision via l'API OpenCode Zen (OpenAI-compatible)
// et renvoie une estimation structurée.
//
// Modèle par défaut : mimo-v2.5-free (gratuit sur OpenCode Zen)
//
// Déploiement :
//   supabase secrets set OPENCODE_API_KEY=sk-...
//   supabase functions deploy estimate
// ============================================================

const API_URL = Deno.env.get('AI_BASE_URL') ?? 'https://opencode.ai/zen/v1/chat/completions';
const API_KEY = Deno.env.get('OPENCODE_API_KEY') ?? '';
const MODEL = Deno.env.get('AI_MODEL') ?? 'mimo-v2.5-free';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const CATEGORIES = [
  'Tech',
  'Électroménager',
  'Mobilier',
  'Vêtements',
  'Sport',
  'Jeux & jouets',
  'Livres & médias',
  'Autre',
];
const CONDITIONS = ['Neuf', 'Très bon état', 'Bon état', 'État moyen', 'Pour pièces'];
const LEVELS = ['Forte', 'Moyenne', 'Faible'];
const COMPETITION = ['Faible', 'Moyenne', 'Saturée'];
const CONFIDENCE = ['Haute', 'Moyenne', 'Basse'];

const PROMPT = `Tu es un expert du marché français de la seconde main (Leboncoin, Vinted, eBay, Back Market, Facebook Marketplace).

Identifie l'objet sur la photo, puis estime sa valeur de revente d'occasion en France, en euros.

Règles :
- Base-toi sur l'état visible sur la photo (rayures, usure, emballage, accessoires présents).
- price_min = vente rapide en quelques jours ; price_max = vente patiente ; price_suggested = meilleur compromis.
- Si l'identification est incertaine, donne ta meilleure hypothèse et baisse "confidence".
- "advice" : concret et actionnable (où vendre, quel prix afficher, une astuce pour vendre plus vite).
- "description" : une annonce naturelle et honnête, prête à copier-coller.
- Tout en français.

Réponds UNIQUEMENT avec un objet JSON valide (aucun texte avant/après, pas de bloc markdown) au format exact :
{
  "title": "titre court d'annonce, ex: 'PlayStation 5 Standard - Sony'",
  "brand": "marque ou 'Inconnue'",
  "model": "modèle précis ou 'Inconnu'",
  "category": "une valeur parmi : ${CATEGORIES.join(' | ')}",
  "condition": "une valeur parmi : ${CONDITIONS.join(' | ')}",
  "price_min": nombre en euros,
  "price_max": nombre en euros,
  "price_suggested": nombre en euros,
  "sell_ease": entier de 1 (très dur à vendre) à 5 (part en quelques heures),
  "demand": "Forte | Moyenne | Faible",
  "competition": "Faible | Moyenne | Saturée",
  "advice": "conseil de vente en 1-2 phrases",
  "description": "annonce prête à publier, 3-4 phrases",
  "confidence": "Haute | Moyenne | Basse"
}`;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/** Extrait le premier objet JSON d'une réponse texte (tolère les ```fences``` et le texte autour) */
function extractJson(text: string): Record<string, unknown> {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end <= start) {
    throw new Error(`Pas de JSON dans la réponse du modèle : ${text.slice(0, 200)}`);
  }
  return JSON.parse(text.slice(start, end + 1));
}

const str = (v: unknown, fallback: string) =>
  typeof v === 'string' && v.trim() ? v.trim() : fallback;
const num = (v: unknown, fallback: number) => {
  const n = typeof v === 'string' ? Number(v.replace(',', '.').replace(/[^\d.-]/g, '')) : Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : fallback;
};
const oneOf = (v: unknown, allowed: string[], fallback: string) =>
  typeof v === 'string' && allowed.includes(v.trim()) ? v.trim() : fallback;

/** Normalise la réponse du modèle vers le format attendu par l'app (jamais de champ manquant) */
function normalize(raw: Record<string, unknown>) {
  const priceMin = num(raw.price_min, 0);
  const priceMax = Math.max(num(raw.price_max, priceMin), priceMin);
  const suggested = Math.min(Math.max(num(raw.price_suggested, priceMin), priceMin), priceMax);
  const ease = Math.min(Math.max(Math.round(num(raw.sell_ease, 3)), 1), 5);

  return {
    title: str(raw.title, 'Objet non identifié'),
    brand: str(raw.brand, 'Inconnue'),
    model: str(raw.model, 'Inconnu'),
    category: oneOf(raw.category, CATEGORIES, 'Autre'),
    condition: oneOf(raw.condition, CONDITIONS, 'Bon état'),
    price_min: priceMin,
    price_max: priceMax,
    price_suggested: suggested,
    sell_ease: ease,
    demand: oneOf(raw.demand, LEVELS, 'Moyenne'),
    competition: oneOf(raw.competition, COMPETITION, 'Moyenne'),
    advice: str(raw.advice, "Compare les annonces similaires sur Leboncoin pour ajuster ton prix."),
    description: str(raw.description, ''),
    confidence: oneOf(raw.confidence, CONFIDENCE, 'Basse'),
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { image, media_type } = await req.json();
    if (!image || typeof image !== 'string') {
      return jsonResponse({ error: 'Photo manquante.' }, 400);
    }

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        // MiMo est un modèle à raisonnement : il consomme des tokens de sortie
        // pour "réfléchir" avant d'émettre le JSON — il faut voir large.
        max_tokens: 16000,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: { url: `data:${media_type ?? 'image/jpeg'};base64,${image}` },
              },
              { type: 'text', text: PROMPT },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      console.error(`Zen API ${response.status}:`, body.slice(0, 500));
      return jsonResponse(
        { error: `Le service IA a répondu ${response.status}. Réessaie dans un instant.` },
        502,
      );
    }

    const completion = await response.json();
    const text: string | undefined = completion?.choices?.[0]?.message?.content;
    if (!text) {
      console.error('Réponse inattendue:', JSON.stringify(completion).slice(0, 500));
      return jsonResponse({ error: 'Réponse vide du modèle. Réessaie.' }, 502);
    }

    return jsonResponse(normalize(extractJson(text)));
  } catch (error) {
    console.error('estimate error:', error);
    return jsonResponse({ error: "L'estimation a échoué. Réessaie dans un instant." }, 500);
  }
});
