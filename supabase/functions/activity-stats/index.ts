import { json } from "../_shared/json.ts";
import { adminClient } from "../_shared/supabase.ts";

const METRICS = new Set(["captures", "images"]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return json({ ok: true });
  if (req.method === "GET") return readStats();
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);

  const payload = await req.json().catch(() => ({}));
  const metric = String(payload.metric || "").trim();
  if (!METRICS.has(metric)) return json({ ok: false, error: "invalid_metric" }, 400);

  const supabase = adminClient();
  const { error } = await supabase.rpc("increment_app_activity_stat", { metric_name: metric });
  if (error) return json({ ok: false, error: "increment_failed" }, 500);

  return readStats(supabase);
});

async function readStats(existingClient?: ReturnType<typeof adminClient>) {
  const supabase = existingClient || adminClient();
  const { data, error } = await supabase
    .from("app_activity_stats")
    .select("metric,value")
    .in("metric", Array.from(METRICS));

  if (error) return json({ ok: false, error: "stats_lookup_failed" }, 500);

  const stats = { captures: 0, images: 0 };
  for (const row of data || []) {
    if (row.metric === "captures") stats.captures = Number(row.value) || 0;
    if (row.metric === "images") stats.images = Number(row.value) || 0;
  }

  return json({ ok: true, stats });
}
