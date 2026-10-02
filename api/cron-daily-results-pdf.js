import { timingSafeEqual } from "node:crypto";
import { retryPendingDailyResultsArchives } from "../server/daily-results-archive.js";

export const maxDuration = 300;

export default async function handler(request, response) {
  response.setHeader("Cache-Control", "no-store");
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    response.status(405).json({ error: "Método no permitido." });
    return;
  }

  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    response.status(503).json({ error: "El cron de recuperación no está configurado." });
    return;
  }
  const expected = Buffer.from(`Bearer ${cronSecret}`);
  const supplied = Buffer.from(String(request.headers.authorization ?? ""));
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) {
    response.status(401).json({ error: "No autorizado." });
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!supabaseUrl || !secretKey?.startsWith("sb_secret_")) {
    response.status(503).json({ error: "El acceso seguro a Supabase no está configurado." });
    return;
  }

  try {
    const result = await retryPendingDailyResultsArchives({ supabaseUrl, secretKey });
    response.status(200).json(result);
  } catch {
    response.status(502).json({ error: "No se pudo ejecutar la recuperación del archivo diario." });
  }
}
