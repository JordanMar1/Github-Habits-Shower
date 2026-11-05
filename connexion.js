import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm";

const SUPABASE_URL = "https://llasqbqgzeubacmbvspx.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_kQ0ntBYRQJGtKG6Kw8wWUg_WIs4GxFi";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export function login() {
  return supabase.auth.signInWithOAuth({
    provider: "github",
    options: {
      scopes: "read:user",
      redirectTo: location.origin + location.pathname,
    },
  });
}

export function logout() {
  return supabase.auth.signOut();
}
