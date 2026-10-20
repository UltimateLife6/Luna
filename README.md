# Luna Fae Leathers — unofficial concept demo

Private sales demonstration by Noctaris Innovations. This is not the Luna Fae Leathers shop and is not endorsed by the maker.

No live payments or contact delivery. Local catalog checkout stays in Stripe test mode and remains off until test keys and a shipping rate are saved. All routes send `noindex, nofollow`. `robots.txt` disallows the whole site.

## Scripts

- `npm run dev` — local preview
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`

## Demo walkthrough

1. **Homepage** (`/`) — Editorial introduction, collection tiles, craft notes from the public description, the commission demonstration, concept gallery frames, and an empty appearances panel.
2. **Shop filtering** (`/shop`) — Search and category filters share the URL (`q`, `category`). The eight products are fictional interface examples. They are not rows in the local catalog database.
3. **Product details** (`/shop/[slug]`) — Concept frames, example options, and a purchase state that says the example cannot be bought. A separate link opens the maker’s Etsy shop. Another link opens the commission demonstration with a category preset.
4. **Custom commission builder** (`/custom`) — Six in-memory steps. The last action previews a summary. Nothing is submitted.
5. **Gallery** (`/gallery`) — Labeled concept frames, category filters, and a lightbox. Approved photographs replace the frames when they are added to `src/data/gallery.ts`.
6. **Events** (`/events`) — Upcoming and past sections. Both are empty until a confirmed appearance is added to `src/data/events.ts`.
7. **About** (`/about`) — Public description only: handcrafted accessories and apparel, vegetable-tanned leather, and customization of stitching, buckle color, and sizing.
8. **Contact** (`/contact`) — A preview-only note, plus Instagram and Etsy as the public channels. The note is not sent.
9. **Local catalog** (`/catalog`) — Published rows from the local SQLite file. The page is empty until a record is published. It does not take payment.
10. **Catalog admin** (`/admin`) — Owner sign-in through Auth.js. No account is seeded. The screen stays closed until `AUTH_SECRET` is set and `npm run admin:create` has saved an account.

## What is fictional, verified, or only a demonstration

**Verified public details**

- The maker’s name and the public description of custom handcrafted leather accessories and apparel.
- Instagram: https://www.instagram.com/lunafaeleathers/
- Etsy shop: https://www.etsy.com/shop/LunaFaeLeathers
- The Instagram bio’s “100% vegetable-tanned leather.”
- Public customization: stitching, buckle color, and sizing.
- Work shown publicly includes harnesses, masks, collars, leather accessories, fantasy armor, markets, conventions, and collaborations. Those pieces are not pictured here.

**Fictional**

- Every shop product, option, and concept frame.
- Gallery placeholders. They are named slots, not portfolio entries.
- Any sample note typed into the commission builder or the contact demonstration.

**Demonstrations**

- Shop filters, product galleries, and example customization.
- The commission builder.
- The gallery lightbox.
- The contact note.

**Not included, because it was not supplied**

- Prices, stock, reviews, processing times, founding year, biography, awards, production capacity, customer counts, certifications, policies, email, and telephone.
- Confirmed event names, dates, and venues.
- Public publication approval for the 19 photographs. They are allowed in the private local preview only.

## Production requirements

A live site would need the maker’s approval, approved photography, verified product and event records, a real commission or contact path hosted by the business, and removal of the unofficial-demo disclosure only if the site becomes an official property. Search exclusion would also be removed only at that point. The catalog starts with no products. Stripe Checkout can run in test mode only after the owner supplies test keys and shipping rates. Live payments are refused. Nothing in this repository has been deployed.

## Local catalog

`data/catalog.sqlite` is created on first use and is gitignored. Local development uses Node’s built-in SQLite (`node:sqlite`) when `APP_ENV` is `local` or unset and `DATABASE_URL` is empty. Staging and production do not open that file. They use PostgreSQL through `DATABASE_URL`. A webhook and the app have to share the same database. Deleting the local file deletes local carts, reservations, and orders.

Checkout stays off until `STRIPE_SECRET_KEY` is a test key (`sk_test_`), `STRIPE_WEBHOOK_SECRET` is set (`whsec_`), and at least one shipping rate is saved in local admin. Live keys (`sk_live_`, `rk_live_`) are rejected. The secret key is read on the server only. No tax rate is configured, and none is invented. Shipping amounts come only from rates an editor saves. Active rates must share one country list, and each active amount must be unique. Stripe Checkout accepts at most five.

Cart prices are read from the catalog. A browser-submitted price is ignored. Checkout asks Stripe to expire the session 31 minutes after it is created. That is inside Stripe’s rule of 30 minutes to 24 hours. The local timer does not release a Checkout reservation by itself. After that timestamp, reconciliation reads the Checkout session and its payment intent from Stripe. It releases the piece only when that state shows payment cannot still complete: an expired unpaid session, or a completed session whose payment intent is canceled or requires a new payment method. Open, paid, processing, and uncertain states stay reserved. A Stripe API failure records the attempt and keeps the reservation. Each order is checked at most once every 15 minutes. Five failed or uncertain reads stop further automatic Stripe calls, mark the order for manual review, and leave the piece reserved. Seventy-two hours after Checkout expiry, a still-pending Checkout reservation is marked for the same review instead of being released. A local hold that never created a Checkout session still expires on its own timer. An admin recheck reads Stripe again and releases inventory only when that read shows payment cannot complete. There is no control that releases a Checkout reservation without that confirmation. A paid webhook during the hold deducts the same reservation once. A duplicate webhook does not deduct again. A paid webhook that arrives after an authoritative release is still recorded, does not drive inventory below zero, and tells the owner to refund the charge in the Stripe Dashboard or fulfill it by hand. Reconciliation and the paid webhook lock the order row and re-read its payment status before changing inventory. Payment becomes paid only after a signature-checked webhook. The return page does not mark an order paid. Leaving Checkout does not cancel the hold. Quote-only products and the custom-page demonstration stay outside checkout. Refunds are recorded if Stripe sends `charge.refunded`; this admin does not create refunds or buy shipping labels. Made-to-order notes are shown only when an editor saved one.

An expired Checkout webhook asks reconciliation to run immediately. Hosted environments should also call `GET /api/commerce/reconcile` every 15 minutes with `Authorization: Bearer` set to `CRON_SECRET`. On Vercel, set `CRON_SECRET` and a cron of `*/15 * * * *` for that path; Vercel sends the bearer token itself. The route stays closed until `CRON_SECRET` is set, refuses live Stripe keys, and does not create a Stripe account. Without the cron, an unresolved Checkout reservation stays reserved and appears for manual review when an admin opens the orders screen after 72 hours.

A checkout record can carry customization groups that an editor creates. No colors, finishes, sizes, or adjustments are seeded. The product page estimates a total from the saved variant price and saved option adjustments. The server prices the cart again and stores a snapshot of the selected options on the order. If those saved options later change, the existing cart line is blocked instead of being repriced. Two different configurations of the same variant stay on separate cart lines. A quote-only record uses a free request form. That request is stored for admin review and does not create a charge, a price, or a production date.

Catalog admin uses Auth.js with an email and password. Set `AUTH_SECRET` to at least 32 characters, then create the first account with `ADMIN_EMAIL` and `ADMIN_PASSWORD` in the environment and `npm run admin:create`. The script refuses to invent either value. Sessions last eight hours, are httpOnly, and are secure outside local development. Five failed sign-ins for the same email within 15 minutes are refused. Sign out is on the catalog records screen. Prices are integer USD cents. Inventory counts, purchase mode, customization, and made-to-order notes are whatever an editor saves. New products start as quote-only. The database starts with the four browsing categories and no products.

For a local Stripe test, add `STRIPE_SECRET_KEY` (`sk_test_…`) and `STRIPE_WEBHOOK_SECRET` (`whsec_…`) to `.env.local`. Do not commit that file, and do not put a live key in it. Save one shipping rate under `/admin/orders`. Install the Stripe CLI and log in with the same test account, then forward events while the site is running:

```bash
stripe listen --forward-to http://localhost:3010/api/stripe/webhook
```

The CLI prints a webhook signing secret. Put that value in `STRIPE_WEBHOOK_SECRET` and restart `npm run dev -- -p 3010`. `stripe trigger checkout.session.completed` sends Stripe’s own fixture. It checks that a signed event reaches the route. It does not pay a local order. A real test payment needs a published checkout product, a saved shipping rate, and Stripe’s documented test card `4242 4242 4242 4242` on the hosted Checkout page. Remove that product and rate after the test. This repository does not store those keys, and it does not record a successful payment unless that signed webhook updates the local order.

A photograph can be referenced by its ledger id. The file stays outside `public`. Private-preview photographs still render only in development, and they are not copied into hosted storage. An editor can upload a JPEG, PNG, or WebP of 8 MB or smaller. The upload stays withheld until that editor marks it approved for the demo. Public image routes serve only that approval. Hosted uploads use Vercel Blob when `BLOB_READ_WRITE_TOKEN` is set. Without that token, staging and production refuse the upload. Local development stores uploads under `data/media`, which is gitignored.

## Hosted infrastructure

Copy `.env.example` to `.env.local` and fill placeholders yourself. Server secrets stay in environment variables. They are not sent to the browser.

`APP_ENV` is `local`, `staging`, or `production`. Unset means local, except on Vercel, where it means production. `local` without `DATABASE_URL` uses SQLite. `staging` and `production` require `DATABASE_URL` and do not open SQLite or write product media to the local disk.

PostgreSQL migrations live in `src/lib/platform/migrations` and are applied by `npm run db:migrate`. The same command is safe to run again. On a hosted server, startup applies any missing versions. Create the Neon project yourself and put its connection string in `DATABASE_URL`. This repository does not create that project.

`npm run db:import-sqlite` copies categories, real catalog rows, their variants, quote requests for those rows, and saved shipping rates into PostgreSQL. It skips fictional shop slugs, slugs that start with `example-`, `test-`, `builder-`, `local-verification`, `draft-piece`, or `archived-piece`, and the 19 private-preview photographs. It does not copy carts, orders, reservations, webhook events, or admin passwords. The import command applies migrations before it copies rows. Review shipping rates after the copy. A second run does not overwrite saved rows.

Guest order status uses an unguessable tracking link. Only a hash of that link is stored. The public status page shows payment and fulfillment separately and omits the street address. Customer accounts are optional, use a separate eight-hour session from the owner session, and link earlier guest orders only after the email address is verified. No customer is seeded. Shipping, returns, privacy, terms, and custom-order sections exist in admin and stay unpublished until the owner pastes the text. Email delivery stays off unless `EMAIL_PROVIDER` is `resend` or `sendgrid`, `EMAIL_API_KEY` is set, `EMAIL_FROM` is an address outside example and local domains, and `EMAIL_SENDER_VERIFIED=true` after that domain is verified with the provider. Messages are sent only after the matching verified event, and a second attempt with the same key does not send again.

Stripe stays in test mode in every environment. Keys beginning with `sk_live_` or `rk_live_` are refused. Checkout still needs `sk_test_`, `whsec_`, and one to five active shipping rates that share one country list.

For Vercel, set `APP_ENV`, `DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL`, test Stripe keys, and, when uploads are wanted, `BLOB_READ_WRITE_TOKEN`. Do not set a live Stripe key. The app does not depend on a SQLite file or on writing `data/` at runtime in that configuration. This repository has not been deployed.

### Backup and recovery

Neon keeps point-in-time recovery on its own plan. Take a logical backup with `pg_dump` against `DATABASE_URL` before a migration or import. Restore by creating an empty database, running `pg_restore` or `psql`, then `npm run db:migrate` so the schema version table matches. Do not commit `data/catalog.sqlite`, `data/media`, or any `.env` file other than `.env.example`. If the local SQLite file is the only copy, copy it before importing. Losing it loses local carts and orders that were not imported. Hosted orders live only in PostgreSQL. A refund recorded from Stripe does not put finished inventory back; that restock decision is still open.

`/catalog/[slug]` reads the database on request, so a product created after the build can resolve. An unknown slug shows “This product is not published.” With cache components, that response can still be HTTP 200. The shop’s `unstable_paramMatching` 404 is not used here, because it would reject slugs that were not known when the route was built.

## Photography

Luna Fae Leathers supplied `IMG_5249.jpeg` through `IMG_5267.jpeg`. On 2026-10-20 the owner confirmed that all 19 may be used on the public website. Each ledger row is `approved-for-public-production`. That status is separate from the catalog-upload status `approved-for-demo`. Photographer credit and model permission are still unverified and need follow-up.

Originals stay in `photography/originals` and are not published. The optimized WebP files copied for the site are in `public/images`. The private-preview route still returns 404 for anything that is not `approved-for-private-preview`.

The sources are 1024×1024. Derivatives stay 1024×1024. They were not upscaled. WebP quality is 82, with no sharpening and no EXIF on the derivative.

| File | Placement |
| --- | --- |
| IMG_5249 | Homepage hero |
| IMG_5267 | Alternate hero, included in the gallery |
| IMG_5250, IMG_5254, IMG_5264, IMG_5266 | Homepage collection tiles, in that order |
| IMG_5258, IMG_5260, IMG_5261 | Homepage gallery preview |
| IMG_5251 | Custom creations and the custom page |
| IMG_5265 | Alternate custom photograph, included in the gallery |
| IMG_5263 | Homepage Crafted by hand |
| IMG_5253 | About making frame |
| IMG_5259 | About materials frame |
| All 19 | Gallery, square, in the ledger order |

None of the photographs are attached to a published product.

## Private preview

There is no Vercel project file in this repository, and this milestone does not deploy.

`noindex`, `X-Robots-Tag`, and `robots.txt` keep the demo out of search indexes. They do not stop someone who has the URL from opening it.

Before sharing the demo, put the deployment behind Vercel Deployment Protection (a password or SSO) or another real authentication gate. Do not treat an obscure preview URL as access control. Do not commit passwords or other secrets.

## Unknown product URLs

`/shop/[slug]` exports `unstable_paramMatching = { slug: "not-found" }` on Next.js 16.4.2.

With cache components, an unknown slug used to render the not-found page inside a postponed shell. The first response was already committed as HTTP 200. A later request could be a cached 404.

The matching option rejects unknown params at the router, before that shell streams. Known product pages stay static. Cache components and partial prefetching stay on. `dynamicParams` cannot be exported while cache components are enabled, and Next.js 16.4.2 does not offer a stable public replacement for this case.

If the unstable export is removed or renamed, the build will fail on that line, or unknown URLs can return to the first-request 200 behavior. Revisit the export when upgrading Next.js. Do not turn off prerendering for the whole app to hide it.

The 404 body is the site not-found page, because the router never enters the product segment.

## Dependency advisories

`npm audit` reports five high findings, all in the development tree: `eslint-config-next` → `@next/eslint-plugin-next` → `fast-glob` → `micromatch` → `braces`. Production install (`npm ls --omit=dev`) does not include them. The suggested fix downgrades `eslint-config-next` to a 14.x release, which does not match Next.js 16.4.2. They are left unfixed on purpose.
