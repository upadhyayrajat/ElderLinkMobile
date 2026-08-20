import { useEffect, useState } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import { useAuthStore } from "@/src/store/auth";
import { bootstrapLocale } from "@/src/i18n";
import { hasSeenOnboarding } from "@/src/onboarding";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

export default function RootLayout() {
  const { loadSession } = useAuthStore();
  const [localeReady, setLocaleReady] = useState(false);
  const [seenOnboarding, setSeenOnboarding] = useState<boolean | null>(null);

  useEffect(() => {
    loadSession();
    bootstrapLocale().finally(() => setLocaleReady(true));
    hasSeenOnboarding().then(setSeenOnboarding);
  }, []);

  if (!localeReady || seenOnboarding === null) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="dark" />
      <AuthGate seenOnboarding={seenOnboarding} />
    </QueryClientProvider>
  );
}

// Redirects unauthenticated users to onboarding (first launch) or (auth)
// (repeat launches), and authenticated users away from (auth) or the bare
// index route (e.g. a cold launch with an existing session) to their
// role's dashboard.
function AuthGate({ seenOnboarding }: { seenOnboarding: boolean }) {
  const { user, isLoaded } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded) return;

    const firstSegment: string | undefined = segments[0];
    const inAuthGroup = firstSegment === "(auth)";
    const onOnboarding = firstSegment === "onboarding";
    const onIndex = firstSegment === undefined || firstSegment === "index";

    if (!user && !inAuthGroup && !onOnboarding) {
      router.replace(seenOnboarding ? "/(auth)/login" : "/onboarding");
    } else if (user && (inAuthGroup || onIndex)) {
      if (user.role !== "provider" && user.role !== "family") {
        // "company", "admin", or any future role with no mobile experience yet.
        router.replace("/unsupported-role");
      } else if (!user.consentGiven) {
        // DPDP Act 2023 — family/provider users must consent before using the app.
        // The consent screen itself navigates onward once recorded.
        router.replace("/consent");
      } else if (user.role === "provider") {
        router.replace("/(provider)/dashboard");
      } else {
        router.replace("/(family)/dashboard");
      }
    }
  }, [user, isLoaded, segments, seenOnboarding]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(family)" />
      <Stack.Screen name="(provider)" />
      <Stack.Screen name="unsupported-role" />
      <Stack.Screen name="consent" />
    </Stack>
  );
}
