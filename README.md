# ElderLink Mobile

React Native + Expo app for the ElderLink care platform. Supports the **family** portal (book care, SOS alerts) and **provider** portal (manage jobs, submit reports).

> The web app lives at `~/gitProjects/ElderLink/`. This is a **separate project** — not a monorepo. Both projects talk to the same Next.js backend over HTTP.

---

## Project layout

```
~/gitProjects/
├── ElderLink/           ← Next.js web app + REST API
└── ElderLinkMobile/     ← This repo (React Native + Expo)
```

The mobile app calls the same API endpoints as the web browser. Domain types (`src/types/index.ts`) are a copy of the web app's types and must be kept in sync.

---

## Prerequisites

### Node.js
Node 18 or later is required.

```bash
node --version   # should be 18+
```

### Android tooling — pick one

**Option A: Expo Go on a physical phone (fastest start, no installation)**
1. Install [Expo Go](https://play.google.com/store/apps/details?id=host.exp.exponent) from the Play Store
2. Phone and laptop must be on the **same Wi-Fi network**
3. Run `npx expo start` → scan the QR code
4. Limitation: push notifications and native Razorpay SDK don't work in Expo Go

**Option B: Android Emulator (full fidelity)**
1. Install [Android Studio](https://developer.android.com/studio)
2. Android Studio → SDK Manager → install **Android 14 (API 34)** or newer
3. Android Studio → Device Manager → create a **Pixel 7 AVD** (API 34, x86_64)
4. Start the AVD, then run `npm run android`

**Option C: Physical device via USB**
1. On the phone: Settings → About Phone → tap **Build Number** 7 times → Developer Options enabled
2. Developer Options → enable **USB Debugging**
3. Connect via USB cable, accept the RSA fingerprint prompt
4. Run `npm run android`

---

## First-time setup

```bash
cd ~/gitProjects/ElderLinkMobile

# Install dependencies (already done if you cloned with npm install)
npm install

# Configure the API URL
cp .env.local.example .env.local
```

Edit `.env.local`:

```env
# For Android Emulator — emulator reaches host machine as 10.0.2.2
EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:3000

# For physical device — use your machine's LAN IP
# EXPO_PUBLIC_API_BASE_URL=http://192.168.1.x:3000
```

---

## Running the app

### 1. Start the backend first

```bash
cd ~/gitProjects/ElderLink
npm run dev          # Next.js on localhost:3000
```

Enable the dev OTP shortcut so you don't need real SMS during development — add this to `ElderLink/.env.local`:

```env
SKIP_OTP_VERIFICATION=true
```

With this flag set, **any 6-digit code is accepted** and the OTP is printed to the Next.js terminal.

### 2. Start the mobile app

```bash
cd ~/gitProjects/ElderLinkMobile

npm run android      # emulator or USB device
# OR
npx expo start       # QR code for Expo Go
```

The first build takes ~2 minutes to install the APK. Subsequent runs use the Metro cache (< 15 s).

### Hot reload

| Action | Effect |
|--------|--------|
| Save a file | JS updates instantly — no APK reinstall |
| Shake the device | Expo developer menu (reload, inspector) |
| Press `r` in terminal | Force full reload |

---

## Auth flow (end-to-end test)

```
Enter phone number  →  POST /api/auth/mobile/send-otp
Enter OTP           →  POST /api/auth/mobile/verify-otp
                        ← { accessToken, refreshToken, user }
Tokens stored in Expo SecureStore
All subsequent API calls → Authorization: Bearer <accessToken>
401 response        →  POST /api/auth/mobile/refresh  (silent, via axios interceptor)
```

With `SKIP_OTP_VERIFICATION=true`, type any 6 digits (e.g. `123456`) to log in.

---

## Screen map

### Auth screens (`app/(auth)/`)
| File | Route | Purpose |
|------|-------|---------|
| `login.tsx` | `/login` | Phone number input |
| `verify-otp.tsx` | `/verify-otp` | 6-digit OTP entry |
| `register.tsx` | `/register` | Name + role selection for new users |

### Family portal (`app/(family)/`)
| File | Route | Purpose |
|------|-------|---------|
| `dashboard.tsx` | `/dashboard` | Active bookings + quick actions |
| `parents/index.tsx` | `/parents` | List of parent profiles |
| `bookings/index.tsx` | `/bookings` | Full booking history |
| `sos.tsx` | `/sos` | Emergency SOS button |

### Provider portal (`app/(provider)/`)
| File | Route | Purpose |
|------|-------|---------|
| `dashboard.tsx` | `/dashboard` | Stats + active jobs |
| `jobs/index.tsx` | `/jobs` | All assigned jobs |
| `profile.tsx` | `/profile` | Profile + sign out |

---

## Known gaps (Phase M2 work)

| Feature | Status | What's needed |
|---------|--------|---------------|
| Push notifications | Not wired | `google-services.json` from Firebase (see below) |
| Maps / GPS tracking | Package installed, not rendered | `EXPO_PUBLIC_GOOGLE_MAPS_KEY` in `.env.local` |
| Razorpay payments | Not implemented | `react-native-razorpay` + Razorpay test keys |
| Notification icon | Missing asset | Create `assets/notification-icon.png` (96×96 px, white on transparent) |
| Job detail screen | Not built | `app/(provider)/jobs/[id].tsx` |
| Booking detail screen | Not built | `app/(family)/bookings/[id].tsx` |
| Parent add form | Not built | `app/(family)/parents/new.tsx` |

### Setting up push notifications (Firebase)
1. [Firebase Console](https://console.firebase.google.com) → New project → Add Android app
2. Package name: `com.elderlink.app`
3. Download `google-services.json` → place it at the root of this project
4. Add `google-services.json` to `.gitignore` (never commit — contains API keys)
5. Run `npm run android` to rebuild with the new config

---

## Environment variables reference

```env
# Required
EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:3000

# Optional
EXPO_PUBLIC_GOOGLE_MAPS_KEY=AIzaSy...        # for react-native-maps
```

All `EXPO_PUBLIC_*` vars are bundled into the app at build time — never put secrets here.

---

## Building a release APK

```bash
# Install EAS CLI (one time)
npm install -g eas-cli

# Log in to Expo account
eas login

# Configure the project (one time)
eas build:configure

# Build for Android
eas build --platform android --profile preview
```

The `preview` profile produces an APK for internal testing. Use `production` for Play Store submission.
