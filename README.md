# 📸 Estimo — Scanne un objet, découvre son prix de revente

Application mobile React Native (Expo) : tu prends **n'importe quel objet en photo**, l'IA
l'identifie et te donne son **prix de revente conseillé**, la **fourchette de prix**, la
**facilité de vente**, la **demande**, la **concurrence** et même une **annonce prête à publier**.
Chaque scan est sauvegardé dans ton **historique** lié à ton compte.

> Projet réalisé dans le cadre du TP de groupe React Native (variante du projet 5
> « Friperie de campus » : estimation d'objets au lieu de vêtements, validée sur le même socle
> auth + liste/détail + CRUD + bonus IA).

---

## 🧱 Stack

| Brique | Techno |
|---|---|
| App mobile | Expo (React Native + TypeScript + expo-router) |
| Authentification | Supabase Auth (email / mot de passe) |
| Base de données | Supabase Postgres + Row Level Security |
| Stockage photos | Supabase Storage (bucket `scans`) |
| IA (vision) | MiMo V2.5 (`mimo-v2.5-free`, **gratuit**) via [OpenCode Zen](https://opencode.ai) — API OpenAI-compatible |
| Déploiement | EAS Build (APK Android) |

**Pourquoi une Edge Function ?** La clé API ne doit jamais se retrouver dans
l'APK. L'app envoie la photo à la fonction `estimate` (côté serveur, authentifiée par le
JWT Supabase de l'utilisateur), qui appelle le modèle de vision et renvoie un JSON
validé et normalisé côté serveur.

---

## 🚀 Lancer le projet

### 1. Créer le projet Supabase

1. Crée un projet sur [supabase.com](https://supabase.com) (gratuit).
2. Dashboard > **SQL Editor** > New query → colle le contenu de
   [`supabase/schema.sql`](supabase/schema.sql) → **Run**.
   Ça crée la table `scans`, les policies RLS et le bucket de photos.
3. (Recommandé pour la démo) **Authentication > Sign In / Up > Email** →
   désactive « Confirm email » pour pouvoir créer des comptes instantanément.

### 2. Configurer l'app

```bash
cp .env.example .env
```

Remplis `.env` avec les valeurs de **Project Settings > API** :

```
EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
EXPO_PUBLIC_AI_MOCK=1        # 1 = IA simulée (aucune clé requise), 0 = vraie IA
```

### 3. Démarrer

```bash
npm install
npx expo start
```

Scanne le QR code avec **Expo Go** sur ton téléphone. Avec `EXPO_PUBLIC_AI_MOCK=1`,
tout le parcours fonctionne (l'estimation est simulée) — parfait pour développer l'UI.

### 4. Brancher la vraie IA (bonus valorisé)

Récupère une clé API **gratuite** sur [opencode.ai](https://opencode.ai) (section **Zen** →
« Copier la clé »), puis :

```bash
npx supabase login
npx supabase secrets set --project-ref <ton-project-ref> OPENCODE_API_KEY=sk-...
npx supabase functions deploy estimate --project-ref <ton-project-ref>
```

Puis passe `EXPO_PUBLIC_AI_MOCK=0` dans `.env` et relance `npx expo start --clear`.

> 💰 Coût : le modèle par défaut est `mimo-v2.5-free` (vision, 200k contexte, **0 €**).
> Tu peux changer de modèle sans toucher au code via un secret :
> `npx supabase secrets set AI_MODEL=claude-sonnet-5` (ou tout autre modèle du
> catalogue Zen, endpoint OpenAI-compatible `https://opencode.ai/zen/v1/chat/completions`).

### 5. Générer l'APK (déploiement)

```bash
npm install -g eas-cli
eas login
eas build --platform android --profile preview
```

À la fin du build, EAS fournit un lien pour télécharger l'**APK installable** sur un
vrai téléphone (les variables `EXPO_PUBLIC_*` de `.env` sont embarquées au build —
configure-les aussi dans EAS > Environment variables pour les builds cloud).

---

## 🗺️ Architecture

```
src/
  app/                     # expo-router (navigation par fichiers)
    _layout.tsx            # racine : AuthProvider + Stack (+ écran de setup .env)
    index.tsx              # redirection selon la session
    (auth)/                # connexion / inscription
    (tabs)/
      history.tsx          # LISTE : historique, recherche, filtres, stats
      scan.tsx             # photo → IA → résultat → enregistrement
      profile.tsx          # statistiques + déconnexion
    scan/[id].tsx          # DÉTAIL (navigation avec paramètre) : update/delete
  components/              # UI partagée (boutons, cartes, bloc estimation)
  lib/                     # client supabase, contexte auth, service IA, thème
supabase/
  schema.sql               # table scans + RLS + bucket storage
  functions/estimate/      # Edge Function → OpenCode Zen (vision, JSON validé)
```

### Conformité au barème

| Critère | Où ? |
|---|---|
| Authentification | Supabase Auth — `(auth)/login`, `(auth)/register`, sessions persistées |
| Liste + détail (param) | `history.tsx` → `scan/[id].tsx` |
| CRUD branché à une base | **C**reate (enregistrer un scan) · **R**ead (historique/détail) · **U**pdate (statut, prix vendu, notes, favori) · **D**elete (supprimer un scan) |
| États chargement/erreur/vide | loaders, messages d'erreur FR, empty states sur chaque écran |
| Déploiement | `eas.json` profil `preview` → APK |
| Bonus IA | Edge Function `estimate` : vision + JSON validé/normalisé côté serveur |

---

## 👥 Répartition suggérée pour la soutenance

1. **Membre A — Auth & navigation** : Supabase Auth, contexte de session, redirections,
   écrans login/register, structure expo-router.
2. **Membre B — CRUD & data** : schéma SQL + RLS, historique (recherche/filtres),
   écran détail (update/delete), storage des photos.
3. **Membre C — IA & déploiement** : flux scan (caméra), Edge Function Claude,
   structured outputs, mode mock, build EAS.

---

## 🔒 Sécurité (questions probables en soutenance)

- **RLS** : chaque requête passe par des policies Postgres — un utilisateur ne peut
  lire/modifier que ses propres scans, même avec la clé anon.
- **Clé IA côté serveur** : la clé OpenCode Zen vit dans les secrets Supabase, jamais
  dans l'app. La fonction est appelée avec le JWT utilisateur (verify_jwt).
- **Storage** : chaque utilisateur ne peut uploader que dans son dossier `<user_id>/`.
- **Honnêteté sur l'IA** : les prix sont des *estimations* du marché de l'occasion
  issues des connaissances du modèle, pas un scraping temps réel des annonces.
# Recognizer_AI_Native
