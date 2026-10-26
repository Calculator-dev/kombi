# kombi.ba

Marketplace for renting vans in Bosnia and Herzegovina: van owners list their vans with
photos and prices, customers pick dates, see which vans are free and the exact price,
and send a booking request.

| Part | Tech | Folder |
| --- | --- | --- |
| Website | Next.js 16 (App Router) + TypeScript | `apps/web` |
| API | Node.js 22 + Express 5 + TypeScript | `apps/api` |
| Shared logic | Pricing, dates, validation (Zod), used by both | `packages/shared` |
| Database | PostgreSQL via **Drizzle ORM** (Supabase in production, PGlite embedded Postgres in tests) | `apps/api/src/db` |
| Logins | **Supabase Auth** (sign-up, email confirmation, password reset) | `apps/api/src/auth.ts` |
| Photos | **Backblaze B2** (S3-compatible), resized to WebP by the API | `apps/api/src/services/storage.ts` |

## How it works

1. A visitor picks dates on the homepage and sees which vans are free then, with the
   exact price of each. On a van's page, its taken days are crossed out.
2. The price is calculated instantly in the browser with the **same function** the API
   uses, so the number they see is the number that gets stored.
3. They choose the van's extras and a pickup place (each owner sets their own),
   fill in driver details and send a request. **No payment online**; they pay at pickup.
4. The request **holds the dates** (24 h by default) so nobody else can take them while
   the owner decides. The van's owner gets an email, then confirms or declines in `/admin`.
5. The customer gets an email when the booking is confirmed.

Double bookings are impossible: every booking write runs in a transaction behind a
Postgres advisory lock per van, and both pending holds and confirmed bookings block dates.

**Owners and admins:** anyone can sign up at `/admin` as a van owner, add vans, photos and
prices. Their vans appear on the site once a platform admin (emails in
`PLATFORM_ADMIN_EMAILS`) approves them under "Vlasnici". Owners only ever see their own
vans, bookings and blocked days; admins see everything.

**Dates:** the van is occupied from the pickup day through the return day (inclusive),
and the customer pays for `return − pickup` days. Example: 21 → 24 October = 3 days.

## Run it locally

Requirements: Node.js 22.12 or newer. No database installation needed.

```bash
npm install

# 1. Configure the API and the website
cp apps/api/.env.example apps/api/.env      # Supabase, Backblaze, your email in PLATFORM_ADMIN_EMAILS
cp apps/web/.env.example apps/web/.env.local  # Supabase URL + publishable key

# 2. Start API (port 4000) and website (port 3000)
npm run dev
```

Open http://localhost:3000 for the site and http://localhost:3000/admin for the admin panel.
Sign up there with an email from `PLATFORM_ADMIN_EMAILS` to become an admin.

In Supabase → Authentication → URL Configuration, add `http://localhost:3000/admin` and
your production `/admin` address to the redirect URLs, so confirmation and password-reset
links lead back to the admin panel.
On Windows, run `npm run dev:api` and `npm run dev:web` in two terminals instead.

Without `DATABASE_URL`, the API uses an embedded Postgres stored in `apps/api/data/`.
Delete that folder to start fresh.

## Database (Drizzle)

The tables are defined in TypeScript in `apps/api/src/db/schema.ts`, and every query in
`apps/api/src/services` goes through Drizzle, so columns and results are fully typed.
The same Drizzle code runs on two drivers: `node-postgres` when `DATABASE_URL` is set,
and PGlite (Postgres compiled to WebAssembly) otherwise.

Changing the database:

```bash
# 1. edit apps/api/src/db/schema.ts
# 2. generate a SQL migration into apps/api/drizzle/
npm run db:generate --workspace @kombi/api -- --name add_something
# 3. commit the new migration; the API applies pending migrations on start
#    (or run them separately: npm run db:migrate --workspace @kombi/api)
```

`npm run db:studio --workspace @kombi/api` opens Drizzle Studio to browse the data
(set `DATABASE_URL` first). CI fails if the schema changes without a migration.

```bash
npm test          # pricing + API tests (in-memory database)
TEST_DATABASE_URL=postgres://… npm test --workspace @kombi/api   # same tests on real Postgres (empty DB)
npm run typecheck
npm run build
```

## Before launch: things to fill in

Everything in `[brackets]` on the site is a placeholder:

- **`apps/web/lib/site.ts`**: phone number, Viber/WhatsApp links, email, minimum driver
  age, licence years, free-cancellation days, what the price includes, reply time.
- **Prices**: log in to `/admin` → *Cijene*. Daily rate, summer season, weekly discount,
  deposit, extras and delivery fees are all editable there; the defaults are examples.
- **Photos**: replace the three `[Foto]` boxes in `components/Sections.tsx` with real
  photos (put them in `apps/web/public/van/` and use `next/image`).
- **Van length**: `VAN.length` in `site.ts` (Proace Verso comes in ~4.6 / 5.0 / 5.3 m).

## Admin panel (`/admin`)

- **Pregled**: new requests with *Potvrdi / Odbij*, occupancy, next pickup, month calendar.
- **Rezervacije**: all bookings, filter by status, cancel confirmed ones. Contact links open
  Viber/WhatsApp/email directly.
- **Blokirani dani**: block dates for service, personal use, or phone bookings.
- **Cijene**: all prices and seasons.

Login is a single password (bcrypt hash in the environment), sessions are signed
HTTP-only cookies valid for 7 days, and login attempts are rate-limited.

## API

All routes are under `/api`. The website forwards `/api/*` to the API (see
`apps/web/next.config.ts`), so the browser only talks to one origin.

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/settings` | Public prices |
| GET | `/api/availability?from=&to=` | Unavailable dates only, no personal data |
| POST | `/api/quote` | Price for dates + extras + pickup |
| POST | `/api/bookings` | Create a request (validated, rate-limited, honeypot spam filter) |
| POST | `/api/admin/login` · `/logout` | Session cookie |
| GET / PATCH | `/api/admin/bookings[/:id]` | List; set `confirmed` / `declined` / `cancelled` |
| GET / POST / DELETE | `/api/admin/blocks[/:id]` | Blocked date ranges |
| GET / PUT | `/api/admin/settings` | Prices and rules |

## SEO

- Static, server-rendered pages (fast, fully readable by Google).
- Landing pages for real searches: `/najam-kombija-sarajevo`, `/kombi-za-more`,
  `/rent-a-kombi-aerodrom-sarajevo`, `/cijena-najma-kombija` (edit or add in `LANDINGS`
  in `site.ts`; they appear in the sitemap and footer automatically).
- `AutoRental` + `FAQPage` structured data, `sitemap.xml`, `robots.txt`, canonical URLs.
- Self-hosted fonts (no Google Fonts request).
- `/admin` and `/rezervacija` are excluded from indexing.

After launch: set up Google Search Console and submit `https://kombi.ba/sitemap.xml`,
and create a Google Business Profile.

## Deploying

**Option A, Render:** `render.yaml` sets up the API and website; the database is Supabase.
Fill in the variables it asks for (Supabase, Backblaze, `PLATFORM_ADMIN_EMAILS`).

**Option B, one server (e.g. a VPS in the EU):** fill in `apps/api/.env`, then
`docker compose up -d --build`. Put Caddy or Nginx in front of port 3000 for HTTPS.

In production the API refuses to start without `DATABASE_URL`, `SUPABASE_URL` and the
Backblaze variables.

## Next steps

- English version of the site (`/en`), for tourists and the diaspora.
- Viber/WhatsApp notifications to the owner (hook is ready in `apps/api/src/services/notify.ts`).
- Online deposit payment (e.g. Monri) if wanted later.
- "With driver" option: add it as a new booking type alongside self-drive.
# kombi
