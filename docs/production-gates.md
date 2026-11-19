# Production activation status

## Stripe

There is no application-level legal authorization switch. Checkout uses the one configured Stripe secret, rejects mismatched modes, and permits Live checkout only on Vercel Production. The production gate requires a matching publishable key, webhook signing secret, and monthly Price ID. Prices are retrieved at request time and validated as active recurring EUR prices in the correct mode; the yearly plan must be €29.99 per year.

The local `.env.local` has a Test-mode secret key and no publishable key. A webhook signing secret is present, but its mode cannot be determined from its value or `whsec_` prefix. Read-only Stripe API checks confirmed the configured Test monthly Price is active at €2.99/month and the Test yearly Price is active at €29.99/year. No Live secret, Live publishable key, Live Prices, or production webhook secret were available locally.

Configure these values in Vercel **Production** from the same Live Stripe account:

- `STRIPE_SECRET_KEY` — Live secret key (`sk_live_...`), Secret.
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — matching Live publishable key (`pk_live_...`), Config.
- `STRIPE_WEBHOOK_SECRET` — signing secret for `https://www.snaptextai.app/api/stripe/webhook`, Secret.
- `STRIPE_PRO_PRICE_ID` — active recurring monthly EUR Live Price ID.
- `STRIPE_YEARLY_PRICE_ID` — active recurring yearly EUR Live Price ID for €29.99.
- `NEXT_PUBLIC_SITE_URL` — `https://www.snaptextai.app`.

The production webhook should subscribe to `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, and `invoice.payment_failed`. The handler verifies the raw body signature, claims event IDs in `stripe_webhook_events`, retrieves current Stripe subscription state, and upserts by `user_id`.

Checkout creates and reuses one Stripe Customer per authenticated Supabase user. Do not send Live keys or Live Price IDs to Preview or Development. The browser publishable key is not used to create hosted Checkout Sessions, but the application requires it to match the server key before enabling paid checkout.

## Supabase

Read-only checks against the linked `snaptext-ai` project confirmed the application tables `subscriptions`, `stripe_webhook_events`, `tool_history`, `extractions`, and `tool_usage_events`, plus Storage buckets `tool-history` and `document-analyzer`. The `subscriptions` table has the fields consumed by the webhook and dashboard. The direct REST checks used the privileged key and therefore do not prove that Row Level Security policies are correct; those policies still need inspection in Supabase SQL/Studio.

Email sign-ups are enabled in the linked project, but `mailer_autoconfirm` is true, so sign-ups do not currently require email verification. The repository's Supabase development config now enables confirmation; production still needs email confirmation and a verified SMTP provider configured in Supabase Auth. Verify the production callback allowlist includes `https://www.snaptextai.app/auth/callback` and the appropriate local/Preview URLs.

No database reset or existing data deletion was run. The additive `contact_rate_limits` migration is applied to the linked production project and recorded in its migration history. A production smoke check confirmed the service-role RPC works, removed its random test row, and confirmed anonymous reads are denied. The migration enables RLS, grants no user-facing access, and exposes only a service-role rate-limit RPC.

## Contact form and storage retention

The bilingual contact form sends messages to `ishakdev99@gmail.com` through Resend. It requires `RESEND_API_KEY` (Secret) and `CONTACT_FROM_EMAIL` (a sender on a verified domain) in Vercel Production. The form also requires the contact rate-limit migration. Delivery has not been tested because no Resend credentials or verified sender are configured; the site must not claim that form delivery is operational until a real message is received.

`vercel.json` schedules `/api/cron/expire-uploads` daily at 02:17 UTC. Set `CRON_SECRET` (Secret) in Vercel Production. The route removes objects older than seven days from the two confirmed buckets and clears matching `tool_history.storage_path` values. Confirm the linked project's Storage policies before enabling the schedule.

## Analytics

The source installs the GTM container once, only after analytics consent, and queues Consent Mode v2 before loading it. It emits one `page_view` per route path. In GTM, use Measurement ID `G-VMW2LFYHQ5`, disable automatic page views on the Google tag, and map the app's custom `page_view` event. The GTM workspace, published container, GA4 destination, and DebugView have not been inspected; verify them in Tag Assistant/GA4 before treating analytics delivery as confirmed.

## Public information

The public pages use the supplied SnapTextAI brand, individual-business status, correspondence address, telephone number, and support/privacy email. The address is explicitly described as the owner's domicile for correspondence, not as business premises. No VAT, SIREN, SIRET, or company number has been invented or published. The owner's full legal name is still needed: official French guidance specifies a person's first and last name plus “entrepreneur individuel”/“EI” for an individual business. The legal notice also needs the host's verified name, address, and telephone; the current pages identify Vercel but lack its full contact details. A consumer mediator must be contracted before its name, contact details, and website can be listed on the site and sale terms. The legal notice and sale terms are therefore incomplete for a consumer-facing French launch. None of these details act as an application checkout flag; missing VAT or registration values do not block checkout in code.
