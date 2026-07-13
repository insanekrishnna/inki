import { createClient } from "npm:@supabase/supabase-js@2.45.6";

export function adminClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey =
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
    Deno.env.get("SUPABASE_SECRET_KEY") ||
    serviceRoleKeyFromJson(Deno.env.get("SUPABASE_SECRET_KEYS"));
  if (!url || !serviceRoleKey) throw new Error("missing_supabase_admin_env");

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function serviceRoleKeyFromJson(raw: string | undefined) {
  if (!raw) return "";
  try {
    const parsed = JSON.parse(raw);
    return parsed.service_role || parsed.service_role_key || parsed.secret || "";
  } catch {
    return "";
  }
}
