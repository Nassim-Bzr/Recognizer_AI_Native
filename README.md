# 📸 Estimo — Scanne un objet, découvre son prix de revente

Application mobile React Native (Expo) : tu prends **n'importe quel objet en photo**, tu peux
ajouter sa référence, son état et ses accessoires, puis l'IA l'identifie et te donne son
**prix de revente conseillé**, la **fourchette de prix**, la
**facilité de vente**, la **demande**, la **concurrence** et même une **annonce prête à publier**.
Chaque scan est sauvegardé dans ton **historique** lié à ton compte.

> Projet réalisé dans le cadre du TP de groupe React Native (variante du projet 5
> « Friperie de campus » : estimation d'objets au lieu de vêtements, validée sur le même socle
> auth + liste/détail + CRUD + bonus IA).

---

## 🧱 Stack

| Brique | Techno |
|---|---|
| App mobile | Expo SDK 54 (React Native + TypeScript + expo-router) |
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

## 🚀 Installer et déployer depuis un clone

### Pré-requis

- Node.js LTS et npm ;
- un compte Supabase (projet gratuit suffisant pour la démo) ;
- un compte Expo si tu veux générer l'APK ;
- une clé OpenCode Zen pour la vraie IA. Le mode mock fonctionne sans cette clé.

```bash
git clone https://github.com/Nassim-Bzr/Recognizer_AI_Native.git
cd Recognizer_AI_Native
npm install
```

> Les commandes `cp` ci-dessous sont pour macOS/Linux. Sous Windows PowerShell, utilise
> `Copy-Item .env.example .env`.

### 1. Créer le projet Supabase

1. Crée un projet sur [supabase.com](https://supabase.com) (gratuit).
2. Dashboard > **SQL Editor** > New query → colle le contenu de
   [`supabase/schema.sql`](supabase/schema.sql) → **Run**.
   Ça crée la table `scans`, les droits Data API nécessaires aux nouveaux projets Supabase,
   les policies RLS et le bucket de photos.
3. (Recommandé pour la démo) **Authentication > Sign In / Up > Email** →
   désactive « Confirm email » pour pouvoir créer des comptes instantanément.

### 2. Configurer l'app

```bash
cp .env.example .env
```

Remplis `.env` avec les valeurs de **Settings > API** :

```
EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_... # ou legacy anon key eyJ... pour un ancien projet
EXPO_PUBLIC_AI_MOCK=1        # 1 = IA simulée (aucune clé requise), 0 = vraie IA
```

`EXPO_PUBLIC_SUPABASE_ANON_KEY` est conservé comme nom de variable pour compatibilité :
il accepte aussi la **Publishable key** actuelle. Ne mets **jamais** une `service_role key`
dans `.env`, ni dans EAS : elle contourne la sécurité de la base.

### 3. Démarrer

```bash
npx expo start --clear
```

Si ta version d'**Expo Go** prend encore en charge Expo SDK 54, tu peux scanner le QR code.
Sinon, utilise l'APK décrite plus bas : c'est le moyen recommandé pour la démonstration.
Avec `EXPO_PUBLIC_AI_MOCK=1`,
tout le parcours fonctionne (l'estimation est simulée) — parfait pour développer l'UI.

### 4. Brancher la vraie IA (bonus valorisé)

Récupère une clé API sur [OpenCode Zen](https://opencode.ai/docs/zen), puis :

```bash
npx supabase@latest login
npx supabase@latest secrets set --project-ref <ton-project-ref> OPENCODE_API_KEY=sk-...
npx supabase@latest functions deploy estimate --project-ref <ton-project-ref>
```

Puis passe `EXPO_PUBLIC_AI_MOCK=0` dans `.env` et relance `npx expo start --clear`.

> Le modèle par défaut est `mimo-v2.5-free`, bien disponible dans Zen au moment de la rédaction.
> Son offre gratuite est temporaire : si elle disparaît ou atteint une limite, l'app affiche une
> erreur et il faut sélectionner un autre modèle Zen. Pour le changer sans toucher au code :
> `npx supabase@latest secrets set --project-ref <ton-project-ref> AI_MODEL=<modele-zen>`.
> La clé `OPENCODE_API_KEY` reste uniquement dans les secrets Supabase, jamais dans `.env`.

**Vérification recommandée :** crée un compte dans l'application, réalise une estimation,
enregistre-la puis vérifie que la ligne et la photo apparaissent dans le projet Supabase.

### 5. Générer l'APK (déploiement)

```bash
npx eas-cli@latest login
npx eas-cli@latest init
```

`eas init` relie ce clone à **ton** compte Expo et ajoute un identifiant de projet dans
`app.json`. Pour publier une application distincte sur un store, remplace aussi les identifiants
`android.package` et `ios.bundleIdentifier` dans ce fichier par des valeurs uniques.

Les fichiers `.env` ne sont pas envoyés aux builds cloud. Ajoute donc les deux variables publiques
du projet Supabase dans l'environnement EAS `preview` (elles sont publiques par nature, car
embarquées dans l'APK) :

```bash
npx eas-cli@latest env:create --name EXPO_PUBLIC_SUPABASE_URL --value https://xxxx.supabase.co --environment preview --visibility plaintext
npx eas-cli@latest env:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value sb_publishable_... --environment preview --visibility plaintext
npx eas-cli@latest build --platform android --profile preview
```

À la fin du build, EAS fournit un lien pour télécharger l'**APK installable** sur un
vrai téléphone. Le profil `preview` active déjà la vraie IA (`EXPO_PUBLIC_AI_MOCK=0`) ;
assure-toi donc d'avoir déployé la fonction `estimate` et son secret OpenCode avant de lancer le build.

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
      scan.tsx             # photo + indices → IA → variantes d'annonce → enregistrement
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
| Bonus IA | Vision + indices utilisateur + JSON normalisé + 3 annonces sans appels supplémentaires |

---

## 👥 Répartition suggérée pour la soutenance

1. **Membre A — Auth & navigation** : Supabase Auth, contexte de session, redirections,
   écrans login/register, structure expo-router.
2. **Membre B — CRUD & data** : schéma SQL + RLS, historique (recherche/filtres),
   écran détail (update/delete), storage des photos.
3. **Membre C — IA & déploiement** : flux scan (caméra + indices), Edge Function OpenCode Zen,
   normalisation du JSON, variantes d'annonce, mode mock, build EAS.

---

## 🔒 Sécurité (questions probables en soutenance)

- **RLS** : chaque requête passe par des policies Postgres — un utilisateur ne peut
  lire/modifier que ses propres scans, même avec la clé anon.
- **Clé IA côté serveur** : la clé OpenCode Zen vit dans les secrets Supabase, jamais
  dans l'app. La fonction est appelée avec le JWT utilisateur (verify_jwt).
- **Maîtrise des appels IA** : les trois annonces sont générées pendant l'estimation ;
  changer de variante ne déclenche aucun nouvel appel payant et s'arrête après deux changements.
- **Storage** : chaque utilisateur ne peut uploader que dans son dossier `<user_id>/`.
- **Honnêteté sur l'IA** : les prix sont des *estimations* du marché de l'occasion
  issues des connaissances du modèle, pas un scraping temps réel des annonces.
# Recognizer_AI_Native
