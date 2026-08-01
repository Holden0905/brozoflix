# Brozoflix — Build Spec

A private catalog PWA for a home Jellyfin server. Answers one question fast: **do I already have this movie?** Secondary job: let family request things to add.

The database is already built and populated. Do not create migrations or seed data. Build the app against what exists.

---

## Stack

Next.js 15 (App Router) · TypeScript · Tailwind · shadcn/ui · `@supabase/supabase-js`

Deployed as a Docker container on a home NAS, exposed via Tailscale Funnel. Not Vercel.

---

## Data layer

Self-hosted Supabase. All Brozoflix tables live in the **`brozoflix` schema**, not `public` (the `public` schema belongs to a different app — do not touch it).

Client construction — the `.schema()` call is required on every query:

```ts
import { createClient } from '@supabase/supabase-js';

export const db = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  { db: { schema: 'brozoflix' } }
);
```

### `brozoflix.titles` — what we own (231 rows, read-only to the app)

| column | type | notes |
|---|---|---|
| `jellyfin_id` | text PK | |
| `media_type` | text | `'movie'` \| `'show'` |
| `tmdb_id` | int | not null |
| `imdb_id` | text | |
| `title` | text | |
| `year` | int | |
| `runtime_min` | int | movies only in practice |
| `overview` | text | |
| `poster_path` | text | TMDB path, e.g. `/8WLGwhpJWaSu8W8geauaaWpJC8A.jpg` |
| `backdrop_path` | text | |
| `genres` | text[] | |
| `episode_count` | int | shows only |
| `seasons` | int[] | shows only, e.g. `{1,2,3,4,5,6}` |
| `date_added` | timestamptz | when it landed on the server |
| `synced_at` | timestamptz | |

A cron job rewrites this table nightly. The app never writes to it.

### `brozoflix.requests` — what we want

| column | type | notes |
|---|---|---|
| `id` | uuid PK | defaults to `gen_random_uuid()` |
| `media_type` | text | `'movie'` \| `'show'` |
| `tmdb_id` | int | not null |
| `title` | text | |
| `year` | int | |
| `poster_path` | text | |
| `requested_by` | text | free-text name, not null |
| `note` | text | optional |
| `status` | text | `'requested'` \| `'added'` \| `'declined'`, defaults `'requested'` |
| `created_at` | timestamptz | |

`unique (media_type, tmdb_id)` — two people requesting the same film collide by design. Catch the 23505 and append to `note` rather than erroring at the user.

The nightly sync flips `requested` → `added` automatically when a requested `tmdb_id` shows up in `titles`. The app doesn't need to do this.

### Images

`https://image.tmdb.org/t/p/w500{poster_path}` for grid tiles, `w780` for detail, `original` for backdrops. Add `image.tmdb.org` to `next.config.js` remote patterns.

---

## Security model

RLS is enabled on both tables with **no policies** — anon is denied everything. The service role key bypasses RLS and lives server-side only.

Consequences, which are not optional:

- Never expose `SUPABASE_SERVICE_KEY` to the browser. No `NEXT_PUBLIC_` prefix on it.
- No client-side supabase calls. All data access happens in Server Components or Route Handlers.
- The TMDB token is likewise server-only. Client-side search goes through `/api/tmdb/search`.

### Passphrase gate

Everything behind a single shared passphrase. This is not auth — there are no user accounts, and `requested_by` is honor-system.

- `middleware.ts` checks a signed httpOnly cookie. Redirects to `/unlock` when absent.
- Exempt: `/unlock`, `/api/unlock`, `/manifest.json`, `/icons/*`, `/_next/*`.
- `/api/unlock` compares against `APP_PASSPHRASE` env var, sets cookie on match, 1-year expiry.
- Sign the cookie with `COOKIE_SECRET` (HMAC) so it can't be forged by setting a value.
- Wrong passphrase: don't say "incorrect password" in a way that implies retry limits — there are none. Just say the passphrase didn't match.

---

## Routes

| path | what |
|---|---|
| `/` | The library. Grid of everything owned. |
| `/title/[jellyfin_id]` | Detail: backdrop, overview, genres, runtime or season list. |
| `/wanted` | Request list, newest first, with the add flow. |
| `/unlock` | Passphrase entry. |
| `/api/tmdb/search` | Server-side TMDB proxy. Query param `q`, returns movie + tv results merged. |
| `/api/requests` | POST creates a request. Validate: name 1–40 chars, tmdb_id is an int, note ≤ 200 chars. |

### The library page

The core interaction is *scan and search*, not browse-for-discovery. Someone is standing in a store with a Blu-ray in their hand.

- Instant client-side filter as you type — 231 rows is nothing, load them all and filter in memory. No debounce, no server round-trip, no loading state.
- Toggle: All / Movies / Shows.
- Sort: recently added (default), title, year.
- Show the count somewhere. "231 titles" is genuinely useful information.
- Shows display their season coverage, because "do I have season 4" is a real question. `Community · Seasons 1–6` reads better than `6 seasons`.

### The wanted page

- Search box hits `/api/tmdb/search`, shows poster results with year so you pick the right *Force of Evil*.
- Pick one → name field (persist the last-used name in localStorage so nobody types it twice) → optional note → submit.
- Requests already satisfied show as `added` with a visual distinction. Don't hide them; the satisfaction of watching one flip is half the point.
- If a search result is already in `titles`, mark it clearly in the results list before they request it. This is the single most valuable interaction in the app.

---

## Design direction

**Black, white, and red.** Clean. That constraint is fixed — spend your creative effort inside it, not on expanding the palette.

Notes on that:

- Red is a scalpel, not a wash. It marks *one* class of thing. Suggested: red means "you already have this" — the checkmark on a search result, the owned-badge. That makes the palette carry meaning rather than decorate.
- Posters bring their own riot of color. The chrome around them should be quiet enough to let a 231-tile grid not look like a ransom note. Near-black background, generous gutters.
- Avoid the Netflix homage. Horizontal carousels of category rows are the obvious move and the wrong one — this is a *lookup tool*, and a dense uniform grid serves that better than rows you have to scroll sideways through.
- Type: pick a display face with actual personality for the wordmark and headers, something with a body face that stays legible at caption size for year/runtime metadata. Don't ship default system sans everywhere.
- Empty search results are a moment, not an error. "Nothing here — want to request it?" with a link to `/wanted` closes the loop.

Quality floor, unannounced: responsive to phone width, visible keyboard focus, `prefers-reduced-motion` respected, poster images lazy-loaded with a neutral placeholder so the grid doesn't pop.

---

## PWA

- `app/manifest.ts` — name "Brozoflix", short_name "Brozoflix", `display: 'standalone'`, black theme color, 192px and 512px maskable icons.
- Minimal service worker for installability and a cached app shell. Do not aggressively cache the title data — a stale catalog defeats the purpose.
- Verify it installs to an iPhone home screen and opens without browser chrome. That's the delivery target.

---

## Environment

`.env.local` for dev, passed as container env in production:

```
SUPABASE_URL=http://192.168.4.184:8000
SUPABASE_SERVICE_KEY=   # service_role JWT
TMDB_TOKEN=             # v4 read access token, Bearer auth
APP_PASSPHRASE=
COOKIE_SECRET=          # any long random string
```

---

## Containerizing

Multi-stage Dockerfile, `output: 'standalone'` in `next.config.js`, node:20-alpine runner, non-root user, expose 3000. A `docker-compose.yml` alongside it with `restart: unless-stopped` and an `env_file`.

Note: the NAS runs UGOS, which keeps Docker's data-root at `/volume1/@docker` via `/etc/docker/daemon.json`. Do not generate anything that rewrites that file. Do not set a custom address pool.

---

## Build order

1. Scaffold, env, supabase client, confirm you can read 231 rows from `brozoflix.titles`
2. Passphrase gate + middleware
3. Library page — grid, filter, sort
4. Detail page
5. TMDB proxy + wanted page
6. PWA manifest + service worker
7. Dockerfile + compose

Work through it end to end. Don't stop to ask about design choices — make them and note what you decided. Do stop if something contradicts this spec, because that means one of us is wrong about the database.
