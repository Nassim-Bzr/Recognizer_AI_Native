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
| IA (vision) | API Claude (`claude-opus-5`) via Edge Function Supabase |
| Déploiement | EAS Build (APK Android) |

**Pourquoi une Edge Function ?** La clé API Anthropic ne doit jamais se retrouver dans
l'APK. L'app envoie la photo à la fonction `estimate` (côté serveur, authentifiée par le
JWT Supabase de l'utilisateur), qui appelle Claude et renvoie un JSON garanti valide
(structured outputs).

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

Nécessite le [CLI Supabase](https://supabase.com/docs/guides/local-development/cli/getting-started)
et une clé API sur [platform.claude.com](https://platform.claude.com).

```bash
supabase login
supabase link --project-ref <ton-project-ref>
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
supabase functions deploy estimate
```

Puis passe `EXPO_PUBLIC_AI_MOCK=0` dans `.env` et relance `npx expo start --clear`.

> 💰 Coût : le modèle par défaut est `claude-opus-5`. Pour réduire le coût des démos,
> tu peux remplacer le modèle par `claude-sonnet-5` dans
> `supabase/functions/estimate/index.ts` (même API, moins cher).

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
  functions/estimate/      # Edge Function → API Claude (vision + structured outputs)
```

### Conformité au barème

| Critère | Où ? |
|---|---|
| Authentification | Supabase Auth — `(auth)/login`, `(auth)/register`, sessions persistées |
| Liste + détail (param) | `history.tsx` → `scan/[id].tsx` |
| CRUD branché à une base | **C**reate (enregistrer un scan) · **R**ead (historique/détail) · **U**pdate (statut, prix vendu, notes, favori) · **D**elete (supprimer un scan) |
| États chargement/erreur/vide | loaders, messages d'erreur FR, empty states sur chaque écran |
| Déploiement | `eas.json` profil `preview` → APK |
| Bonus IA | Edge Function `estimate` : vision + JSON structuré garanti |

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
- **Clé IA côté serveur** : la clé Anthropic vit dans les secrets Supabase, jamais dans
  l'app. La fonction est appelée avec le JWT utilisateur (verify_jwt).
- **Storage** : chaque utilisateur ne peut uploader que dans son dossier `<user_id>/`.
- **Honnêteté sur l'IA** : les prix sont des *estimations* du marché de l'occasion
  issues des connaissances du modèle, pas un scraping temps réel des annonces.
# Recognizer_AI_Native
