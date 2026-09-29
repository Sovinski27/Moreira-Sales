import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  !supabaseUrl.includes('placeholder') &&
  !supabaseUrl.includes('seu-projeto') &&
  !supabaseUrl.includes('your-project') &&
  !supabaseAnonKey.includes('sua-chave') &&
  !supabaseAnonKey.includes('anon-key') &&
  supabaseUrl.startsWith('https://') &&
  supabaseAnonKey.startsWith('eyJ')
);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
