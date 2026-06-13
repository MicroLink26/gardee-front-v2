# Gardee Frontend

Interface web de la marketplace Gardee.

**Stack** : Astro 5 (SSR) · Vue 3 · TypeScript · Pinia · Axios · Leaflet · Playwright

**Production** : `https://gardee.fr`  
**Staging** : `https://v2.gardee.fr`  
**CI/CD** : GitHub Actions — push sur `main` → build → deploy FTP → smoke test headless

---

## Démarrage rapide

```bash
cp .env.example .env   # renseigner PUBLIC_API_URL
npm install
npm run dev            # Astro dev server sur http://localhost:4321
```

## Commandes

```bash
npm run dev          # serveur de développement
npm run build        # build de production (prérendu + assets)
npm run preview      # prévisualise le build local
npx astro check      # type-check des fichiers .astro
npm run smoke        # smoke test headless post-deploy (voir ci-dessous)
```

## Variables d'environnement

| Variable | Description | Exemple |
|---|---|---|
| `PUBLIC_API_URL` | URL de base de l'API backend | `https://site--gardee-backend--fg6zdpvl2w9z.code.run/api` |

## Deploy

Le déploiement est entièrement automatisé via GitHub Actions (`.github/workflows/deploy.yml`) :

- **Push sur `main`** → build → FTP vers `/www/front` (prod) → smoke test
- **Déclenchement manuel** → onglet Actions → « Run workflow » → choisir `production` ou `staging` (`/www/v2`)

Les credentials FTP sont stockés dans les secrets GitHub (`FTP_HOST`, `FTP_USER`, `FTP_PASSWORD`).

### Smoke test post-deploy

```bash
npm run smoke                                      # teste https://gardee.fr
BASE_URL=https://v2.gardee.fr npm run smoke        # teste le staging
```

Vérifie en navigateur headless (Playwright) : HTTP 200, zéro erreur JS, marqueurs sur la carte, photos sur le classement, formulaire de connexion, fiche prestataire dynamique. Sort avec un code non nul en cas d'échec.

---

## Architecture

```
src/
├── pages/
│   ├── index.astro             # Accueil (SSR)
│   ├── recherche.astro         # Recherche prestataires (SSR)
│   ├── classement.astro        # Classement par note (SSR)
│   ├── carte.astro             # Carte interactive (shell SSR + Vue)
│   ├── postuler.astro          # Candidature prestataire (SSR)
│   ├── contact.astro           # Contact (SSR)
│   ├── prestataires/
│   │   ├── index.astro         # Liste (SSR)
│   │   └── [id].astro          # Fiche publique (SSR + données API)
│   └── app/                    # Dashboard (shell Astro + Vue islands)
│       ├── login.astro
│       ├── register.astro
│       ├── dashboard.astro
│       ├── profil.astro
│       ├── mes-demandes.astro
│       ├── messagerie.astro
│       ├── parametres.astro
│       ├── forgot-password.astro
│       ├── requests/           # Actions sur demandes (confirmation, avis…)
│       └── admin/              # Backoffice staff/admin
├── components/
│   ├── astro/                  # Composants statiques (Navbar, Footer)
│   └── vue/                    # Islands Vue 3 (client:load)
│       ├── dashboard/          # Composants du dashboard connecté
│       │   ├── AppShell.vue    # Layout + garde d'authentification
│       │   ├── LoginForm.vue
│       │   ├── RegisterForm.vue
│       │   ├── MonProfil.vue
│       │   ├── Messagerie.vue
│       │   ├── MesDemandes.vue
│       │   └── Parametres.vue
│       ├── BookingWidget.vue   # Widget de réservation sur fiches prestataires
│       ├── CarteView.vue       # Carte Leaflet avec clusters
│       ├── Classement.vue      # Classement avec filtres
│       ├── RatingForm.vue      # Formulaire d'avis (token par email)
│       ├── AvatarImage.vue     # Avatar (photo Cloudinary ou initiales SVG)
│       └── ...
├── stores/                     # Pinia
│   ├── auth.ts                 # Utilisateur connecté (persisté via accessToken)
│   ├── categories.ts           # Catégories de prestations (chargées une fois)
│   └── toast.ts                # Notifications éphémères
├── services/                   # Couche API (Axios)
│   ├── api.ts                  # Instance Axios + intercepteur de refresh token
│   ├── auth.ts
│   ├── users.ts
│   ├── requests.ts
│   └── reviews.ts
├── composables/
│   ├── useAvatar.ts            # Avatar par hash de l'ID (fallback sans photo)
│   ├── useCategoryName.ts      # Résolution id → nom de catégorie
│   └── usePushNotifications.ts # Abonnement aux notifications Web Push
├── layouts/
│   └── BaseLayout.astro        # <head> SEO, JSON-LD, scripts globaux
└── scripts/
    ├── generate-sitemap.mjs    # Génère public/sitemap.xml (lancé au build)
    ├── convert-to-webp.mjs     # Convertit les assets PNG/JPG en WebP
    ├── ftp-deploy.mjs          # Script de deploy FTP (utilisé par la CI)
    └── smoke-test.mjs          # Smoke test headless post-deploy
```

### Stratégie de rendu

| Zone | Rendu | Raison |
|---|---|---|
| Pages publiques (`/`, `/recherche`, `/classement`, `/carte`, fiches `/prestataires/[id]`) | **Astro SSR prérendu** | SEO, temps de chargement initial |
| Dashboard (`/app/*`) | **Shell Astro + Vue islands** `client:load` | Interactivité, données personnalisées |

Les pages prérendues récupèrent les données de l'API au moment du build. Les fiches `/prestataires/[id]` sont générées pour tous les prestataires via `getAllPrestataireIds`.

### Authentification

`AppShell.vue` s'exécute côté client au `onMounted` :
1. Appelle `auth.fetchMe()` → si non connecté, redirige vers `/app/login`
2. Vérifie `requireRole` (prop) → redirige vers `/app/dashboard` si rôle insuffisant

Le store Pinia `auth` persiste uniquement l'`accessToken` (via `pinia-plugin-persistedstate`). Le refresh token est un cookie `httpOnly` géré par le navigateur. L'intercepteur Axios dans `services/api.ts` renouvelle l'access token automatiquement sur une réponse 401.

### Sitemap

Le sitemap est régénéré à chaque build (via `scripts/generate-sitemap.mjs`) et inclut toutes les fiches prestataires prérendues. Il n'est pas commité — il est généré puis uploadé vers le serveur FTP.
