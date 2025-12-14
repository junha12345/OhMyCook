const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const authUrl = supabaseUrl && supabaseAnonKey ? `${supabaseUrl}/auth/v1` : null;

export const isSupabaseConfigured = Boolean(authUrl && supabaseAnonKey);

const ensureConfigured = () => {
  if (!authUrl || !supabaseAnonKey) {
    console.warn(
      'Supabase environment variables are missing. Google sign-in will be disabled until VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are configured.',
    );
    return false;
  }
  return true;
};

export interface SupabaseUserInfo {
  id: string;
  email: string;
  provider?: string;
}

export interface AuthSession {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  tokenType?: string;
  user?: SupabaseUserInfo;
}

function parseHashFragment(fragment: string): Record<string, string> {
  return fragment
    .replace(/^#/, '')
    .split('&')
    .map((pair) => pair.split('=').map(decodeURIComponent))
    .reduce<Record<string, string>>((acc, [key, value]) => {
      if (key) acc[key] = value ?? '';
      return acc;
    }, {});
}

async function fetchSupabaseUser(accessToken: string): Promise<SupabaseUserInfo | null> {
  if (!ensureConfigured()) return null;

  const response = await fetch(`${authUrl}/user`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      apikey: supabaseAnonKey,
    },
  });

  if (!response.ok) return null;
  const { user } = await response.json();
  if (!user?.id || !user?.email) return null;
  return {
    id: user.id,
    email: user.email,
    provider: user.app_metadata?.provider,
  };
}

export async function consumeSessionFromHash(): Promise<AuthSession | null> {
  if (!ensureConfigured()) return null;

  if (!window?.location?.hash) return null;
  const params = parseHashFragment(window.location.hash);
  const accessToken = params.access_token;
  if (!accessToken) return null;

  const refreshToken = params.refresh_token;
  const expiresIn = params.expires_in ? Number(params.expires_in) : undefined;
  const expiresAt = expiresIn ? Math.floor(Date.now() / 1000) + expiresIn : undefined;

  const user = await fetchSupabaseUser(accessToken);

  // Clear the hash fragment to avoid re-processing on navigation
  window.history.replaceState({}, document.title, window.location.pathname + window.location.search);

  return {
    accessToken,
    refreshToken,
    expiresAt,
    tokenType: params.token_type,
    user: user ?? undefined,
  };
}

export async function ensureValidSession(existing: AuthSession | null): Promise<AuthSession | null> {
  if (!existing) return null;
  const now = Math.floor(Date.now() / 1000);
  if (existing.expiresAt && existing.expiresAt - 60 <= now && existing.refreshToken) {
    const refreshed = await refreshSession(existing.refreshToken);
    return refreshed ?? null;
  }
  return existing;
}

export async function refreshSession(refreshToken: string): Promise<AuthSession | null> {
  if (!ensureConfigured()) return null;

  const response = await fetch(`${authUrl}/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: supabaseAnonKey,
    },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!response.ok) return null;
  const data = await response.json();
  const expiresAt = data.expires_in ? Math.floor(Date.now() / 1000) + data.expires_in : undefined;
  const user = data.user?.id && data.user?.email ? { id: data.user.id, email: data.user.email, provider: data.user.app_metadata?.provider } : undefined;
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? refreshToken,
    expiresAt,
    tokenType: data.token_type,
    user,
  };
}

export function startGoogleSignIn(redirectTo?: string) {
  if (!ensureConfigured()) return;

  const redirectUrl = redirectTo ?? window.location.href;
  const url = `${authUrl}/authorize?provider=google&redirect_to=${encodeURIComponent(redirectUrl)}`;
  window.location.href = url;
}

export async function signOut(accessToken?: string) {
  if (!ensureConfigured()) return;

  if (!accessToken) return;
  await fetch(`${authUrl}/logout`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      apikey: supabaseAnonKey,
    },
  });
}
