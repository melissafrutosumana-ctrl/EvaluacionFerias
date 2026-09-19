export default function handler(_request, response) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabasePublishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabasePublishableKey) {
    response.status(500).json({ error: "Falta la configuración pública de Supabase." });
    return;
  }

  response.setHeader("Cache-Control", "no-store");
  response.status(200).json({
    SUPABASE_URL: supabaseUrl,
    SUPABASE_PUBLISHABLE_KEY: supabasePublishableKey
  });
}
