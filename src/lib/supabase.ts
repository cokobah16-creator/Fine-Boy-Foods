import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabaseConfigured =
  Boolean(supabaseUrl) &&
  supabaseUrl !== "https://your-project.supabase.co" &&
  Boolean(supabaseAnonKey) &&
  supabaseAnonKey !== "your-anon-key-here";

export const supabase = supabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!)
  : null;
