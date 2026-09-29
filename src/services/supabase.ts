import { createClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = 'https://emntnubnwgnwnvnznsrb.supabase.co';
const DEFAULT_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtbnRudWJud2dud252bnpuc3JiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAwMTk2MTcsImV4cCI6MjEwNTU5NTYxN30.z-KZnzPyQ7wR_czheD3PkCwM33SdwzgTcZrKASF9mCA';

const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_KEY;

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
