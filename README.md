# dctoria

A Kurdish healthcare directory built with Expo SDK 58, React Native 0.88, Expo Router, Supabase and React Native Reusables (native shadcn/ui components).

## Run

```powershell
npm install
npm run web
```

Use `.env.example` for the two public Supabase variables. Local `.env.local` is configured for the supplied project. Native authentication requires a development build; rebuild after adding native dependencies:

```powershell
npx expo run:android
```

## App

- Guest browsing by default. Sign-in is requested for rating, or opened voluntarily from Profile.
- Full profile and provider pages with back navigation; no profile/provider detail modal.
- Google and Apple are the only sign-in options. iOS Apple uses the native sheet and captures the initial full name; Google and other platforms use PKCE browser OAuth.
- The live Supabase directory replaces every sample provider and fabricated rating. Empty, loading, retry, pagination and pull-to-refresh states are included.
- Business photos are loaded from Supabase Storage. Provider galleries, addresses and expandable maps use real stored information.
- Ratings allow one score per social account/provider, with updates and atomic aggregate counters.
- Profile opens a WhatsApp draft to `+964 751 020 1840` for listing inquiries.
- Three distinct banner images slide smoothly as complete cards, including the automatic loop. The Watermelon navigator retains its six-second progress clock and no pause icon.
- Fluid bottom tabs retain their animation: pill position, icon crossfade/scale and label color share a 120ms clock started directly on press-down. Reduced motion is respected.

The native [Watermelon UI adaptations](https://registry.watermelon.sh/) live in `components/watermelon/`. Reusables Button, Card, Dialog, Input, Badge and Text primitives live in `components/ui/`. Vazirmatn fonts, RTL placement and safe areas are bundled.

## Backend and administration

The migrations under `supabase/migrations/` have been applied to the supplied project. No demo records are seeded. `bot/` is a separate Node.js Vercel project for [@dctoriabot](https://t.me/dctoriabot), allowlisted to Telegram ID `5549806778`.

The bot supports Add, Select/Search, Update, confirmed Delete/Archive, publication, multiple photo uploads, and statistics. Server credentials remain in ignored `bot/.env.local`; the mobile app contains only the public key.

**Google/Apple provider credentials and a Vercel deployment/webhook are still required.** Exact settings, callback URLs, environment variables, deployment commands, data design and verification instructions are in [docs/SETUP.md](docs/SETUP.md).

## Validate

```powershell
npm run typecheck
npm run lint
npx expo-doctor
npm --prefix bot test
node scripts/verify-database.mjs
node scripts/verify-api.mjs
npx expo export --platform all --output-dir output/release-check
```

Live database tests roll back their fixtures. Metro exports verify bundles; device OAuth and the deployed bot require validation after account setup.

## Google Play

The app name/slug is `dctoria`; Android package and iOS bundle ID are `com.trxstudio.dctoria`. EAS development, preview APK, production AAB and internal draft submission profiles are prepared in `eas.json`. Sign in to Expo, link your EAS project and configure your own store credentials before building/submitting. No Play Console upload has been made.

## Artwork

`assets/medical-hero.png`, `assets/banner-specialist.png` and `assets/banner-hospital.png` are built-in imagegen campaign artwork; actual provider photos come from the database. Generation prompts are saved beside the assets. All banner text and controls are native elements.
