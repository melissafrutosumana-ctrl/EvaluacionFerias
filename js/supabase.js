import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

// ponytail: sb_publishable es clave publica (anon) diseñada para frontend; se permite hardcodeada.
// Override via window.__ENV__ para tests/staging sin tocar codigo.
const SUPABASE_URL = globalThis.__ENV__?.SUPABASE_URL ?? "https://teowjdhfitfeoavehdhi.supabase.co";
const SUPABASE_KEY = globalThis.__ENV__?.SUPABASE_KEY ?? "sb_publishable_iOmo1H98U8K0hEtbk3VbLw_yDun3juD";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
