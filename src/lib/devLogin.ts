import { supabase } from "@/integrations/supabase/client";

// Injected by vite.config.ts, only while running the dev server and only when .env.local has the credentials
declare const __DEV_LOGIN__: { email: string; password: string } | null | undefined;

const LOCAL_HOSTS = ["localhost", "127.0.0.1", "[::1]"];

/**
 * Local development only: signs in with the account from `.env.local` so you don't have to log in
 * every time on localhost. Does nothing in production builds, on other hosts, or when the
 * credentials are not set. Returns true when a session exists afterwards.
 */
export async function ensureDevSession(): Promise<boolean> {
  // `import.meta.env.DEV` is replaced by `false` in production builds, which strips everything below.
  if (!import.meta.env.DEV) return false;
  if (typeof location === "undefined" || !LOCAL_HOSTS.includes(location.hostname)) return false;

  if (typeof __DEV_LOGIN__ === "undefined" || !__DEV_LOGIN__) return false;
  const { email, password } = __DEV_LOGIN__;

  const { data } = await supabase.auth.getSession();
  if (data.session) return true;

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    console.warn(`[dev-login] Automatisch inloggen mislukt: ${error.message}`);
    return false;
  }
  return true;
}
