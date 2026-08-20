import * as SecureStore from "expo-secure-store";

export const ONBOARDING_SEEN_KEY = "elderlink_onboarding_seen";

// Below this many verified providers, the onboarding screen shows
// qualitative trust copy instead of the raw count — a technically-true
// but very small number would undercut trust rather than build it.
export const MIN_VERIFIED_PROVIDERS_TO_SHOW = 25;

export async function hasSeenOnboarding(): Promise<boolean> {
  const value = await SecureStore.getItemAsync(ONBOARDING_SEEN_KEY);
  return value === "1";
}

export async function markOnboardingSeen(): Promise<void> {
  await SecureStore.setItemAsync(ONBOARDING_SEEN_KEY, "1");
}
