import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const SUPABASE_URL = "https://teowjdhfitfeoavehdhi.supabase.co";
const SUPABASE_KEY = "sb_publishable_iOmo1H98U8K0hEtbk3VbLw_yDun3juD";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
