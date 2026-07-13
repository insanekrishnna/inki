export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
      "access-control-allow-methods": "POST, OPTIONS",
    },
  });
}

export function normalizeEmail(email: unknown) {
  return String(email || "").trim().toLowerCase();
}

export function normalizeDeviceId(deviceId: unknown) {
  return String(deviceId || "").trim();
}
