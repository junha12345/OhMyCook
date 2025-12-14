const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey);
const SESSION_STORAGE_KEY = 'ohmycook-supabase-session';

type AuthEvent = 'SIGNED_IN' | 'SIGNED_OUT' | 'TOKEN_REFRESHED' | 'PASSWORD_RECOVERY';
export interface SupabaseAuthUser {
  id: string;
  email: string | null;
  user_metadata?: Record<string, unknown>;
}

export interface SupabaseSession {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  expires_at?: number;
  token_type?: string;
  user: SupabaseAuthUser;
}

interface AuthResponse {
  data: { session: SupabaseSession | null; user: SupabaseAuthUser | null };
  error: Error | null;
}

interface SessionResponse {
  data: { session: SupabaseSession | null };
  error: Error | null;
}

interface OAuthOptions {
  redirectTo?: string;
}

interface OAuthParams {
  provider: string;
  options?: OAuthOptions;
}

interface AuthChangeCallback {
  (event: AuthEvent, session: SupabaseSession | null): void;
}

function persistSession(session: SupabaseSession | null) {
  if (typeof localStorage === 'undefined') return;
  if (session) {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  } else {
    localStorage.removeItem(SESSION_STORAGE_KEY);
  }
}

function getStoredSession(): SupabaseSession | null {
  if (typeof localStorage === 'undefined') return null;
  const raw = localStorage.getItem(SESSION_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SupabaseSession;
  } catch {
    return null;
  }
}

async function toJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  return text ? (JSON.parse(text) as T) : ({} as T);
}

class SupabaseAuth {
  private listeners: Set<AuthChangeCallback> = new Set();

  onAuthStateChange(callback: AuthChangeCallback) {
    this.listeners.add(callback);
    return {
      data: {
        subscription: {
          unsubscribe: () => this.listeners.delete(callback),
        },
      },
    };
  }

  private notify(event: AuthEvent, session: SupabaseSession | null) {
    this.listeners.forEach((cb) => cb(event, session));
  }

  async getSession(): Promise<SessionResponse> {
    if (!hasSupabaseConfig) {
      return { data: { session: null }, error: new Error('Supabase is not configured.') };
    }
    return { data: { session: getStoredSession() }, error: null };
  }

  async signInWithPassword({
    email,
    password,
  }: {
    email: string;
    password: string;
  }): Promise<AuthResponse> {
    if (!hasSupabaseConfig) {
      return { data: { session: null, user: null }, error: new Error('Supabase is not configured.') };
    }

    const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: supabaseAnonKey!,
      },
      body: JSON.stringify({ email, password }),
    });

    const payload = await toJson<{ error?: { message: string }; access_token?: string; user?: SupabaseAuthUser }>(response);

    if (!response.ok || payload.error) {
      const message = payload.error?.message || 'Unable to sign in.';
      return { data: { session: null, user: null }, error: new Error(message) };
    }

    const session: SupabaseSession | null = payload.access_token && payload.user
      ? { access_token: payload.access_token, user: payload.user }
      : null;

    persistSession(session);
    if (session) this.notify('SIGNED_IN', session);

    return { data: { session, user: payload.user ?? null }, error: null };
  }

  async signUp({ email, password }: { email: string; password: string }): Promise<AuthResponse> {
    if (!hasSupabaseConfig) {
      return { data: { session: null, user: null }, error: new Error('Supabase is not configured.') };
    }

    const response = await fetch(`${supabaseUrl}/auth/v1/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: supabaseAnonKey!,
      },
      body: JSON.stringify({ email, password }),
    });

    const payload = await toJson<{ error?: { message: string }; session?: SupabaseSession; user?: SupabaseAuthUser }>(response);

    if (!response.ok || payload.error) {
      const message = payload.error?.message || 'Unable to sign up.';
      return { data: { session: null, user: null }, error: new Error(message) };
    }

    const session = payload.session ?? null;
    persistSession(session);
    if (session) this.notify('SIGNED_IN', session);

    return { data: { session, user: payload.user ?? payload.session?.user ?? null }, error: null };
  }

  async signOut(): Promise<{ error: Error | null }> {
    if (!hasSupabaseConfig) {
      persistSession(null);
      this.notify('SIGNED_OUT', null);
      return { error: null };
    }

    const session = getStoredSession();
    if (!session) {
      return { error: null };
    }

    await fetch(`${supabaseUrl}/auth/v1/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: supabaseAnonKey!,
        Authorization: `Bearer ${session.access_token}`,
      },
    }).catch(() => undefined);

    persistSession(null);
    this.notify('SIGNED_OUT', null);
    return { error: null };
  }

  async signInWithOAuth({ provider, options }: OAuthParams): Promise<{ data: { url?: string }; error: Error | null }> {
    if (!hasSupabaseConfig) {
      return { data: {}, error: new Error('Supabase is not configured.') };
    }

    const redirectTo = options?.redirectTo ?? (typeof window !== 'undefined' ? window.location.href : '');
    const url = `${supabaseUrl}/auth/v1/authorize?provider=${encodeURIComponent(provider)}&redirect_to=${encodeURIComponent(redirectTo)}`;

    if (typeof window !== 'undefined') {
      window.location.href = url;
    }

    return { data: { url }, error: null };
  }
}

const authClient = new SupabaseAuth();

export const supabase = {
  auth: authClient,
};

const restUrl = supabaseUrl ? `${supabaseUrl}/rest/v1` : '';

interface SupabaseRequestInit extends RequestInit {
  prefer?: string;
}

async function handleResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!response.ok) {
    const details = text || response.statusText;
    throw new Error(`Supabase request failed (${response.status}): ${details}`);
  }
  if (!text) {
    return undefined as T;
  }
  return JSON.parse(text) as T;
}

export async function supabaseRequest<T>(
  path: string,
  { prefer, headers, ...init }: SupabaseRequestInit = {},
): Promise<T> {
  if (!hasSupabaseConfig) {
    throw new Error('Supabase is not configured.');
  }

  const response = await fetch(`${restUrl}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      apikey: supabaseAnonKey!,
      Authorization: `Bearer ${supabaseAnonKey}`,
      ...(prefer ? { Prefer: prefer } : {}),
      ...headers,
    },
  });

  return handleResponse<T>(response);
}
