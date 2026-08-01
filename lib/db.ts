import 'server-only';
import { createClient } from '@supabase/supabase-js';
import ws from 'ws';

// Server-only client using the service role key (bypasses RLS — both tables
// deny anon everything). Lazily constructed so `next build` can import route
// modules in environments without env vars (the Docker build stage).
// The ws transport is required on Node 20, which lacks a native WebSocket
// global; realtime is never actually used.
type ClientOptions = NonNullable<Parameters<typeof createClient>[2]>;
type RealtimeTransport = NonNullable<ClientOptions['realtime']>['transport'];

function makeClient() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
    {
      db: { schema: 'brozoflix' },
      auth: { persistSession: false, autoRefreshToken: false },
      realtime: { transport: ws as unknown as RealtimeTransport },
    }
  );
}

type BrozoflixClient = ReturnType<typeof makeClient>;

let client: BrozoflixClient | undefined;

function getDb(): BrozoflixClient {
  if (!client) client = makeClient();
  return client;
}

export const db = new Proxy({} as BrozoflixClient, {
  get(_target, prop) {
    const value = Reflect.get(getDb(), prop);
    return typeof value === 'function' ? value.bind(getDb()) : value;
  },
});
