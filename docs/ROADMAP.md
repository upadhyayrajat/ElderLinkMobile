# ElderLinkMobile — Status & Roadmap

Last updated: 2026-08-18, based on a full audit of the repo (every screen
under `app/`, every file under `src/api/`, `src/types/index.ts` diffed
against the web app, `app.json`/CI/build config). Treat this document as
ground truth over the "Known gaps" table in `README.md` — that table is
stale and understates how much of the app is actually built.

## Current state

### The screen/UI layer is solid

Every route under `app/` is a real, working screen: live data via React
Query, working mutations, loading/empty/error states. Nothing is a stub or
placeholder. In particular, contrary to `README.md`'s "Known gaps" table:

- `app/(provider)/jobs/[id].tsx` **exists and works** — full status-transition
  lifecycle (accept/decline/start/complete) with a live location-sharing
  loop while `in_progress`.
- `app/(family)/bookings/[id].tsx` **exists and works** — full detail view
  with a cancel mutation.
- `app/(family)/parents/new.tsx` **exists and works** — full validated form.

The README's "Not built" claims for these three screens should be
disregarded; they were written before these screens landed and never
updated.

### The real risk: the API integration layer

This is where the actual gaps are, and some are more serious than anything
the README documents:

1. **New users cannot sign up on mobile at all.** When `verifyOtp()` returns
   `{status: "new_user"}`, there is no way to complete registration and get
   back a session. The only registration endpoint
   (`POST /api/users/register` in the web repo) is web-only: it sets an
   httpOnly cookie and returns no tokens. This needs a new backend endpoint
   — `POST /api/auth/mobile/register` — mirroring the existing
   `/api/auth/mobile/send-otp` / `/verify-otp` / `/refresh` pattern, but
   returning `{accessToken, refreshToken, user}` instead of setting a
   cookie. Until this exists, nobody new can onboard through the app.
2. **4 of the 12 API client files call URLs that don't exist on the
   backend** and will 404 in production:
   - `src/api/family-members.ts` — `invite`/`updateRole`/`remove` all hit
     wrong paths (missing the parent-profile id segment the real routes
     require)
   - `src/api/recurring-bookings.ts` — wrong base path
     (`/api/family/recurring-bookings...` vs. the real
     `/api/family/recurring...`)
   - `src/api/reviews.ts` — calls a top-level `/api/reviews` that doesn't
     exist; the real routes are per-role and per-booking
     (`/api/family/bookings/[id]/review`, `/api/provider/bookings/[id]/review`)
   - `src/api/service-reports.ts` — wrong path
     (`/api/provider/service-reports` vs. the real `/api/provider/reports`)
3. **A real concurrency bug in the token-refresh interceptor**
   (`src/api/client.ts`): if a token refresh fails while other requests are
   queued behind it, those queued requests are never resolved *or*
   rejected — they hang forever, silently stranding whatever screen
   triggered them in a permanent loading state.
4. **`src/types/index.ts` has drifted from the web app.** Missing: the
   `Zone` type, the `SupportedLocale` type, and these fields —
   `User.preferredLocale`, `User.consentGivenAt`, `User.erasureRequestedAt`,
   `ParentProfile.zoneId`, `ProviderProfile.zoneIds`, `Booking.companyId`,
   `CompanyProfile.zoneIds`, `CompanyEmployee.leftAt`. This is a standing
   maintenance gap — every future web schema change needs to be manually
   ported here, and nothing currently catches drift automatically.
5. **DPDP compliance gap**: `/api/user/consent` and `/api/user/erasure`
   have no mobile client. A new mobile user has no way to record consent,
   and no way to exercise their right to erasure — both mandatory per the
   web repo's `CLAUDE.md`.
6. **No mobile coverage at all for**: in-app chat (booking-level
   messaging), NPS surveys, zone-based provider matching. Real feature
   gaps, not documented anywhere else.
7. `app/(provider)/profile.tsx` calls `/api/provider/profile` directly via
   raw Axios instead of going through `src/api/`, breaking this repo's own
   convention ("Always use `src/api/*.ts` files — never call Axios
   directly in screens").
8. `src/hooks/*.ts` and most of `src/components/*.tsx` (`Field`, `TopBar`,
   `StatusBadge`, `Card`, `EmptyState`, `LoadingScreen`) are defined but
   never imported by any screen — every screen reimplements its own inline
   version instead. Doc/code convention drift, not a functional bug, but
   worth cleaning up so the documented conventions become true again.
9. The documented "all API routes return `{data, error, message}`" contract
   (stated in both repos' `CLAUDE.md`) is **not actually true** for most
   routes today — only the newest route (`/api/user/locale`) follows it.
   Most CRUD routes return `{data}`/`{error}` (two keys), and the mobile
   auth routes return flat, route-specific shapes. Worth knowing before
   building the next API client by copying the documented convention
   instead of the actual response.

### Testing & deployment infrastructure is at zero, but the gap to start is small

- No test files anywhere, no test runner configured, no `test` script.
- No `eas.json` — EAS build has never been configured.
- `app.json` references two asset files that don't exist:
  `assets/adaptive-icon.png` (the assets folder instead has the newer
  themed-icon trio — `android-icon-foreground/background/monochrome.png`
  — but `app.json` still points at the old single-file field) and
  `assets/notification-icon.png` (self-documented as missing in the old
  README gap table).
- No Firebase project / `google-services.json` yet (expected — gitignored,
  needs to be generated).
- CI (`.github/workflows/ci.yml`) runs only `tsc --noEmit`, despite the job
  being named `lint-and-typecheck` — no actual lint step, no test step, no
  build step.

**The good news**: neither `react-native-maps` nor `expo-notifications` is
actually wired into any screen's code yet (both are installed but unused),
so nothing in the current feature set requires a native dev build. **The
app is fully testable in Expo Go today.**

## Roadmap

### Phase 0 — Fix correctness bugs
Blocks everything else from being meaningful. Spans both repos:
- [ ] Add `POST /api/auth/mobile/register` (web repo)
- [ ] Fix the 4 broken API paths (`family-members.ts`, `recurring-bookings.ts`,
      `reviews.ts`, `service-reports.ts`)
- [ ] Fix the refresh-queue hang bug in `src/api/client.ts`
- [ ] Sync `src/types/index.ts` with the web app's current types
- [ ] Add mobile clients for `/api/user/consent` and `/api/user/erasure`

### Phase 1 — Start testing now (Expo Go, no new infra needed)
1. `cd ElderLinkMobile && npm install`
2. `cp .env.local.example .env.local` — point `EXPO_PUBLIC_API_BASE_URL` at
   the running web app (`http://10.0.2.2:3000` for Android emulator, your
   LAN IP for a physical phone)
3. In the web repo's `.env.local`, set `SKIP_OTP_VERIFICATION=true` to log
   in with any 6-digit code without real SMS
4. `npx expo start` → scan with Expo Go (or `npm run android` for an
   emulator)
5. Walk the family flow (add parent → browse providers → book → SOS) and
   provider flow (dashboard → accept job → complete → location sharing)
6. Add real automated tests — start with `jest-expo` +
   `@testing-library/react-native` for the API client and store logic (the
   refresh-queue bug above is exactly what a unit test would catch).
   Detox/Maestro for end-to-end once screens stabilize.

### Phase 2 — Deployment plumbing
- [ ] `eas build:configure` → `eas.json` with `development`/`preview`/
      `production` profiles, each with its own `EXPO_PUBLIC_API_BASE_URL`
- [ ] Fix the two broken asset references in `app.json`
- [ ] Firebase project + `google-services.json` for push
- [ ] Confirm `com.elderlink.app` is registered/available on the Apple
      Developer and Google Play Console accounts
- [ ] Expand CI beyond type-check-only: add the Phase 1 test suite, later
      an EAS build trigger on `qa`

### Phase 3 — Feature completion
- [ ] Wire up `react-native-maps` (GPS tracking) and `expo-notifications`
      (device registration — `registerDevice()` exists but is never called)
- [ ] Razorpay payments (not started)
- [ ] UI for recurring bookings, service reports, family sharing, reviews
      (backends exist, no mobile screens)
- [ ] Chat and NPS survey screens
- [ ] Zone-based provider matching
- [ ] Decide how company-role users should be handled (currently silently
      routed into the family UI)

### Phase 4 — Store submission
- [ ] TestFlight / Play Console internal testing
- [ ] Store listing assets, privacy policy URL, permission-usage
      justifications for location/camera/notification permissions
