import Stripe from "npm:stripe@17.5.0";
import { json, normalizeEmail } from "../_shared/json.ts";
import { adminClient } from "../_shared/supabase.ts";

const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

if (!stripeSecretKey) throw new Error("missing_stripe_secret_key");
if (!webhookSecret) throw new Error("missing_stripe_webhook_secret");

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: "2024-12-18.acacia",
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return json({ ok: true });
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);

  const signature = req.headers.get("stripe-signature");
  if (!signature) return json({ ok: false, error: "missing_stripe_signature" }, 400);

  const body = await req.text();
  let event: Stripe.Event;

  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (error) {
    return json({ ok: false, error: `webhook_error: ${error.message}` }, 400);
  }

  if (event.type !== "checkout.session.completed") {
    return json({ ok: true, ignored: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const email = normalizeEmail(session.customer_details?.email || session.customer_email);
  if (!email) return json({ ok: false, error: "checkout_session_missing_email" }, 400);

  const supabase = adminClient();
  const { error } = await supabase
    .from("licenses")
    .upsert({
      email,
      status: "active",
      max_activations: 2,
      stripe_customer_id: typeof session.customer === "string" ? session.customer : null,
      stripe_payment_link_id: typeof session.payment_link === "string" ? session.payment_link : null,
      stripe_session_id: session.id,
    }, {
      onConflict: "email",
    });

  if (error) {
    console.error("[stripe-webhook]", error);
    return json({ ok: false, error: "license_upsert_failed" }, 500);
  }

  return json({ ok: true });
});
