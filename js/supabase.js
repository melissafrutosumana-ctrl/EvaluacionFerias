import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const localConfig = globalThis.__ENV__ ?? {};

async function loadSupabaseConfig() {
  if (localConfig.SUPABASE_URL && (localConfig.SUPABASE_PUBLISHABLE_KEY || localConfig.SUPABASE_KEY)) {
    return localConfig;
  }

  const response = await fetch("/api/config", {
    headers: { Accept: "application/json" },
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error("No se pudo cargar la configuración de Supabase.");
  }

  return response.json();
}

const config = await loadSupabaseConfig();
const SUPABASE_URL = config.SUPABASE_URL;
const SUPABASE_KEY = config.SUPABASE_PUBLISHABLE_KEY ?? config.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error("Faltan SUPABASE_URL o SUPABASE_PUBLISHABLE_KEY.");
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
