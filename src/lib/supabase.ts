import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseKey =
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ??
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined);

export const supabaseConfigured =
  Boolean(supabaseUrl) &&
  supabaseUrl !== "https://your-project.supabase.co" &&
  Boolean(supabaseKey) &&
  supabaseKey !== "your-anon-key-here" &&
  supabaseKey !== "your-publishable-key-here";

export const supabase = supabaseConfigured
  ? createClient(supabaseUrl!, supabaseKey!)
  : null;
