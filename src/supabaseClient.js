import { createClient } from '@supabase/supabase-js';

// Reads the keys you saved in your .env.local file
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Initializes and exports the Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);