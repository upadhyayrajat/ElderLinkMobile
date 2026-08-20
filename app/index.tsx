import { LoadingScreen } from "@/src/components/LoadingScreen";

// Gives Expo Router a real match for "/" so it never falls through to its
// built-in Unmatched Route screen on cold launch. AuthGate (in _layout.tsx)
// redirects away from here via the same effect it already uses for every
// other auth-state transition.
export default function Index() {
  return <LoadingScreen />;
}
