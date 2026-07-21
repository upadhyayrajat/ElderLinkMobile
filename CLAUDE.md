# ElderLink Mobile — Claude Code Context

React Native / Expo companion app for the ElderLink platform.
Read this before making any changes to this repo.

> **Read Expo versioned docs before writing any code:** https://docs.expo.dev/versions/v56.0.0/
> **Web repo context (API routes, DB schema, domain types):** see `ElderLink/CLAUDE.md` in the sibling repo at `../ElderLink/`

---

## What this app does

Mobile client for the ElderLink elder-care marketplace. Covers two roles:
- **Family users** — add parent profiles, browse providers, book services, trigger SOS
- **Providers** — view assigned jobs, update booking status, post live location during outings

The **web app** (`../ElderLink/`) is the source of truth for the API, database, and business logic.
This app is a consumer of those APIs — it never talks to Supabase directly.

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Expo SDK 56 + Expo Router v4 (file-based routing) |
| Language | TypeScript 6 (strict) |
| State | Zustand (auth store only) |
| Data fetching | TanStack React Query v5 |
| HTTP | Axios with auto token refresh interceptor |
| Token storage | `expo-secure-store` (never AsyncStorage for secrets) |
| Icons | `lucide-react-native` |
| Maps | `react-native-maps` |
| Location | `expo-location` |
| Push notifications | `expo-notifications` |
| Image picker | `expo-image-picker` |

---

## Project structure

```
ElderLinkMobile/
├── app/                         # Expo Router screens (file = route)
│   ├── _layout.tsx              # Root layout: QueryClient, auth gate, session load
│   ├── (auth)/                  # Unauthenticated routes
│   │   ├── login.tsx            # Phone input → send OTP
│   │   ├── register.tsx         # Name + phone → send OTP (new user)
│   │   └── verify-otp.tsx       # OTP entry → session
│   ├── (family)/                # Family user tab navigator
│   │   ├── dashboard.tsx        # Active bookings + quick actions
│   │   ├── parents/             # Parent profile CRUD
│   │   ├── bookings/            # Booking list + detail + new booking
│   │   ├── providers/           # Provider search + detail
│   │   ├── services/            # Service catalogue
│   │   └── sos.tsx              # One-tap SOS trigger
│   └── (provider)/              # Provider tab navigator
│       ├── dashboard.tsx        # Provider home
│       ├── jobs/                # Job list + detail (accept/decline/complete)
│       └── profile.tsx          # Provider profile view
├── src/
│   ├── api/                     # One file per API domain — wraps web app API routes
│   │   ├── client.ts            # Axios instance: Bearer token + silent 401 refresh
│   │   ├── auth.ts              # sendOtp, verifyOtp, registerDevice
│   │   ├── bookings.ts          # Family + provider booking actions
│   │   ├── parents.ts           # Parent profile CRUD
│   │   ├── providers.ts         # Provider search + detail
│   │   ├── services.ts          # Service type catalogue
│   │   ├── cities.ts            # City list (all cities, not activeOnly)
│   │   ├── sos.ts               # SOS trigger + resolve
│   │   ├── recurring-bookings.ts # Recurring booking CRUD + pause/resume
│   │   ├── service-reports.ts   # Provider submits, family reads
│   │   ├── family-members.ts    # Invite + manage family sharing members
│   │   └── reviews.ts           # Post-booking two-way reviews
│   ├── components/              # Shared React Native UI components
│   │   ├── Field.tsx            # Labelled TextInput with hint + required marker
│   │   ├── TopBar.tsx           # Screen header with back button + optional right slot
│   │   ├── StatusBadge.tsx      # BookingStatus coloured pill
│   │   ├── Card.tsx             # White rounded card with shadow
│   │   ├── EmptyState.tsx       # Empty list placeholder with optional CTA
│   │   └── LoadingScreen.tsx    # Full-screen ActivityIndicator
│   ├── hooks/                   # React Query hooks (one per domain)
│   │   ├── useBookings.ts       # useFamilyBookings, useBooking, useCreateBooking, …
│   │   ├── useParents.ts        # useParents, useParent, useCreateParent, useUpdateParent
│   │   ├── useProviders.ts      # useProviders(params), useProvider(id)
│   │   ├── useServices.ts       # useServices (staleTime: 10 min)
│   │   └── useCities.ts         # useCities (staleTime: 30 min)
│   ├── store/
│   │   └── auth.ts              # Zustand store: user, setSession, clearSession, loadSession
│   ├── types/
│   │   └── index.ts             # Domain types — KEEP IN SYNC with ../ElderLink/src/types/index.ts
│   ├── lib/
│   │   └── env.ts               # API_BASE_URL from expo-constants / env
│   └── utils/
│       └── phone.ts             # INDIA_PHONE_REGEX, INTL_PHONE_REGEX
├── assets/                      # App icons and splash
├── app.json                     # Expo config (bundle ID, permissions, splash)
└── .env.local.example           # Required env vars
```

---

## Key conventions

### Auth flow
1. User enters phone → `authApi.sendOtp()` → POST `/api/auth/mobile/send-otp`
2. User enters OTP → `authApi.verifyOtp()` → POST `/api/auth/mobile/verify-otp`
3. Response: `{ accessToken, refreshToken, user }` → stored in `SecureStore` via `useAuthStore.setSession()`
4. All subsequent requests attach `Authorization: Bearer <accessToken>` via Axios interceptor
5. On 401: interceptor attempts silent refresh via `/api/auth/mobile/refresh` once, then clears session

### API calls
- Always use `src/api/*.ts` files — never call Axios directly in screens
- Prefer `src/hooks/*.ts` for data-fetching — they wrap React Query and handle cache invalidation
- All API responses follow `{ data, error, message }` shape (mirrors the web app)

### Navigation
- Expo Router file-based: `app/(family)/bookings/[id].tsx` → route `/(family)/bookings/:id`
- Use `useRouter().push(path as any)` for navigation (TypeScript strict mode requires the cast)
- After mutations that change list state, use `router.replace()` not `router.push()` to avoid back-stack buildup

### Shared components
- Use `<Field />` for all form inputs — do not define inline `Field` components in screens
- Use `<TopBar />` for all screen headers with back navigation
- Use `<StatusBadge status={booking.status} />` for booking status display
- Use `<EmptyState />` for empty list states
- Use `<LoadingScreen />` for full-screen loading

### Types
`src/types/index.ts` must stay in sync with `../ElderLink/src/types/index.ts`.
When domain types change in the web repo, copy the changes here too.

### Phone numbers
Always stored and validated as `+91XXXXXXXXXX`. Use `INDIA_PHONE_REGEX` from `src/utils/phone.ts`.

### Amounts
All monetary values in paise (INR × 100). Display as `₹${(paise/100).toLocaleString("en-IN")}`.

---

## Environment variables

See `.env.local.example`. One required variable:

| Variable | Description |
|---|---|
| `EXPO_PUBLIC_API_BASE_URL` | Base URL of the web API (e.g. `https://elderlink-qa.vercel.app` for QA, production URL for prod) |

---

## Running locally

```bash
npm install
npm start          # opens Expo dev tools
npm run android    # run on Android emulator / device
npm run ios        # run on iOS simulator / device
```

Requires the web app (`../ElderLink/`) running locally or pointed at the QA/prod URL.

---

## Known issues / gotchas

- **React Query v5**: `onSuccess` is removed from `useQuery` options. Use `useEffect` watching the data instead.
- **Expo Router navigation types**: TypeScript doesn't know route paths as string literals — use `as any` casts.
- **`expo-secure-store`**: Max value size is 2KB. Do not store large objects — store tokens and minimal user info only.
- **Push notifications**: Device token registration happens in the root layout after login via `authApi.registerDevice()`. Ensure notification permissions are requested before registration.
- **Maps on Android**: `react-native-maps` requires `MAPS_API_KEY` in `app.json` `android.config.googleMaps.apiKey`.

---

## What's NOT in this app (web-only features)

- Admin portal — web only
- Company portal — web only
- Provider onboarding / document upload — web only
- Subscription plan management — web only
- Terraform / infrastructure — see `../ElderLink/infra/`
