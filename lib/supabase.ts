import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const supabaseKey =
  process.env
    .NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env
    .NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error(
    "Не найден NEXT_PUBLIC_SUPABASE_URL в .env.local",
  );
}

if (!supabaseKey) {
  throw new Error(
    "Не найден публичный ключ Supabase в .env.local",
  );
}

export const supabase = createClient(
  supabaseUrl,
  supabaseKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
);