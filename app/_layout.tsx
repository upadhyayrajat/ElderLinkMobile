import { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import { useAuthStore } from "@/src/store/auth";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

export default function RootLayout() {
  const { loadSession } = useAuthStore();

  useEffect(() => {
    loadSession();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="dark" />
      <AuthGate />
    </QueryClientProvider>
  );
}

// Redirects unauthenticated users to (auth) and authenticated users away from it.
function AuthGate() {
  const { user, isLoaded } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!user && !inAuthGroup) {
      router.replace("/(auth)/login");
    } else if (user && inAuthGroup) {
      if (user.role === "provider") {
        router.replace("/(provider)/dashboard");
      } else if (user.role === "company") {
        router.replace("/(family)/dashboard"); // company portal TBD
      } else {
        router.replace("/(family)/dashboard");
      }
    }
  }, [user, isLoaded, segments]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(family)" />
      <Stack.Screen name="(provider)" />
    </Stack>
  );
}
