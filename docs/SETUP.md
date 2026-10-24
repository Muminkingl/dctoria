# Dctoria setup

The Supabase migrations have been applied to `zpvcbstaiqmaxvupypar`. The live directory starts empty. Add confirmed listings through the bot; no demo providers, photos, accounts, or ratings are seeded.

## Google sign-in

1. In Google Cloud / Google Auth Platform, configure Dctoria's branding, audience, support email and consent screen. While in testing, add your test Google accounts.
2. Create an OAuth client with application type **Web application**. This client handles the app's browser-based Google flow.
3. Add `http://localhost:8081` as a development JavaScript origin, and your real web origin when deployed.
4. Set the authorized redirect URI to:

   ```text
   https://zpvcbstaiqmaxvupypar.supabase.co/auth/v1/callback
   ```

5. In Supabase → Authentication → Sign In / Providers → Google, enable Google and save the Client ID and Client Secret. Keep the client secret in Supabase.
6. In Supabase URL Configuration, allow the app callback URLs listed below. Set the Site URL to your actual web URL.
7. Before making OAuth public, supply the required public branding, privacy and terms URLs and complete Google's applicable verification.

Source: [Supabase Google sign-in](https://supabase.com/docs/guides/auth/social-sign-in/auth-google).

## Apple sign-in

iOS uses the native Apple sheet with a nonce. It saves the full name when Apple supplies it on first authorization. Android and web use Apple OAuth.

1. Use your Apple Developer account to enable **Sign in with Apple** for App ID `com.trxstudio.dctoria`.
2. For browser sign-in, create a Services ID associated with that App ID (for example, `com.trxstudio.dctoria.web`). Configure domain `zpvcbstaiqmaxvupypar.supabase.co` and the Supabase callback URL above.
3. Create a Sign in with Apple key. Use your Team ID, Key ID and private `.p8` key to generate the OAuth client secret in Supabase's Apple setup tool. Keep the signing key private.
4. Enable the Apple provider in Supabase. Include the native bundle ID and your Services ID in its allowed Client IDs; enter the generated OAuth secret.
5. Apple OAuth secrets expire after at most six months; replace them before expiry. Native name information is optional and normally returned only on initial authorization.

Sources: [Supabase Apple sign-in](https://supabase.com/docs/guides/auth/social-sign-in/auth-apple), [Expo SDK 58 Apple Authentication](https://docs.expo.dev/versions/v58.0.0/sdk/apple-authentication/).

## Supabase redirect URLs and provider restriction

Allow these exact URLs in Authentication → URL Configuration:

```text
dctoria://auth/callback
http://localhost:8081/auth/callback
https://YOUR-ACTUAL-WEB-DOMAIN/auth/callback
```

Replace the last URL; do not add the placeholder. Use an Expo development build for native OAuth so the `dctoria` scheme is installed. The scheme is configured in `app.json`.

Disable Email and any unwanted providers in Supabase so the project accepts only Google and Apple. The app contains no password, email OTP, phone or anonymous-account login. Database rating policies additionally require an authenticated Google/Apple identity.

Google and Apple were **disabled** when checked during implementation. Their credentials require your provider accounts; full social login cannot be verified until those settings are supplied. The UI handles unavailable providers without leaving the app on an error document.

Source: [Supabase native deep linking](https://supabase.com/docs/guides/auth/native-mobile-deep-linking).

## Telegram bot on Vercel

Bot: [@dctoriabot](https://t.me/dctoriabot). The initial allowlist is **5549806778**. Commands have been registered with Telegram. The webhook is not registered until you have a deployed URL.

Create a Vercel project using the **`bot` directory as its Root Directory**:

- Framework preset: Other.
- Node.js: 24.x.
- The included `bot/vercel.json` provides the function and static output settings.
- Use a public HTTPS production URL that Telegram can reach. Deployment protection must not intercept `/api/telegram`; the endpoint itself checks Telegram's secret header and the admin allowlist.

Set these **server-only** environment variables in Vercel:

| Name | Value |
| --- | --- |
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Server service-role key |
| `TELEGRAM_BOT_TOKEN` | BotFather bot token |
| `TELEGRAM_ADMIN_IDS` | `5549806778` (comma-separated for additional admins) |
| `TELEGRAM_WEBHOOK_SECRET` | The random secret generated in local `bot/.env.local` |

Do not use `EXPO_PUBLIC_` for any of these secrets. `DATABASE_URL` is needed for local SQL migrations and verification, **not** for the deployed bot.

Deploy through the Vercel dashboard or from the repository root:

```powershell
npx vercel --cwd bot --prod
```

Put the resulting production URL in local `bot/.env.local`:

```dotenv
BOT_PUBLIC_URL=https://your-actual-bot-project.vercel.app
```

Then register the webhook:

```powershell
npm --prefix bot run webhook
```

The script sets `/api/telegram`, the secret header, one webhook connection and only the required update types. It preserves pending updates. Open @dctoriabot from the allowlisted account and send `/start`.

No Vercel deployment has been made during implementation; the project is prepared for deployment. The function checks configuration and stays closed if its secrets or admin IDs are missing.

Sources: [Vercel Node.js functions](https://vercel.com/docs/functions/runtimes/node-js), [Telegram setWebhook](https://core.telegram.org/bots/api#setwebhook).

## Bot workflow

- **Add:** choose category → name → specialty/title → specialty filter (doctors) → city → address → optional description/phone/services → location → photos → preview → Publish or Save draft.
- **Select:** category browsing, pagination, or name search. Published, draft and archived listings remain visible to the admin.
- **Update:** individual fields, availability, specialty filters, adding photos or replacing the gallery. The first photo is the cover.
- **Delete:** confirm archival. This removes the listing from public queries and preserves its ratings and photos. Publish restores it.
- **Statistics:** published/draft/archived totals and rating count.
- `/cancel` discards a form; `/menu` opens the action buttons.

Photos are sent as Telegram photos, up to 10 per batch and 5 MB each. The bot verifies image headers, uploads actual bytes to Supabase Storage, and saves storage paths. Telegram file URLs/tokens never become public photo URLs. Replacing a gallery updates photo metadata atomically and removes old unreferenced files when storage is available.

The webhook checks the secret, private-chat context and numeric admin ID before database access. Conversation state, retry snapshots, update leases and audit records persist in Supabase across Vercel invocations. Duplicate deliveries and photo retries are covered by tests.

## Data model and performance

`providers` stores the common identity of doctors, hospitals, centers, laboratories and offers, distinguished by `category`. This gives each listing one ID for maps, photos and ratings. `doctors`, `hospitals` and `centers` are filtered views with the caller's RLS permissions.

| Table | Purpose |
| --- | --- |
| `providers` | Real directory fields, publication status, coordinates and stored rating aggregates |
| `provider_photos` | Ordered photo paths, captions and cover position |
| `user_profiles` | Name/avatar mirror, readable only by its owner |
| `ratings` | One 1–5 rating per account/provider |
| `bot_sessions` | Expiring admin form state |
| `bot_updates` | Webhook leases, completion state and retry snapshots |
| `admin_audit_log` | Admin mutations with actor and update ID |

Public reads return only published providers and their photo metadata. App users cannot edit provider or photo records. Ratings are owned by `auth.uid()`; changing a score atomically adjusts the provider's sum/count. Lists use stored averages instead of aggregating the ratings table on every read. Partial category/city/specialty indexes, a trigram search index, keyset pagination and bounded page sizes support directory growth. React Query caches pages, cancels outdated searches and refreshes on pull-to-refresh or app foreground.

Migrations are versioned under `supabase/migrations/` and recorded in `dctoria_private.migrations`. They were applied to the supplied database. For a new project:

```powershell
node scripts/migrate.mjs
```

The `provider-photos` bucket serves public business photos. Only the service-role bot writes them. Guest favorites remain on-device; rating requires a real social account.

## Verification and remaining device checks

```powershell
npm run typecheck
npm run lint
npx expo-doctor
npm --prefix bot test
npm --prefix bot run check
node scripts/verify-database.mjs
node scripts/verify-api.mjs
npx expo export --platform all --output-dir output/release-check
node scripts/scan-client-secrets.mjs
```

The database verifier uses a transaction and rolls back all test listings/users/ratings. The REST checks confirm anonymous access boundaries without adding data. Bot tests mock Telegram and storage; they do not send messages to clients.

`npm audit` currently reports upstream Expo CLI / NativeWind dependency advisories. Its suggested fixes include downgrading Expo to SDK 44 or moving Tailwind to a different major version; those incompatible changes were not applied. Review these upstream advisories before release. The separate bot dependency audit reports zero advisories.

After enabling OAuth and deploying the bot, verify Google sign-in and return-to-rating on a device, the native Apple sheet on iOS, bot photo uploads on Vercel, and the first confirmed business listing in the app. A Metro export verifies bundling, not an installed APK/AAB or live provider consent.

New native modules and Apple entitlements require rebuilding the development client:

```powershell
npx expo run:android
```

For iOS, use macOS or an EAS development build. Keep Android package and iOS bundle ID `com.trxstudio.dctoria`.

## Credentials

The app's `.env.local` contains only the Supabase URL and public anon key. Local server credentials live in ignored `bot/.env.local`; `.vercelignore` also excludes environment files from uploads. Templates contain placeholders only. Rotate the service-role key, database password and bot token shared in chat, then update local and Vercel values. Never commit a `.p8` key or put a service key in the Expo environment.

For EAS cloud builds, configure both `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` in the selected EAS build environment; the ignored local environment file is not part of the uploaded source.
