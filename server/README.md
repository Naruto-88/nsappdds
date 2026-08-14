# netStripes Dashboard — Backend

Handles Google Sign-In for the dashboard (`tech@netstripes.com`) and, using that
same authorized session, pulls live SEO data from Google Search Console and
GA4 for each client's "SEO & Organic" card. Everything else on the dashboard
(Meta Ads, CRO, Social, Content Engine, and Domain Authority/Backlinks on the
SEO card) is untouched — it still comes from the Google Sheet exactly as before.

## Prerequisites (do these once, in Google Cloud Console)

1. Create/select a GCP project. Enable **Google Search Console API**,
   **Google Analytics Data API**, and **Google Analytics Admin API** (the last
   one is separate from the Data API and powers GA4 Property ID auto-matching
   — see below).
2. Configure the OAuth consent screen as **Internal** (assuming
   `netstripes.com` is a Google Workspace domain — this avoids the 7-day
   test-token expiry and Google's app-verification review).
3. Create an **OAuth 2.0 Client ID**, type **Web application**, with an
   authorized redirect URI matching `GOOGLE_REDIRECT_URI` below.
4. In the dashboard's `_CONFIG` Google Sheet, add three columns to the CLIENT
   BASELINES section: **GSC Site URL**, **GA4 Property ID**, **Google Ads
   Customer ID**. GSC Site URL is required per client (nothing else can be
   found without it); **GA4 Property ID can be left blank** — the backend
   auto-matches it from the client's domain (see below). Google Ads Customer
   ID has no reliable auto-match and must be filled in manually. Unmapped
   fields simply show "-" on the dashboard — nothing breaks.

## GA4 auto-matching

GA4 web Data Streams carry an explicit `defaultUri` (the site's actual URL),
so `AnalyticsService.findPropertyIdForDomain()` can reliably tie a domain to
its GA4 property: it enumerates every property the connected account can see,
reads each one's stream URLs, and matches by domain (cached 30 min — this
walks every accessible property, so it isn't cheap to redo per request).
Google Ads has no equivalent per-account domain field (one account can run
campaigns for several domains), so its Customer ID is **not** auto-matched —
guessing there would risk silently showing the wrong client's ad spend, which
is worse than requiring one manual lookup.

## Setup

```bash
npm install
cp .env.example .env   # then fill in GOOGLE_CLIENT_ID / SECRET / CONFIG_SHEET_ID
npm run start:dev
```

Server listens on `PORT` (default `3001`). The dashboard's `BACKEND_URL`
constant in `index.html` must point here.

## What each env var is for

See `.env.example` — every value is commented there. The two you cannot skip
to get *any* real data flowing: `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`
(from step 3 above) and `CONFIG_SHEET_ID` (same Sheet ID you already paste
into the dashboard's Governance tab).

## Architecture

- `auth/` — Google OAuth login flow. Completing login as `tech@netstripes.com`
  both signs into the dashboard *and* authorizes this backend's GSC/GA4 calls
  — one flow, one identity, matching how access was already granted on the
  Google side. The resulting tokens persist in `data/google-connection.json`
  (gitignored) so a server restart doesn't require re-login.
- `google-api/` — thin wrappers around the GSC Search Analytics API and the
  GA4 Data API (`runReport`), scoped to the "Organic Search" channel.
- `clients-config/` — reads the same `_CONFIG` sheet tab the dashboard already
  uses, to map each client's `sheetKey` to their GSC Site URL / GA4 Property
  ID.
- `metrics/` — `GET /api/clients/:sheetKey/seo?period=week|week2|week3|month|q90`,
  protected by the session cookie. Returns `{traffic, growth, leads, position}`;
  any field is `null` when that client has no mapped property or Google
  returned nothing — the dashboard renders that as "-", never a guess. A
  confirmed real `0` (property connected, genuinely no organic traffic that
  period) is returned as `0`, not `null`.

## Known limitations (by design, for this first step)

- No scheduled sync / historical database — every dashboard load calls GSC/GA4
  live, same as clicking "Sync" today. A background job + datastore was
  discussed as a later phase.
- GSC's data has a real ~2-3 day processing lag; very recent days may show
  less complete numbers.
- GA4 "leads" assumes each client's property has a conversion event configured
  that represents a lead — that's a per-client GA4 setup detail, not something
  this code can verify.
- Not deployed anywhere yet — this README covers local dev only. Deploying to
  your VPS (process manager, HTTPS, real redirect URI) is a separate step.
