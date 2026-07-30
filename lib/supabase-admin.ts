import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

const supabaseSecretKey =
  process.env.SUPABASE_SECRET_KEY ??
  process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error(
    "Переменная NEXT_PUBLIC_SUPABASE_URL отсутствует в .env.local.",
  );
}

if (!supabaseSecretKey) {
  throw new Error(
    "Добавьте SUPABASE_SECRET_KEY или SUPABASE_SERVICE_ROLE_KEY в .env.local.",
  );
}

export const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseSecretKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  },
);