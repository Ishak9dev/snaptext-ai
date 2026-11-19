# Analytics setup

## Source code

The root App Router mounts `AnalyticsRuntime` once. It loads the single container `GTM-TXFHQR2S` only after the visitor's saved analytics preference is true. Consent Mode v2 defaults all four consent signals to denied before GTM is added, then updates them when cookie preferences change. Advertising consent signals follow the advertising choice; no advertising tags are installed by this source.

The app queues `page_view` events on initial load and pathname navigation, with `page_location`, `page_path`, and `page_title`. In GTM, disable automatic page views on the Google tag (`send_page_view: false`) and add a GA4 Event tag for the custom `page_view` event so the initial view is not duplicated. Do not add a second GTM container or a direct GA4 script.

## Required GTM workspace configuration

1. Add one **Google tag** using Measurement ID `G-VMW2LFYHQ5`.
2. Fire it on Initialization - All Pages, with `send_page_view` disabled.
3. Set the Google tag's built-in consent checks to require `analytics_storage` for analytics. Do not use additional consent to fire the tag before consent; source code delays container loading until analytics consent is saved.
4. Add a **Google Analytics: GA4 Event** tag for `page_view`, triggered by a Custom Event named `page_view`. Map the three page parameters from the data layer.
5. Add GA4 Event tags for `sign_up`, `login`, `begin_checkout`, and `generate_image_description`, triggered by same-named Custom Events. Available parameters: `method`; `plan_id`, `billing_interval`, `currency`; and none respectively.
6. Preview the container and confirm one page view per route, then publish the GTM workspace when ready.

## Payment events

`purchase`, `subscription_renewal`, and `subscription_cancelled` are not emitted. Stripe webhooks currently synchronize subscription state and deduplicate webhook deliveries, but the app does not retain analytics consent server-side or provide a browser-visible, payment-level idempotency signal. The dashboard success URL is not payment confirmation. Implement a consent-aware event handoff and event ledger before enabling those events; do not infer them from checkout redirects or subscription status alone.

## Validation still requiring connected production tools

Use GTM Preview and Tag Assistant to confirm the published container and GA4 destination, and GA4 DebugView/Realtime to inspect consented events. Confirm the active GA4 stream is `G-VMW2LFYHQ5` and that any obsolete measurement ID has no production tags. This source change cannot inspect or publish Google account configuration.
