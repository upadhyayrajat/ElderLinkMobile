# ElderLinkMobile — Feature Status

Living tracker of what's built and verified vs. still outstanding. Updated
after each feature lands and is checked (not just written). For the deeper
audit and reasoning behind priorities, see `ROADMAP.md`.

Legend: ✅ Done & verified · 🚧 Built, not yet verified · ⬜ Not started

Last updated: 2026-08-19

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
- Out of scope / still open: `POST /api/auth/mobile/register` — lives in the web repo, blocks new-user signup on mobile entirely

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
3. ⬜ **Reviews** (family ↔ provider two-way rating) — API client fixed, no
   screens yet.
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
