# Your Project PRO licensing setup

PRO uses Supabase project `your-pro-supabase-project-ref` and your Stripe live-mode account:

```text
https://your-pro-supabase-project-ref.supabase.co
```

## Supabase project

Create or select the production Supabase project. The PRO deploy workflow reuses
the existing Supabase account token from PRE:

```text
SUPABASE_ACCESS_TOKEN
```

No PRO-specific Supabase deploy secret is required right now. No database
password is required here unless the Supabase CLI later asks for one.

`SUPABASE_PROJECT_REF_PRO` is the production project ref from the Supabase URL:

```text
https://your-pro-supabase-project-ref.supabase.co
```

## Stripe secrets

Do not commit Stripe secrets to the repository. Store them in the production Supabase project Edge Function secrets:

```bash
npx supabase@latest secrets set STRIPE_SECRET_KEY="sk_live_..." --project-ref your-pro-supabase-project-ref
npx supabase@latest secrets set STRIPE_WEBHOOK_SECRET="whsec_..." --project-ref your-pro-supabase-project-ref
```

## Deploy

Run:

```text
Actions -> Deploy Supabase PRO -> Run workflow
```

The workflow runs the equivalent of:

```bash
npx supabase@latest link --project-ref your-pro-supabase-project-ref
npx supabase@latest db push
npx supabase@latest functions deploy stripe-webhook --project-ref "<project-ref>"
npx supabase@latest functions deploy activate-license --project-ref "<project-ref>"
npx supabase@latest functions deploy validate-license --project-ref "<project-ref>"
```

## Stripe webhook

Create a live-mode Stripe webhook endpoint:

```text
https://your-pro-supabase-project-ref.supabase.co/functions/v1/stripe-webhook
```

Subscribe to:

```text
checkout.session.completed
```

The webhook creates or updates a license for the Checkout email.

## PRO app build

The GitHub release workflow configures PRO automatically before packaging release
artifacts. For a local PRO build, run:

```bash
YOUR_PROJECT_LICENSE_TARGET=pro npm run configure-license
npm run build:desktop
```

To restore the local PRE config after a PRO build, run:

```bash
npm run configure-license
```

## App behavior

- Trial starts on first local launch.
- Trial length is 30 days.
- License activation uses email only.
- Each license allows 2 active device activations.
- Active licenses are revalidated online every 7 days.
