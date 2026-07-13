import { json, normalizeDeviceId, normalizeEmail } from "../_shared/json.ts";
import { adminClient } from "../_shared/supabase.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return json({ ok: true });
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);

  const payload = await req.json().catch(() => ({}));
  const email = normalizeEmail(payload.email);
  const deviceId = normalizeDeviceId(payload.deviceId);

  if (!email) return json({ ok: false, error: "email_required" }, 400);
  if (!deviceId) return json({ ok: false, error: "device_id_required" }, 400);

  const supabase = adminClient();
  const { data: license, error: licenseError } = await supabase
    .from("licenses")
    .select("id,email,status,max_activations")
    .eq("email", email)
    .eq("status", "active")
    .maybeSingle();

  if (licenseError) return json({ ok: false, error: "license_lookup_failed" }, 500);
  if (!license) return json({ ok: false, error: "license_not_found" }, 404);

  const { data: activation, error: activationError } = await supabase
    .from("license_activations")
    .select("id,status,license_id,activated_at")
    .eq("license_id", license.id)
    .eq("device_id", deviceId)
    .eq("status", "active")
    .maybeSingle();

  if (activationError) return json({ ok: false, error: "activation_lookup_failed" }, 500);
  if (!activation) return json({ ok: false, error: "activation_not_found" }, 404);

  const { count: activeDevices, error: countError } = await supabase
    .from("license_activations")
    .select("id", { count: "exact", head: true })
    .eq("license_id", license.id)
    .eq("status", "active");

  if (countError) return json({ ok: false, error: "activation_count_failed" }, 500);

  const validatedAt = new Date().toISOString();
  const { error: updateError } = await supabase
    .from("license_activations")
    .update({ last_validated_at: validatedAt })
    .eq("id", activation.id);

  if (updateError) return json({ ok: false, error: "activation_update_failed" }, 500);

  return json({
    ok: true,
    email,
    status: license.status,
    activationId: activation.id,
    licenseId: activation.license_id,
    maxActivations: license.max_activations,
    activeDevices: activeDevices || 0,
    validatedAt,
    activatedAt: activation.activated_at,
  });
});
