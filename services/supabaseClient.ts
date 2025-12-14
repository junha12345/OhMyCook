import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase environment variables. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
}

// Create a client even if keys are missing to prevent crash, but auth calls will fail.
// Supabase might complain about empty URL, so we protect it.
export const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseAnonKey || 'placeholder');


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
