# ElderLinkMobile — Feature Status

Living tracker of what's built and verified vs. still outstanding. Updated
after each feature lands and is checked (not just written). For the deeper
audit and reasoning behind priorities, see `ROADMAP.md`.

Legend: ✅ Done & verified · 🚧 Built, not yet verified · ⬜ Not started

Last updated: 2026-08-20

## Testing environment

An Android emulator (Pixel 6, API 34, arm64) is now set up on this machine via
Homebrew (`android-commandlinetools`, `openjdk@17`) with Expo Go 56.0.4
sideloaded (Play Store isn't on this image, so Expo Go is installed directly
from `https://github.com/expo/expo-go-releases`, matched to this project's
exact SDK version — the generic "latest" endpoint gave an incompatible
build). Full setup notes live in this session's history; ask if these need
to be written up separately. iOS Simulator still requires Xcode installed via
the App Store (needs your Apple ID) — not done yet.

## Phase 0 — Correctness fixes

✅ Done (2026-08-18) — see `ROADMAP.md` for detail:
- Fixed refresh-queue hang in `src/api/client.ts`
- Fixed 4 broken API paths (`family-members`, `recurring-bookings`, `reviews`, `service-reports`)
- Synced `src/types/index.ts` with the web app's current schema
- Added `src/api/user.ts` (consent + erasure clients)
- ✅ Done (2026-08-19): `POST /api/auth/mobile/register` — see below, no longer open

## Web-repo bug found + fixed during verification (2026-08-18)

While verifying service reports end-to-end, found that `createMobileAccessToken`/
`createMobileRefreshToken` in `../ElderLink/src/lib/auth/session.ts` hardcoded
`consentGiven: false` on every mobile token, regardless of the user's actual
`consent_given_at` in the database. The web middleware then 307-redirects any
authenticated request to an HTML `/consent` page when `consentGiven` is false —
and since axios follows redirects silently, **every protected mobile API call
was broken for every user**, always, independent of any bug in this repo.
Confirmed independent of the mobile app via raw `curl`. Fixed in the web repo
to pass the user's real consent status into the token. This was a strictly
bigger blocker than anything tracked in `ROADMAP.md` — nothing mobile-side
could have worked past this until it was fixed.

## Entity/signup model audit + fixes (2026-08-19)

Reviewed how the platform's three entity types (family, provider, company)
sign up, confirming the web app cleanly supports all three via one shared
`/register` flow with a role picker, while mobile intentionally offers only
family/provider (company management is web-only by design). Two real gaps
came out of that audit, both now fixed and verified end-to-end on the
emulator:

- **Registration UX was degraded, not broken.** Mobile's old register flow
  posted to the web's cookie-only `/api/users/register`, so the account was
  created but auto-login always failed, bouncing the user back to login for
  a second OTP round-trip. Added `POST /api/auth/mobile/register`
  (`../ElderLink`, mirrors `/api/auth/mobile/verify-otp`'s token-issuing
  pattern) and pointed `app/(auth)/register.tsx` at it. Verified: a brand-new
  family signup now lands directly in the dashboard with one OTP entry, no
  bounce-back. Also verified the `+91`-required-for-providers validation and
  confirmed the endpoint rejects `role: "company"` outright (defense in
  depth — mobile's UI never offers that option anyway).
- **Company (and admin) users landing on mobile were silently misrouted.**
  `app/_layout.tsx` had an explicit `// company portal TBD` placeholder
  routing them into the family dashboard with zero indication anything was
  wrong. Added `app/unsupported-role.tsx` — a clear "not supported yet, use
  the web portal" message with a working sign-out — and routed
  company/admin there instead. Verified against the seeded company user
  (`+919800000099`).

Also confirmed: family-member invites and company→provider employee links
are pure access-delegation between two independently pre-registered
accounts by design (never auto-provision a new account) — this is the
intended model going forward, not a gap.

## Mobile consent screen (2026-08-20)

While walking the sign-up flow page-by-page, flagged that a brand-new
user's `consent_given_at` is `NULL` at creation, so the web middleware
307-redirects every protected API call to an HTML `/consent` page — with no
consent screen anywhere in the mobile app, a new user's dashboard would
silently look permanently empty. Confirmed via `curl` before building
anything. Fixed:

- **`app/consent.tsx`** (new) — DPDP Act 2023 consent copy (what's
  collected, data-residency/no-sale/erasure assurances) with an "I
  understand and consent" button: calls `userApi.recordConsent()`
  (`POST /api/user/consent`), refreshes the access token so it carries the
  new `consentGiven: true` claim (JWTs are stateless — the old token stays
  wrong until reissued), updates the Zustand store, then routes to the
  right dashboard.
- **`app/_layout.tsx`** — `AuthGate` now routes any family/provider user
  with `consentGiven: false` to `/consent` before the dashboard.
- **`src/store/auth.ts`** — `AuthUser` gained `consentGiven`; added
  `setConsentGiven()`.
- **`../ElderLink`**: `verify-otp` and `register` routes now return
  `consentGiven` on the `user` object (previously only used internally for
  the JWT claim).

Verified end-to-end on the Android emulator against a local backend:
registered a fresh family user, confirmed it landed on `/consent` (not the
dashboard) with all copy rendering, tapped consent, confirmed it landed on
the dashboard with `Active bookings` actually loading (not silently empty),
confirmed `consent_given_at` was set in the DB, and confirmed
`GET /api/family/bookings` / `GET /api/family/parents` returned 200 (not a
307 to `/consent`) afterward.

**Second bug found and fixed during this verification.** The very first
`POST /api/user/consent` after registration returned 401 (recovered only
because the mobile client's silent-refresh-on-401 interceptor happened to
retry it). Root cause: `requireSession()` in `../ElderLink/src/lib/auth/session.ts`
tried the web cookie-session lookup (`getServerSession()`) unguarded before
falling back to checking the Bearer token — if that cookie-path lookup
throws for any reason (it did, transiently), the whole function rejected
before ever inspecting the Authorization header, even for a mobile request
that never had a cookie to begin with. Fixed by wrapping that first lookup
in `.catch(() => null)` so a cookie-path failure can't shadow a valid
Bearer token. Re-verified via direct `curl`: register → consent (200 on the
very first call, no more transient 401) → refresh → a consent-gated route
(200). This bug affected every `requireSession()`-guarded route for every
mobile user, not just consent — worth watching for recurrence since it's
the shared auth path for all mobile API calls.

## Booking flow (family book → provider accept) (2026-08-20)

A code-reading audit initially marked this "DONE," but live click-testing on
the emulator surfaced **three real, blocking bugs** that code review missed —
each fixed and re-verified end-to-end (`curl` first, then the actual UI).

- **Missing backend route.** `providers/[id].tsx` (the "Book" button screen)
  calls `GET /api/family/providers/:id`, but that route never existed —
  only the list/search route did. Every tap on a provider from search
  results dead-ended at "Provider not found," blocking the flow completely.
  Added `../ElderLink/src/app/api/family/providers/[id]/route.ts`, mirroring
  the list route's query + `fromDb` mapping pattern.
- **Field-name/id-space mismatch.** The web's booking-create schema requires
  `providerUserId` (a `users.id`); mobile was sending `providerProfileId` (a
  `provider_profiles.id` — a different id space entirely), so every booking
  submission 400'd. Fixed the param name and value across three files:
  `providers/[id].tsx` (Book button now passes `provider.userId`),
  `bookings/new.tsx` (reads/forwards `providerUserId`), and
  `src/api/bookings.ts` (`CreateBookingInput` renamed; also dropped
  `durationMinutes`/`amountInPaise`, which the server computes itself and
  silently ignored from the client).
- **Swallowed error messages.** `bookings/new.tsx`'s mutation `onError`
  checked `err instanceof Error` before checking `err.response.data.error` —
  since Axios errors are `Error` instances, this always showed the generic
  "Request failed with status code 400" instead of the real backend
  validation message. Reordered the check. (Checked for the same pattern
  elsewhere in the app — this was the only occurrence.)
- **Second `requireSession()` bug found via this same testing pass**: not
  booking-specific, already covered in the "Mobile consent screen" section
  above.

Verified end-to-end on the Android emulator against a local backend: as
family user Mayank Goyal, searched providers in an active city (Agra —
noted below), opened verified provider Sunita Agarwal's profile (confirming
the missing-route fix), submitted a real booking for parent "Suresh Goyal"
(confirming the field-name fix — booking landed on Booking Detail as
"Pending" with correct schedule/pricing), then logged in as Sunita and
accepted the job from `app/(provider)/jobs/[id].tsx`, confirming via direct
DB query that `status` transitioned `pending → confirmed` with a proper
`statusHistory` entry. All test data (booking + parent profile) deleted
afterward.

**Incidental finding, not a bug**: the only pre-existing seed parent profile
(Ramesh Goyal) is in Delhi NCR, which is an *inactive* city
(`cities.active = false`) in the seed data — city-gating itself works
correctly (`/api/family/providers` returns a clear "coming soon" message),
but it means the seed data can't exercise the booking flow at all without
adding a parent in an active city, which is what this pass did.

**Not yet exercised**: the remaining provider-side transitions
(`confirmed → in_progress → completed`, with live location posting) and the
family-side cancel path — these reuse code already verified in the service
reports / reviews passes earlier this session, so confidence is high, but
they weren't re-clicked in this specific pass.

## Feature backlog (priority order, agreed 2026-08-18)

1. ✅ **Service reports** (provider submit + family view) — built and
   **verified end-to-end** 2026-08-18 on the Android emulator against a real
   local `../ElderLink` + Supabase backend:
   - Provider: `app/(provider)/jobs/[id].tsx` — logged in as a seeded
     provider (Amit Yadav), drove a real booking through
     confirmed → in_progress → completed (confirming the pre-existing job
     lifecycle + live location posting still work), then filled out and
     submitted the visit report form (mood, summary). Confirmed the row
     landed correctly in `service_reports` via direct DB query.
   - Family: `app/(family)/bookings/[id].tsx` — logged in as the linked
     family user (Mayank Goyal), opened the same booking, and confirmed the
     "Visit Report" card rendered the exact submitted mood + summary.
   - Not separately exercised: the 409 double-submit path and the 422
     pre-completion path (code review gives high confidence, but not
     click-tested).
2. ✅ **Family sharing** (invite/manage members on a parent profile) — built
   and **verified end-to-end** 2026-08-19 on the Android emulator against a
   real local `../ElderLink` + Supabase backend:
   - `app/(family)/parents/[id].tsx` — added a "Family Access" section
     (owner-only controls: invite by phone + role, change a member's role,
     remove a member; read-only list for non-owners).
   - Logged in as the profile owner (Mayank Goyal) and exercised the full
     CRUD cycle against real seed data: viewed the pre-existing member
     (Priyanka Goyal), toggled her role manager → viewer (confirmed via
     direct DB query), invited a fresh test user (created and then cleaned
     up afterward) and confirmed she appeared with the correct role,
     removed her, and confirmed the row was actually deleted from
     `family_members` via DB query.
   - Also exercised the 409 duplicate-invite path — inviting an
     already-member phone number surfaced the exact backend error message
     ("This person already has access to this profile.") via `Alert.alert`.
   - Not separately exercised: inviting a phone number with no ElderLink
     account (404 path) or a non-family role (422 path) — code review gives
     high confidence, not click-tested.
3. ✅ **Reviews** (family ↔ provider two-way rating) — built and
   **verified end-to-end** 2026-08-19 on the Android emulator against a
   real local `../ElderLink` + Supabase backend:
   - `app/(family)/bookings/[id].tsx` — "Rate Your Provider" card (5-star
     picker + optional comment) once a booking is `completed`.
   - `app/(provider)/jobs/[id].tsx` — matching "Rate This Family" card.
     Same no-GET-endpoint limitation as service reports: a 409 on submit
     (already reviewed) is treated as confirmation, same pattern already
     proven there.
   - Logged in as provider (Amit Yadav) on a completed booking, rated the
     family 4 stars with a comment, confirmed via DB query. Logged in as
     the family user (Mayank Goyal) on the same booking, rated the
     provider 5 stars, confirmed via DB query — both review rows present
     with the correct reviewer/reviewee direction.
   - Not separately re-exercised: the 409 duplicate-submit path (identical
     code path to service reports' already-verified 409 handling, not
     re-clicked here) and the 422 pre-completion path.
4. ⬜ **Recurring bookings** — API client fixed, no screens yet.
5. ⬜ **Chat** (per-booking messaging) — no API client, no screens.
6. ⬜ **i18n / locale switching** — no API client, no screens.

Lower priority, unscheduled:
- Provider ↔ company linking (accept/request)
- Company-role UX (currently silently routed into the family UI — a
  correctness issue more than a feature gap)

## Explicitly out of scope for this app

Admin portal, company portal, provider onboarding/document upload,
subscription plan management, Razorpay payments (not built in the web app
either yet), Terraform/infra — all web-only by design per `CLAUDE.md`.

## Testing infrastructure

Still at zero (no jest/detox config, no test files) — tracked in
`ROADMAP.md` Phase 2, not repeated here.
