import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { Database } from "./database.types";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

/** Cliente com a sessão do usuário (cookies). Use em Server Actions e componentes dinâmicos. */
export async function createSupabase() {
  const store = await cookies();
  return createServerClient<Database>(URL, KEY, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // chamado durante render de Server Component: o proxy já renova a sessão
        }
      },
    },
  });
}

/** Cliente anônimo, sem cookies: seguro dentro de `"use cache"` para leituras públicas. */
export function createPublicSupabase() {
  return createClient<Database>(URL, KEY, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function getUser() {
  const supabase = await createSupabase();
  const { data } = await supabase.auth.getUser();
  return { supabase, user: data.user };
}
