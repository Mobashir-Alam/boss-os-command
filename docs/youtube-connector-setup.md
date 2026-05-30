# YouTube Connector — Team Setup Guide

This guide is for whoever owns the Nasheedio YouTube channels OR has admin access to the company Google Workspace. Following it once unlocks the YouTube dashboard at `/team/social-media`.

---

## What you'll produce at the end

1. A **Google API key** that looks like `AIzaSy…` (~39 characters)
2. A list of **YouTube channel IDs** (e.g. `UCxxxx…`) — one per Nasheedio channel

That's it. Both go into the app via the **Setup** button on `/team/social-media`.

---

## Step 1 — Create / open a Google Cloud project (~3 minutes)

1. Sign in at https://console.cloud.google.com/ with the Google account that owns the YouTube channels (the **brand account** is fine, doesn't have to be a personal email).
2. Top-left → click the project dropdown → **New Project**
   - Project name: `Nasheedio Connectors` (or pick any name)
   - Click **Create**
3. Wait ~10 seconds for it to provision, then make sure that project is selected (it shows in the top bar).

---

## Step 2 — Enable the YouTube Data API v3 (~1 minute)

1. In the left sidebar → **APIs & Services** → **Library**
2. Search for **YouTube Data API v3**
3. Click it → **Enable**

You'll see a confirmation that the API is now enabled for your project.

> Note: **Don't** enable the YouTube Analytics API yet. That's a Tier-2 (OAuth) upgrade we'll do later when you want revenue and watch-time data.

---

## Step 3 — Create an API key (~1 minute)

1. In the left sidebar → **APIs & Services** → **Credentials**
2. Top of the page → **+ Create Credentials** → **API key**
3. Copy the key that appears. **Don't paste it anywhere yet — keep it on your clipboard.**

---

## Step 4 — Restrict the key (good security hygiene, ~1 minute)

This prevents the key from being abused if it ever leaks.

1. Click the pencil icon next to your new key → "Edit API key"
2. **Application restrictions**: leave as "None" for now (we'll tighten later if needed)
3. **API restrictions**: select **Restrict key** → check only **YouTube Data API v3** → Save

The key can now ONLY read public YouTube data. If it leaks, an attacker could read public YouTube data and burn your quota — recoverable. They cannot touch Gmail, Drive, billing, or any other Google service.

---

## Step 5 — Find your channel IDs (~2 minutes)

For each Nasheedio YouTube channel, you need its channel ID. Two ways:

### The easy way

Visit the channel's main page on YouTube (e.g. https://youtube.com/@nasheediobeats). If the URL uses an `@handle` (like `@nasheediobeats`), the app accepts that format directly — you don't need the long `UC…` ID.

### The robust way

1. Visit the channel
2. Click **View source** on the page (or scroll to "About" section)
3. Find a string starting with `UC` and roughly 24 characters long — that's the channel ID

Make a list. Examples:
```
Nasheedio Beats          @nasheediobeats     OR  UCxxxxxxxxxxxxxxxxxxxxxx
Nasheedio Bangla         @nasheediobangla
Nasheedio (English)      @nasheedio
Nasheedio Studio         @nasheediostudio
…
```

---

## Step 6 — Put it all into the app (~2 minutes)

1. Log into Founder OS as the **founder** OR a user with `functional_head` role + `department = 'social_media'`
2. Go to `/team/social-media`
3. Click **Setup** (top right)
4. **Step 1 in the modal**: paste your API key → **Save**
5. **Step 2 in the modal**: for each channel, type the handle (e.g. `@nasheediobeats`) or channel ID → **Preview**
   - The modal shows the channel name + subscriber count so you can verify it's the right one
   - Click **Add** to register it
6. Repeat for every channel
7. Close the modal
8. Click **Sync now** on the main page

Wait 20–60 seconds depending on how many videos you have. The dashboard fills up with channels + recent uploads + top performers.

---

## How often does it sync?

- **Manual** — anyone with permission can hit "Sync now" anytime
- **Auto** — daily via cron (added later in the connector framework rollout)

Quota usage: roughly **5–50 units per channel per day**, depending on how many videos exist. Daily quota cap is **10,000 units**. You'd need 200+ channels before quota becomes a real concern.

---

## What if "Preview" fails?

| Error message | Meaning | Fix |
|---|---|---|
| `Channel not found for input "…"` | The handle or ID didn't resolve | Double-check the spelling. Try the `UC…` ID instead of the handle. |
| `YouTube 403: The request cannot be completed because you have exceeded your quota` | Daily quota burned | Wait 24h, or apply for a quota increase in Google Cloud Console |
| `YouTube 400: API key not valid` | Key wrong or restrictions block it | Make sure you only restricted to **YouTube Data API v3**, no application restriction |
| `No active youtube credential found` | Forgot Step 1 (Save API key) | Open Setup, save the key first |

---

## Tier 2 upgrade later — what changes

When you want revenue, watch time, audience retention, demographics, traffic sources, click-through rate, etc., we'll add:

- **OAuth client credentials** in Google Cloud (Client ID + Client Secret)
- Per-channel "Authorize" button — the channel owner clicks it, signs in with Google, grants access
- Refresh tokens stored in the existing `connector_youtube_oauth` table
- New widgets on the dashboard for the richer metrics

The schema is already prepared. Tier 2 is purely additive — Tier 1 data keeps flowing as-is.

---

## Security notes

- **Never paste the API key in chat, email, or screenshots** — store it only in the app's Setup modal (which writes to the encrypted `connector_credentials` table)
- If the key ever leaks (suspicious quota usage, public commit, screenshot), revoke + regenerate from Google Cloud Console → Credentials → key → **Delete** + create new one
- The Setup modal supports replacing the key — paste a new value over the old one, Save

---

# Tier 2 — OAuth setup (unlocks revenue, watch time, CTR, demographics)

When you're ready for richer analytics, follow this section. **It does not replace Tier 1** — Tier 1 keeps running. Tier 2 layers analytics on top.

## What you'll produce

- A Google **OAuth Client ID** + **Client Secret**
- A **redirect URI** registered with the OAuth client

These go into Supabase secrets (NOT in the app DB).

## Step T2-1 — Configure OAuth consent screen (~5 min, one-time)

1. https://console.cloud.google.com/ → same project as Tier 1 → **APIs & Services** → **OAuth consent screen**
2. **User Type:** `Internal` if your team uses Google Workspace (no Google verification needed), otherwise `External` (you'll be in "Testing" mode — add your test users by email)
3. Fill in app name (e.g. "Founder OS Analytics"), support email, developer contact email
4. **Scopes:** click "Add or Remove Scopes" → search and add:
   - `.../auth/youtube.readonly`
   - `.../auth/yt-analytics.readonly`
   - `.../auth/yt-analytics-monetary.readonly` *(only request if channel is in Partner Program)*
5. **Test users** (for External type): add each Google account that will authorize a channel
6. Save & continue

## Step T2-2 — Enable the YouTube Analytics API

1. **APIs & Services** → **Library**
2. Search **YouTube Analytics API** → **Enable**

## Step T2-3 — Create OAuth client (~2 min)

1. **APIs & Services** → **Credentials** → **+ Create Credentials** → **OAuth client ID**
2. **Application type:** Web application
3. **Name:** `Founder OS OAuth`
4. **Authorized redirect URIs:** add exactly this URL (replace the Supabase project ref if different):
   ```
   https://gnkyujdmrnoprwredzcy.supabase.co/functions/v1/youtube-oauth-callback
   ```
5. Click **Create**
6. Copy the **Client ID** and **Client Secret** that appear

## Step T2-4 — Add secrets to Supabase / Lovable

In Lovable, find the Edge Function secrets (or Supabase Dashboard → Project Settings → Edge Functions → Secrets). Add:

| Secret name | Value |
|---|---|
| `GOOGLE_OAUTH_CLIENT_ID` | The Client ID from step T2-3 |
| `GOOGLE_OAUTH_CLIENT_SECRET` | The Client Secret from step T2-3 |
| `GOOGLE_OAUTH_REDIRECT_URI` | `https://gnkyujdmrnoprwredzcy.supabase.co/functions/v1/youtube-oauth-callback` (exact same URI you registered) |
| `APP_BASE_URL` | `http://localhost:8080` for dev OR your deployed app URL (e.g. `https://preview--boss-os-command.lovable.app`) — used by the callback to redirect back |

## Step T2-5 — Authorize each channel

1. In Founder OS, go to `/team/social-media`
2. Click **Authorize** in the header
3. A new tab opens with Google's consent screen
4. Sign in **with the Google account that owns the YouTube channels**
5. Accept the requested scopes
6. You'll be redirected back to `/team/social-media` with a success toast
7. The dashboard now shows an **Analytics** tab — click to see revenue / watch time / CTR

Repeat for each Google account that owns Nasheedio channels (e.g. if Nasheedio Bangla and Nasheedio Beats are on different Google accounts, each one authorizes once).

## Step T2-6 — Pull the first analytics snapshot

1. Click **Sync analytics** (new button in the header, appears once any channel is authorized)
2. Wait ~30–60 seconds depending on number of channels and videos
3. The Analytics tab fills in with the last 30 days of data

## Troubleshooting Tier 2

| Symptom | Cause / Fix |
|---|---|
| "Error 400: redirect_uri_mismatch" on Google consent | The `GOOGLE_OAUTH_REDIRECT_URI` secret must EXACTLY match the URI registered in step T2-3. Watch for trailing slashes. |
| "Access blocked: This app's request is invalid" | OAuth consent screen is in `Testing` mode AND the signing-in email isn't a test user. Add it under Test users in the consent screen settings. |
| OAuth completes but no analytics data appears | Click "Sync analytics" — the OAuth flow only stores tokens, doesn't auto-pull data |
| Channel authorized but revenue shows "—" | Channel isn't in YouTube Partner Program (not monetized), OR `yt-analytics-monetary.readonly` scope wasn't granted. Re-authorize and accept that scope. |
| "no_refresh_token" error in callback | Google didn't issue a refresh token. Revoke the app's access at https://myaccount.google.com/permissions → re-authorize. We force prompt=consent, this should be rare. |

## Why this matters

Before Tier 2: dashboard shows views, likes, comments — the public stuff anyone can see on the watch page.

After Tier 2: revenue per video, watch time, click-through rate on thumbnails, where viewers drop off, audience demographics. The metrics YouTube's algorithm actually uses to rank you — and the numbers that turn the dashboard into a real intelligence tool for the Social Media team and the CEO.

