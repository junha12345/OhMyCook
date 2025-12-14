const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  console.warn(
    '[Supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Supabase features are disabled; data will stay local only.',
  );
}

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
  if (!isSupabaseConfigured) {
    console.warn('[Supabase] Skipping request because Supabase is not configured:', path);
    return undefined as T;
  }

  const response = await fetch(`${restUrl}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${supabaseAnonKey}`,
      ...(prefer ? { Prefer: prefer } : {}),
      ...headers,
    },
  });

  return handleResponse<T>(response);
}
