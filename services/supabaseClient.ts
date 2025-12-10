const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
}

const restUrl = `${supabaseUrl}/rest/v1`;

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
