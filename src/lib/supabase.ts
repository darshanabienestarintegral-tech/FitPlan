import { createClient } from '@supabase/supabase-js';

// Retrieve credentials from Vite env or localStorage override
const envUrl = (typeof import.meta !== 'undefined' && import.meta?.env?.VITE_SUPABASE_URL) || '';
const envAnonKey = (typeof import.meta !== 'undefined' && import.meta?.env?.VITE_SUPABASE_ANON_KEY) || '';

// Fallback check: Can also be saved in localStorage by the user from settings
const storedUrl = typeof window !== 'undefined' ? localStorage.getItem('fitplan_supabase_url') || '' : '';
const storedAnonKey = typeof window !== 'undefined' ? localStorage.getItem('fitplan_supabase_anon_key') || '' : '';

export const supabaseUrl = envUrl || storedUrl || 'https://fitplan-demo.supabase.co';
export const supabaseAnonKey = envAnonKey || storedAnonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.demo';

export const isSupabaseConfigured = Boolean(
  (envUrl && envAnonKey) || (storedUrl && storedAnonKey)
);

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
