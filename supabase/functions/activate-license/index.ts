import { json, normalizeDeviceId, normalizeEmail } from "../_shared/json.ts";
import { adminClient } from "../_shared/supabase.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return json({ ok: true });
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);

  const payload = await req.json().catch(() => ({}));
  const email = normalizeEmail(payload.email);
  const deviceId = normalizeDeviceId(payload.deviceId);
  const appVersion = String(payload.appVersion || "").trim();

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

  const { data: existing, error: existingError } = await supabase
    .from("license_activations")
    .select("id,status,license_id,activated_at")
    .eq("license_id", license.id)
    .eq("device_id", deviceId)
    .maybeSingle();

  if (existingError) return json({ ok: false, error: "activation_lookup_failed" }, 500);

  const { count: activeCount, error: countError } = await supabase
    .from("license_activations")
    .select("id", { count: "exact", head: true })
    .eq("license_id", license.id)
    .eq("status", "active");

  if (countError) return json({ ok: false, error: "activation_count_failed" }, 500);

  if (existing?.status === "active") {
    const { error } = await supabase
      .from("license_activations")
      .update({
        app_version: appVersion,
        last_validated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);

    if (error) return json({ ok: false, error: "activation_update_failed" }, 500);

    return json({
      ok: true,
      email,
      status: "active",
      activationId: existing.id,
      licenseId: existing.license_id,
      maxActivations: license.max_activations,
      activeDevices: activeCount || 0,
      validatedAt: new Date().toISOString(),
      activatedAt: existing.activated_at,
    });
  }

  if ((activeCount || 0) >= license.max_activations) {
    return json({ ok: false, error: "activation_limit_reached" }, 409);
  }

  const { data: activation, error: insertError } = await supabase
    .from("license_activations")
    .insert({
      license_id: license.id,
      device_id: deviceId,
      status: "active",
      app_version: appVersion,
    })
    .select("id,license_id,activated_at")
    .single();

  if (insertError) return json({ ok: false, error: "activation_create_failed" }, 500);

  return json({
    ok: true,
    email,
    status: "active",
    activationId: activation.id,
    licenseId: activation.license_id,
    maxActivations: license.max_activations,
    activeDevices: (activeCount || 0) + 1,
    validatedAt: new Date().toISOString(),
    activatedAt: activation.activated_at,
  });
});
