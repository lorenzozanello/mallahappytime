import 'server-only';

/**
 * Central, typed access to environment configuration (server only).
 * Secrets never leave this module except to server-side SDK clients.
 */
export const DEFAULT_HAPPY_MODEL = 'anthropic/claude-sonnet-5';
export const DEFAULT_EMBEDDING_MODEL = 'openai/text-embedding-3-small';

function env(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim() ? v.trim() : undefined;
}

export const config = {
  get supabaseUrl() {
    return env('NEXT_PUBLIC_SUPABASE_URL');
  },
  /** Public (anon / publishable) key. Safe for the browser; RLS enforces access. */
  get supabaseAnonKey() {
    return env('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY') ?? env('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  },
  get supabaseServiceRoleKey() {
    return env('SUPABASE_SERVICE_ROLE_KEY');
  },
  /** Explicit opt-in demo mode: local file storage + role picker, no real auth. */
  get demoMode() {
    return env('HAPPY_DEMO_MODE') === 'true';
  },
  get dataDir() {
    return env('HAPPY_DATA_DIR') ?? (process.env.VERCEL ? '/tmp/happy-demo' : '.data/demo');
  },
  get happyModel() {
    return env('HAPPY_MODEL') ?? DEFAULT_HAPPY_MODEL;
  },
  get embeddingModel() {
    return env('HAPPY_EMBEDDING_MODEL') ?? DEFAULT_EMBEDDING_MODEL;
  },
  /** Optional price per million tokens (USD) used to estimate cost in observability. */
  get costPerMTok(): { input: number; output: number } | null {
    const i = Number(env('HAPPY_COST_INPUT_PER_MTOK'));
    const o = Number(env('HAPPY_COST_OUTPUT_PER_MTOK'));
    return Number.isFinite(i) && Number.isFinite(o) && i > 0 && o > 0 ? { input: i, output: o } : null;
  },
  get aiGatewayConfigured() {
    return Boolean(env('AI_GATEWAY_API_KEY') || env('VERCEL_OIDC_TOKEN'));
  },
};

export function isSupabaseConfigured(): boolean {
  return Boolean(config.supabaseUrl && config.supabaseAnonKey);
}

export type BackendMode = 'supabase' | 'demo' | 'unconfigured';

export function backendMode(): BackendMode {
  if (config.demoMode) return 'demo';
  if (isSupabaseConfigured()) return 'supabase';
  return 'unconfigured';
}
