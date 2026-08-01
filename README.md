# Brozoflix

Private catalog PWA for the home Jellyfin server. Answers one question fast:
**do I already have this movie?** Family can request additions on `/wanted`.

Full spec in [BROZOFLIX_SPEC.md](./BROZOFLIX_SPEC.md).

## Dev

```sh
npm install
npm run dev
```

Needs `.env.local` with `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `TMDB_TOKEN`,
`APP_PASSPHRASE`, `COOKIE_SECRET`, and optionally `ADMIN_PASSPHRASE`.
Unlocking with the admin passphrase mints a cookie with an admin flag, which
enables decline/restore/delete controls on `/wanted`; without the env var set
nobody gets admin. The database (schema `brozoflix` on the self-hosted
Supabase) already exists; the app never migrates or seeds it.

## Deploy to the NAS

```sh
docker compose up -d --build
```

The compose file reads `.env.local` as the container env (secrets are never
baked into the image — `.dockerignore` excludes all `.env*`). The app listens
on port 3000; expose it via Tailscale Funnel. Cookies set themselves `Secure`
automatically when the request arrives over https (`x-forwarded-proto`).

## Notes

- All data access is server-side with the service role key; RLS denies anon
  everything, and the middleware gates every route behind the passphrase
  cookie (HMAC-signed, 1-year expiry).
- `brozoflix.titles` is read-only to the app; the nightly sync owns it and
  flips request rows to `added` when a wanted title lands.
- The service worker caches only the static shell (never catalog data), so
  the app installs to a phone home screen but the library is always fresh.
