// Central place for all environment-dependent constants.
// Update API_BASE_URL before building for production.

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:3000";
