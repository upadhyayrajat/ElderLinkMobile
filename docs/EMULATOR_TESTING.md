# Running ElderLinkMobile on the Android Emulator

How to test this app locally without a physical device, using an Android
emulator. Written after setting this up on this machine (Apple Silicon Mac)
on 2026-08-19 — the one-time setup section already happened here; skip to
"Every time you want to test" if the AVD `ElderLinkTest` already exists
(`avdmanager list avd` to check).

The mobile app never talks to Supabase directly — it only calls the
`../ElderLink` web app's API routes, which in turn talk to Supabase. So
testing always requires the web app (and its local Supabase stack) running
alongside the emulator.

## One-time setup

Installs a JDK and the Android SDK command-line tools via Homebrew — no
Android Studio, no `sudo`, no Google/Apple account needed.

```bash
brew install openjdk@17
brew install --cask android-commandlinetools
```

Add these to your shell profile (`~/.zshrc`) so every new terminal has them:

```bash
export JAVA_HOME=/opt/homebrew/opt/openjdk@17
export ANDROID_HOME=/opt/homebrew/share/android-commandlinetools
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH"
```

Accept the SDK licenses and install the platform, emulator, and a system
image matched to your Mac's chip (arm64 for Apple Silicon):

```bash
yes | sdkmanager --licenses
sdkmanager "platform-tools" "emulator" "platforms;android-34" "system-images;android-34;google_apis;arm64-v8a"
```

Create the virtual device once (skip if `avdmanager list avd` already shows
`ElderLinkTest`):

```bash
avdmanager create avd -n ElderLinkTest -k "system-images;android-34;google_apis;arm64-v8a" -d pixel_6
```

> Note: this system image (`google_apis`, not `google_apis_playstore`) has
> no Play Store. Expo Go has to be sideloaded once — see the Expo Go section
> below — rather than installed from the Play Store inside the emulator.

## Every time you want to test

1. **Start the local Supabase stack** (in `../ElderLink`):
   ```bash
   cd ../ElderLink && supabase status   # 'supabase start' if it's not running
   ```

2. **Start the web app**:
   ```bash
   cd ../ElderLink && npm run dev       # http://localhost:3000
   ```
   Confirm `SKIP_OTP_VERIFICATION=true` is set in `../ElderLink/.env.local` —
   it lets you log in with any 6-digit code instead of real SMS.

3. **Boot the emulator**:
   ```bash
   emulator -avd ElderLinkTest
   ```
   A real emulator window opens on your screen.

4. **Point the mobile app at the web app.** `ElderLinkMobile/.env.local`
   should have:
   ```
   EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:3000
   ```
   (`10.0.2.2` is the Android emulator's fixed alias for your Mac's
   `localhost` — this is why it's not just `localhost:3000`.)

5. **Start Expo and launch the app**:
   ```bash
   cd ElderLinkMobile && npx expo start
   ```
   Once Metro is ready, press **`a`** in that terminal. This auto-installs
   Expo Go on the emulator if it's missing and launches the app. If it fails
   because Expo Go can't be fetched from the (missing) Play Store, sideload
   it manually once:
   ```bash
   curl -sSL -o /tmp/expo-go.apk "https://github.com/expo/expo-go-releases/releases/download/Expo-Go-56.0.4/Expo-Go-56.0.4.apk"
   adb install -r /tmp/expo-go.apk
   ```
   Use the exact SDK-matched build from `https://api.expo.dev/v2/versions/latest`
   (look up the `56.0.0` entry's `androidClientUrl`/`androidClientVersion` —
   adjust `56.0.0`/`56.0.4` if the project's SDK version has moved on) —
   the generic "latest" Expo Go download can be a version behind and will
   refuse to open the project with a "requires a newer version" error.

6. **Log in** with a seeded test number and any 6-digit code:
   - Provider: `+919800000003` (Amit Yadav)
   - Family: `+919600000001` (Mayank Goyal)

## The DPDP consent gate

The web app's middleware redirects any authenticated API request to a
consent page for users who haven't given consent — and since there's no
consent screen built in the mobile app yet, any seeded user other than the
two above will get stuck. Grant consent directly for whichever user you want
to test with:

```sql
update users set consent_given_at = now() where phone = '+91XXXXXXXXXX';
```

Run it via `psql "$DATABASE_URL"` in `../ElderLink` (the connection string is
in `.env.local`), or through Supabase Studio at `http://localhost:54323`.

## Useful commands while testing

```bash
adb devices                                   # confirm the emulator is attached
adb exec-out screencap -p > screen.png        # grab a screenshot
adb shell input tap <x> <y>                   # tap a coordinate
adb shell input text "hello"                  # type text into a focused field
adb logcat *:S ReactNative:V ReactNativeJS:V  # view JS console/error logs
```
