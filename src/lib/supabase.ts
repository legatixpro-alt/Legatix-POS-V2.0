import { createClient } from '@supabase/supabase-js';

// Sanitize the Supabase URL in case REST endpoint (/rest/v1) or trailing slash was provided
function getSanitizedSupabaseUrl(url?: string): string {
  if (!url) return '';
  let cleaned = url.trim();
  // Strip /rest/v1 or /rest/v1/ from the URL
  cleaned = cleaned.replace(/\/rest\/v1\/?$/i, '');
  // Strip trailing slashes
  cleaned = cleaned.replace(/\/+$/, '');
  return cleaned;
}

const rawSupabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseUrl = getSanitizedSupabaseUrl(rawSupabaseUrl);
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl !== 'YOUR_SUPABASE_URL' &&
  !supabaseUrl.includes('placeholder')
);

// Reachability & Circuit Breaker to handle unreachable / offline cloud instances gracefully
let isCloudReachable = true;
let lastFailureTimestamp = 0;
const RETRY_COOLDOWN_MS = 30000; // Wait 30s before attempting cloud requests again after network failure

export function isCloudAvailable(): boolean {
  if (!isSupabaseConfigured) return false;
  if (!isCloudReachable && Date.now() - lastFailureTimestamp < RETRY_COOLDOWN_MS) {
    return false;
  }
  return true;
}

export function markCloudFailed(): void {
  isCloudReachable = false;
  lastFailureTimestamp = Date.now();
}

export function markCloudSuccess(): void {
  isCloudReachable = true;
}

if (!isSupabaseConfigured) {
  console.warn(
    'Variables de entorno de Supabase no configuradas. El sistema operará en Modo Local Offline de alta disponibilidad.'
  );
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  }
);
