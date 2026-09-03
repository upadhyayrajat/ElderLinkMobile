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

### Booking flow closeout: remaining transitions + cancel path (2026-08-20)

Verified end-to-end on the Android emulator against a local backend, closing
out the "not yet exercised" gap above:

- **`confirmed → in_progress → completed`**: logged in as provider Ravi
  Sharma, accepted a pending seed booking, tapped "Start Job" (granting the
  location permission prompt), then "Mark as Complete". Confirmed via direct
  DB query that `status_history` recorded all four transitions
  (`pending → confirmed → in_progress → completed`) with the correct actor
  and timestamps. The post-completion "Submit Visit Report" form rendered
  correctly (same code path already verified in the service-reports pass).
- **Family-side cancel**: created a fresh `pending` test booking via the
  API, opened it as family user Mayank Goyal in
  `app/(family)/bookings/[id].tsx`, tapped "Cancel Booking" → confirmed, and
  verified via DB query that `status` became `cancelled` with a correct
  `statusHistory` entry.

**Finding — live location posting could not be confirmed (environment
limitation, not an app bug)**: the "In Progress — Sharing location every
30 s" banner appears correctly once a job starts, but no
`POST /api/provider/bookings/[id]/location` request ever landed in the web
server log, even after setting a fixed GPS coordinate on the emulator via
`adb emu geo fix`. `adb logcat` showed the root cause: Google's fused
location provider repeatedly failed with
`GlsClientGrpc: Application credential header not valid` — a Google Play
Services credential issue specific to running `expo-location` inside Expo
Go's shared `host.exp.exponent` package on this emulator, not something
fixable in the ElderLinkMobile code. This would need a real device or an
EAS dev build with a properly configured Maps/Play Services API key to
verify conclusively.

**Related code smell — fixed (2026-08-20).** `app/(provider)/jobs/[id].tsx`'s
`postLocation()` catch block previously swallowed *all* failures silently,
and the "Sharing location" banner was shown unconditionally the moment a
job went `in_progress`, regardless of whether any post had actually
succeeded — so the exact Play Services failure above would have been
invisible to both provider and family. Fixed by tracking the last
successful post (`lastLocationSuccessRef`) against when sharing started
(`sharingStartedAtRef`); if posting has been failing for
`LOCATION_STALE_THRESHOLD_MS` (60s, 2× the post interval) since whichever
is more recent, the banner switches to an amber "Location sharing may be
delayed — check your connection or GPS signal" state instead of claiming
success. A single blip doesn't trigger it — only sustained failure across
at least two post attempts does. No `Alert` — stays a passive UI state.
State resets cleanly whenever the job leaves `in_progress`.

Verified end-to-end on the Android emulator against a local backend: as
provider Ravi Sharma, started a fresh test job, confirmed the banner
initially showed the normal green "Sharing location" message, then — since
this emulator is already known to fail every location POST via the same
`GlsClientGrpc` credential issue — waited ~65s and confirmed the banner
correctly flipped to the amber staleness warning (cross-checked via
`adb logcat` that the failures were the same known cause, and confirmed
zero POSTs reached the web dev log). Marked the job complete and confirmed
the banner disappeared entirely with no stale state leaking forward.

All test data from this pass (2 throwaway bookings from the closeout pass,
1 throwaway booking from this fix's verification) deleted afterward; the
pre-existing seed booking driven through the transitions in the closeout
pass was left in its resulting `completed` state, consistent with how
earlier passes treated seed data.

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
4. ✅ **Recurring bookings** (set up + view + cancel) — built and
   **verified end-to-end** 2026-08-20 on the Android emulator against a
   real local `../ElderLink` + Supabase backend. No backend changes needed
   — `GET/POST /api/family/recurring` and `PATCH /api/family/recurring/[id]`
   already matched the existing `src/api/recurring-bookings.ts` client.
   - New: `src/hooks/useRecurringBookings.ts`; `app/(family)/recurring/new.tsx`
     (frequency segmented control, optional weekly day-of-week picker,
     time/start/end date fields, reuses the parent-selection + pricing
     patterns from `bookings/new.tsx`); `app/(family)/recurring/index.tsx`
     (list with service/parent names resolved client-side via the existing
     `useServices()`/parents cache — no new backend joins — schedule, date
     range, price, Active/Cancelled pill, cancel action).
   - Entry points added: a "Set Up Recurring Booking" button on
     `app/(family)/providers/[id].tsx` (alongside the existing "Book Now"),
     and a "Recurring" header button on `app/(family)/bookings/index.tsx`.
   - Logged in as family user Mayank Goyal, booked a weekly Companion Walk
     recurring booking with Sunita Agarwal (Agra) starting 27 Aug 2026,
     confirmed the success alert reported "8 upcoming visits scheduled"
     (matching `OCCURRENCES_AHEAD.weekly`), and confirmed via direct DB
     query: one `recurring_bookings` row with all correct fields and 8
     generated `bookings` rows, 7 days apart. Confirmed the list screen
     rendered it correctly, cancelled it, and confirmed via DB query that
     `active` flipped to `false` and the list reflected "Cancelled" with
     the cancel button gone. Confirmed the empty state (message + "Browse
     services" CTA) renders once the list is empty.
   - **Bug found and fixed during this pass**: the list's `formatDate()`
     (and the create screen's date validation) parsed `"YYYY-MM-DD"`
     strings via `new Date(dateStr)`, which JS treats as UTC midnight —
     once converted to a timezone behind UTC (this emulator defaults to
     `America/New_York`), the displayed date silently shifted back a day
     ("27 Aug" showed as "26 Aug"), and the same parsing in the create
     screen's "start date can't be in the past" check could misfire near
     a timezone boundary. Fixed by comparing/parsing the date strings as
     local calendar components (or lexically as strings, for the ordering
     checks) instead of through `Date`'s UTC-based string parsing.
     Re-verified after the fix: the list correctly showed "From 27 Aug
     2026" matching the entered start date.
   - Test data (the recurring booking, its 8 generated bookings, and a
     throwaway parent profile in Agra created for this pass) deleted
     afterward.
5. ✅ **Chat** (per-booking messaging) — built and **verified end-to-end**
   2026-08-20 on the Android emulator against a real local `../ElderLink` +
   Supabase backend. No backend changes needed —
   `GET/POST /api/{family,provider}/bookings/[id]/chat` and the
   `chat_messages` table/repository already existed and matched exactly;
   only the mobile client/UI was missing. Not exposed by the backend, so
   out of scope for this pass: read receipts (`markRead` exists on the
   repository but no route calls it) and photo attachments (the POST
   schema only accepts `body`, even though the DB column and
   `ChatMessage.photoUrl` type field exist). No push-send dispatcher
   exists anywhere in the web repo either (device tokens are registered
   but nothing sends to them) — delivery is polling-only.
   - New: `src/api/chat.ts` (role-split client, mirrors
     `src/api/reviews.ts`); `src/hooks/useChat.ts`
     (`useChatMessages`/`useSendChatMessage`, 5s `refetchInterval` polling
     — no realtime subscription from mobile, consistent with `CLAUDE.md`'s
     "never talks to Supabase directly," even though the backend broadcasts
     over Supabase Realtime on every send); `app/(family)/bookings/chat/[id].tsx`
     and `app/(provider)/jobs/chat/[id].tsx` (near-identical bubble-thread
     screens — own messages right-aligned/blue, others left-aligned/white,
     auto-scroll to bottom, `TopBar`/`LoadingScreen`/`EmptyState` shared
     components).
   - Entry points added: an always-visible "Message Provider" /
     "Message Family" outline button on `app/(family)/bookings/[id].tsx`
     and `app/(provider)/jobs/[id].tsx`, right below the status badge (not
     status-gated — chat should work before/after the job too).
   - Verified as family user Mayank Goyal and provider Amit Yadav on the
     same completed booking: sent a message from the family side, confirmed
     it rendered right-aligned and landed in `chat_messages` via direct DB
     query with the correct `sender_user_id`; logged in as the provider,
     confirmed the same message rendered left-aligned, replied, confirmed
     via DB query. Logged back in as the family user, opened the thread,
     and — without navigating away or reopening the screen — inserted a
     third message directly via DB to simulate an incoming reply; confirmed
     it appeared automatically within one 5s poll cycle. Confirmed the
     empty state ("No messages yet — say hello!") renders correctly on a
     booking with zero messages, and (incidentally, via a different seed
     booking not touched by this pass) that a pre-existing real multi-message
     thread from seed data also renders correctly.
   - The 1000-char validation path was confirmed by reading the backend's
     zod schema directly (`body: z.string().min(1).max(1000)`) rather than
     click-tested, since the client-side error-surfacing code
     (`err.response.data.error` via `Alert.alert`) is copied verbatim from
     the already-proven pattern used in every other mutation in this app.
   - Test data (3 messages created/inserted on booking
     `b0000000-0000-0000-0000-000000000001` during verification) deleted
     afterward.
6. ✅ **i18n / locale switching** — built and **verified end-to-end**
   2026-08-20 on the Android emulator against a real local `../ElderLink` +
   Supabase backend. The web repo already had real i18n infrastructure to
   mirror (7 locales — en/hi/ml/ta/kn/mr/te — `SUPPORTED_LOCALES`/
   `LOCALE_LABELS`/`DEFAULT_LOCALE` in `src/i18n/locales.ts`, a
   `preferredLocale` field already on the shared `User` type, and
   `PATCH /api/user/locale` already accepting mobile Bearer tokens), but
   translation coverage there is scoped to `auth` + `provider` + `shared`
   namespaces only — the family flow has zero translated strings on either
   repo, so this pass matches that scope rather than machine-translating
   unreviewed copy for a safety-critical flow (SOS etc).
   - Backend (`../ElderLink`, small scoped edits): both mobile auth
     endpoints (`register`, `verify-otp`) now include `preferredLocale` in
     the returned `user` object (previously omitted); `register` now
     accepts an optional `preferredLocale` in the request body instead of
     always defaulting to `"en"`.
   - New mobile: `src/i18n/locales.ts` (mirrors the web constants);
     `src/i18n/messages/{en,hi,ml,ta,kn,mr,te}.json` (copied verbatim from
     `../ElderLink/messages/*.json` — same "keep in sync with the web
     repo" convention as `src/types/index.ts`); `src/i18n/index.ts`
     (`i18next` + `react-i18next`, plus `i18next-icu` — the bundles use
     next-intl's ICU MessageFormat syntax, `"{name}"` /
     `"{count, plural, ...}"`, which i18next doesn't parse by default;
     without the ICU plugin `{name}` renders literally instead of
     interpolating — caught during verification and fixed by adding
     `i18next-icu`/`intl-messageformat` rather than rewriting the bundles);
     `src/components/LanguagePicker.tsx` (`LanguageSwitcherButton` — globe
     icon + modal listing all 7 locales in native script with a checkmark
     on the active one).
   - Persistence: `expo-secure-store` (already a dependency, already used
     for tokens) under key `elderlink_locale` — no cookies (React Native
     has no cookie jar) and no new storage dependency for a 2-character
     value.
   - Login/register tie-break rule (confirmed with the user before
     building): if the user explicitly changed language on a pre-login
     screen this session, that choice wins and is pushed to the server on
     login/register, overwriting the stored value; otherwise the server's
     stored `preferredLocale` (returned in the auth response) is adopted
     locally, restoring whatever was saved last time. Implemented via a
     module-level "touched this session" flag in `src/i18n/index.ts`
     (`markPreLoginLocaleTouched`/`consumePreLoginLocaleTouched`).
   - Entry points: globe-icon switcher on `(auth)/login.tsx`,
     `(auth)/register.tsx`, `(auth)/verify-otp.tsx` (matches where the web
     app places its own switcher); `(family)/dashboard.tsx` header (no
     family settings/profile screen exists to hang it on instead — a
     decision confirmed with the user rather than inventing a new screen);
     `(provider)/profile.tsx` header.
   - String extraction: auth screens (login/register/verify-otp) fully
     wired to `auth.*` keys; provider screens partially wired to matching
     `provider.*` keys only — `dashboard.tsx` (stats, empty state,
     greeting), `jobs/index.tsx` (title, status badges, empty state),
     `jobs/[id].tsx` (chat button, earnings/notes/rating card titles),
     `profile.tsx` (verification status, sign-out). Strings with no
     matching key in the copied bundle (job accept/decline/start/complete
     buttons, the visit-report and review form fields) were deliberately
     left in English rather than inventing new keys that would need
     translating across all 7 locales without review. Family screens are
     entirely untranslated (out of scope, per the confirmed decision) —
     the globe icon is present but only changes strings on screens that
     have translations.
   - Verified: pre-login language switch re-renders login/verify-otp
     instantly; registered a new user with Hindi selected pre-login,
     confirmed the DB row's `preferred_locale` was `"hi"` (direct `psql`
     check) and the register response echoed it; logged out (cleared app
     data to simulate a fresh device) and logged back in **without**
     touching the switcher, confirmed the app auto-restored Hindi from the
     server value with no local state to fall back on; logged in as a
     second, different existing user (whose saved preference was `"en"`)
     while explicitly picking Tamil pre-login, confirmed the app ended up
     in Tamil and the DB row updated to `"ta"` — proving both halves of
     the tie-break rule; used the family dashboard's and provider
     profile's post-login switchers, confirmed each PATCH persisted to the
     DB immediately (`psql` check) and provider-flow strings re-rendered
     without a restart. Caught and fixed the ICU-interpolation bug
     (`{name}` not substituting) mid-verification on the provider
     dashboard's welcome message.
   - Test data (one newly-registered test user and its audit-log row, both
     deleted; two pre-existing seed users' `preferred_locale` touched
     during testing, reverted back to `"en"`) cleaned up afterward.
7. ✅ **First-launch onboarding / landing screen** — built and
   **verified end-to-end** 2026-08-20 on the Android emulator, first
   against a real local `../ElderLink` + Supabase backend, then confirmed
   loading cleanly against QA. Cold start previously went straight from a
   blank loading state into `/(auth)/login` with zero context; this adds a
   single hero/trust screen shown once per install, deliberately not a
   swipeable multi-screen carousel (discussed and rejected as a dated,
   low-read-through pattern that reads as generic-template rather than
   polished).
   - Backend (`../ElderLink`): new public `GET /api/stats` route
     (`src/app/api/stats/route.ts`, no auth, `revalidate = 300`) returning
     `{ verifiedProviderCount, averageRating }` computed from
     `provider_profiles` (`verification_status = 'verified'` count; average
     of the existing denormalized `rating` column, kept in sync by the
     pre-existing `recalculate_provider_rating()` trigger — no new
     aggregation logic needed). Confirmed by direct comparison against
     `psql` that the endpoint returns exactly the real DB numbers, not
     placeholders.
   - New mobile: `app/onboarding.tsx` (hero + real trust signals + primary
     "Get Started" CTA + secondary "How it works" link); `src/onboarding/index.ts`
     (`hasSeenOnboarding`/`markOnboardingSeen` via `expo-secure-store`,
     mirroring the `src/i18n/index.ts` bootstrap pattern, plus the
     `MIN_VERIFIED_PROVIDERS_TO_SHOW` threshold constant); `src/api/stats.ts`
     + `src/hooks/useStats.ts` (public, long `staleTime`, never blocks
     rendering on a slow/failed fetch); `src/components/BottomSheet.tsx`
     (modal/backdrop/rounded-sheet shell extracted out of
     `LanguagePicker.tsx`'s existing inline implementation so the new
     "How it works" sheet didn't duplicate it — `LanguagePicker.tsx`
     refactored to use it, behavior-preserving).
   - Low-count fallback (confirmed with the user before building): below
     `MIN_VERIFIED_PROVIDERS_TO_SHOW` (25), the screen shows qualitative
     trust copy ("Verified, background-checked caregivers") instead of the
     raw count, since a small real number could undercut trust rather than
     build it; the average rating renders independently whenever non-null.
     The threshold lives on the mobile client, not the endpoint, which
     always returns raw truth.
   - `app/_layout.tsx`: new `onboarding` top-level route; `AuthGate` now
     routes an unauthenticated user to `/onboarding` on first launch and to
     `/(auth)/login` on every launch after (gated on the persisted
     SecureStore flag, resolved before first render the same way
     `localeReady` already gates on locale bootstrap).
   - i18n scope (confirmed with the user): onboarding copy is English-only
     this pass — unlike the auth/provider strings, this screen has no
     web-app equivalent bundle to copy verbatim, so translating now would
     mean authoring unreviewed copy in 6 languages.
   - Verified: fresh install (SecureStore flag unset) shows onboarding
     before login, not after; the local dev DB's real count (13 verified
     providers) is below the threshold, so the qualitative fallback
     rendered live (not simulated) while the real 4.6 average rating
     displayed correctly; "How it works" sheet opens showing both role
     sections, scrolls, and dismisses cleanly; "Get Started" routes to
     login and `markOnboardingSeen()` persists — force-stopping and
     relaunching the app skipped onboarding on the second launch; logged in
     as an existing family user (Mayank Goyal) to confirm `AuthGate`'s
     role-based routing to `/(family)/dashboard` still works unchanged;
     confirmed `LanguagePicker` still opens/closes correctly after the
     `BottomSheet` extraction (regression check). Also confirmed the app
     boots cleanly pointed at QA, where the real average rating is
     currently absent (no rated verified providers yet there) — the rating
     line correctly and silently omits itself rather than showing stale or
     fabricated data.
   - **iOS follow-up bug found + fixed (2026-08-20)**: the Android
     verification above didn't surface it, but a true cold launch on the
     iOS Simulator reliably landed on Expo Router's built-in "Unmatched
     Route" screen and stayed there — `AuthGate`'s imperative
     `router.replace(...)` (in its post-mount `useEffect`) never fired
     because there was no `app/index.tsx`, so the router had nothing to
     match at the literal `/` path on cold start. Reproduced consistently
     across repeated cold restarts (`simctl terminate` +
     `simctl openurl exp://.../--/`), confirming it wasn't a one-off
     timing fluke. Fixed by adding `app/index.tsx` (renders the existing
     `LoadingScreen` component) plus a matching `<Stack.Screen name="index" />`
     entry in `app/_layout.tsx` — gives the router a real match for `/` so
     it never falls through to the not-found screen, while `AuthGate`'s
     existing effect (unchanged) redirects away from it immediately, the
     same mechanism it already uses for every other auth-state transition.
     Verified fixed across 3 consecutive full cold restarts on the iOS
     Simulator. This was a latent gap in the pre-existing `AuthGate`
     pattern (not something this feature introduced) that nothing had
     surfaced before, since prior features were only verified on the
     Android emulator.
   - **Visual redesign (2026-08-20)**: the original layout (flat white
     background, plain icon+text rows, system font) was judged too plain
     for a first impression in a trust-sensitive category. Redesigned as a
     gradient hero banner — diagonal blue→violet gradient (drawn with
     `react-native-svg`'s `LinearGradient`, already a dependency, no new
     gradient library) behind the logo/headline with soft translucent
     decorative circles, white text, overlapped by a white rounded-top
     panel holding the trust-signal chips (now icon-badge style — tinted
     circular background behind each lucide icon) and the CTA (kept solid
     brand blue, given a soft colored shadow). Added
     `@expo-google-fonts/plus-jakarta-sans` + `expo-font` (one new
     dependency) for real typographic personality, loaded locally within
     `app/onboarding.tsx` only (not the global root layout) so it doesn't
     add font-load latency to the rest of the app for a screen shown once.
     A subtle fade + upward-translate entrance animation uses React
     Native's built-in `Animated` API — no new dependency. The "How it
     works" sheet's bullets got the same icon-badge treatment for visual
     consistency. Purely visual — none of the underlying logic (`useStats`,
     the threshold fallback, persistence, `AuthGate` routing,
     `BottomSheet` mechanics) changed. Verified on both the Android
     emulator and iOS Simulator: gradient/decorative shapes/font/shadows
     all render correctly on both, status bar icons switch to light style
     against the gradient, trust chips still respect the low-count
     fallback and independent rating gate, "How it works" sheet still
     opens/scrolls/dismisses correctly, and "Get Started" still routes to
     login correctly on both platforms.
8. ✅ **Delhi provider search fix** (2026-08-21) — a user reported that
   searching "Delhi" in the family booking flow returned no providers.
   Root cause was two stacked bugs, not a data gap:
   - `app/(family)/providers/index.tsx` used a free-text `TextInput` for
     city, sent verbatim to the backend, which does an exact
     (case-insensitive) name match with no fuzzy matching — the seeded
     city is named "Delhi NCR," not "Delhi," so it could never match.
   - Even the exact string "Delhi NCR" wouldn't have worked: that city's
     `active` column was `false` (`coming_soon: true`), and the backend
     explicitly blocks bookings for inactive cities — despite 3 real
     verified provider profiles already existing there.
   - Backend (`../ElderLink`): new migration
     `20260821000001_activate_delhi_ncr.sql` (`UPDATE cities SET active =
     true, coming_soon = false WHERE id = '...003'`), applied to the local
     dev DB and confirmed via `psql`. **Not yet applied to QA/production**
     — that requires running the migration through the team's normal
     Supabase deploy process; this machine only has local DB credentials.
   - Mobile: replaced the free-text field with a real picker —
     `src/components/CityPicker.tsx` (new, built on the existing
     `BottomSheet`, with a local search filter) driven by
     `useCities(true)` (new `activeOnly` param on `useCities`/`citiesApi`,
     matching a query param the backend already supported). Selecting a
     city sends its exact canonical name, so no typo/mismatch is possible
     again. Also fixed two real, pre-existing bugs surfaced while touching
     this file: the parent-city pre-fill used `useQuery`'s `onSuccess`,
     removed in React Query v5 (documented in this repo's own `CLAUDE.md`
     gotchas) — dead code, silently never fired; replaced with a
     `useEffect` that matches the parent's saved city string against real
     active cities and leaves the picker unselected on no match rather
     than searching on a guess. And a `cardAvatar` style used `shrink: 0`
     (not a valid RN property, should be `flexShrink: 0`) — both were live
     `tsc` errors already flagged earlier this session as pre-existing;
     `npx tsc --noEmit` is now fully clean.
   - **Bonus bug found and fixed during verification, unrelated to city
     search**: cold-launching the app with an existing session (the most
     common real-world case — any returning logged-in user) hung forever
     on a loading spinner and never reached the dashboard. Root cause in
     `app/_layout.tsx`'s `AuthGate`: the effect's routing conditions
     covered "unauthenticated user" and "authenticated user inside
     `(auth)`," but not "authenticated user on the bare `index` route" —
     the exact case introduced by this morning's iOS `Unmatched Route` fix
     (`app/index.tsx`), which had only been verified for unauthenticated
     cold launches. Fixed by widening the authenticated branch's condition
     to also cover landing on `index`. Verified via repeated full cold
     restarts (force-stop + relaunch) that a logged-in user now reaches
     their dashboard immediately instead of hanging.
   - Verified end-to-end on the Android emulator against local Postgres:
     logged in as an existing family user (Mayank Goyal), opened Book a
     Service → Companion Walk, confirmed the city picker pre-filled to
     "Delhi NCR" (parent-city match), and the two real verified providers
     (Sanjay Kapoor, Neha Singh) rendered — the exact scenario the user
     originally reported as broken. Re-confirmed after the `AuthGate` fix
     that the flow still works end-to-end.
9. ✅ **Native date pickers** (2026-08-21) — the 3 date fields in the app
   (`app/(family)/bookings/new.tsx`'s booking date;
   `app/(family)/recurring/new.tsx`'s start/end date) were free-text
   `TextInput`s expecting a hand-typed `"YYYY-MM-DD"` string, validated by
   regex — the same risky pattern already fixed for city search.
   - New dependency: `@react-native-community/datetimepicker` (installed
     with `--force` due to the same upstream `@radix-ui`/`expo-router` peer
     conflict class already worked around all session — no packages
     removed, confirmed via `package.json` diff).
   - New `src/components/DateField.tsx` — matches the existing `Field`
     component's visual style, opens the native date picker on tap
     (Android: system modal dialog; iOS: inline calendar inside the
     existing `BottomSheet` with a Done button), and formats the
     selection back into the same local-time `"YYYY-MM-DD"` string the
     existing state/validation already expects — no downstream logic
     changed. Exports `parseDateString` (local-time-safe, avoiding the
     UTC-midnight timezone bug `recurring/new.tsx`'s own comments already
     warned about) for reuse where a screen needs to convert a stored date
     string back into a `Date` (e.g. the end-date field's dynamic
     `minimumDate`).
   - Replaced the 3 fields with `DateField`, using `minimumDate={new
     Date()}` (booking date, start date) or `minimumDate={parseDateString(startDate)}`
     (end date, dynamically tracking the chosen start date) — this let the
     manual regex/`isNaN` format-validation in both screens' mutation
     functions be deleted (a valid format is now structurally guaranteed),
     while the semantic checks (can't be in the past, end ≥ start) stay as
     a defense-in-depth safety net.
   - Verified on the Android emulator against local Postgres: the booking
     date picker defaults to today, correctly disables past dates, and a
     full booking submitted through it end-to-end shows the exact picked
     date/time on the confirmation screen (then cancelled to clean up test
     data); the recurring-booking start and end date pickers both open and
     correctly gate dates before their respective minimums.
   - **Time-field follow-up (2026-08-21)**: the same 2 screens' "Time"
     fields had the identical free-text `"HH:MM"` problem, with an added
     real risk the user flagged — some people don't think in 24-hour time,
     so a hand-typed "2:30" for what someone means as 2:30pm silently
     becomes 02:30am, a wrong-time booking with no validation error to
     catch it. New `src/components/TimeField.tsx` (same pattern as
     `DateField`) uses the native time picker, which follows the device's
     own 12-hour/24-hour setting — so a user who thinks in AM/PM gets an
     explicit AM/PM control rather than being forced to reason in 24-hour
     time. The field always *displays* the chosen value as 12-hour with
     AM/PM (e.g. "2:37 PM"), regardless of the device's own display
     setting, so what's shown is never ambiguous either way. Storage
     format (`"HH:MM"` 24-hour) is unchanged, so no downstream logic
     needed to change beyond deleting the now-redundant regex checks (the
     picker structurally guarantees a valid value). `recurring/new.tsx`'s
     local `Field` import became entirely unused after this and was
     removed. Verified on the Android emulator: the native picker shows a
     clock face with an explicit AM/PM toggle, selecting 2:37 PM round-
     tripped correctly and displayed as "2:37 PM" in the field.
10. ✅ **Bottom tab bar decluttered** (2026-08-24) — the user described the
    bottom tab bar as visually cluttered (14 truncated icons on the family
    side, similarly on provider) and proposed a hamburger menu for the
    overflow. Investigation found this wasn't really an information-
    architecture problem: `app/(family)/_layout.tsx` and
    `app/(provider)/_layout.tsx` each only ever *intended* 4 and 3 tabs
    respectively (Home/Parents/Bookings/SOS,
    Dashboard/My Jobs/Profile) — both already clean, idiomatic counts. The
    clutter was a real Expo Router bug: none of the sub-directories
    (`bookings/`, `parents/`, `providers/`, `recurring/`, `jobs/`) have
    their own `_layout.tsx`, so every detail/form screen inside them
    (`bookings/new`, `bookings/[id]`, `bookings/chat/[id]`, `parents/new`,
    `parents/[id]`, `providers/index`, `providers/[id]`,
    `recurring/index`, `recurring/new`, `jobs/[id]`, `jobs/chat/[id]`) was
    being auto-registered by `<Tabs>` as its own separate bottom-tab
    button, since nothing told it not to.
    - Fixed by adding an explicit `<Tabs.Screen name="..." options={{
      href: null }} />` entry for each of those 11 routes across both
      layout files — the standard Expo Router mechanism for keeping a
      route fully navigable (still reachable via `router.push`) while
      excluding it from the tab bar.
    - Recommended against the hamburger menu itself as the wrong pattern
      for a bottom-tab mobile app even as a hypothetical fallback — hidden
      slide-out menus have a well-documented discoverability cost, and the
      idiomatic mobile pattern for genuine tab overflow (past ~5) is a
      "More" tab (a list screen), not a drawer. Moot here since fixing the
      routing bug already brought both bars down to their intended,
      already-reasonable counts.
    - Verified end-to-end on the Android emulator, both roles: logged in
      as an existing family user (Mayank Goyal) — tab bar now shows
      exactly Home/Parents/Bookings/SOS with full labels, no truncation;
      drilled into a booking detail, and through
      Book service → provider list → provider profile (all previously
      auto-added tabs) — confirmed each remains fully navigable as a
      pushed screen with the tab bar unchanged and correctly showing no
      active tab. Logged in as an existing provider user (Priya Sharma) —
      tab bar shows exactly Dashboard/My Jobs/Profile; drilled into a job
      detail (including the "Chat with family" entry point) with the same
      confirmation.

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
