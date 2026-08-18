// Central domain types for ElderLink.
// All API routes, repositories, and components import from here — never define inline types elsewhere.
// Conventions enforced across all types:
//   - All monetary values are in paise (INR × 100) to avoid floating-point errors
//   - All timestamps are ISO 8601 UTC strings
//   - Phone numbers include country code: +91XXXXXXXXXX
//
// Types are grouped by the phase in which they are built.

// ─── Platform catalogue types ─────────────────────────────────────────────────

// A city in the ElderLink service catalogue. Admins control which cities are
// active (open for bookings) vs coming soon vs not yet listed.
export interface City {
  id: string;
  name: string;
  state: string;
  active: boolean;       // true = open for bookings
  comingSoon: boolean;   // true = show "launching soon" on landing page
  displayOrder: number;
  createdAt: string;
}

// A geographic sub-area within a large city (e.g. "South Delhi", "Bandra / Khar").
// Providers select which zones they serve; parents are auto-assigned a zone from pincode.
// Cities without zones (small/medium cities) use city-level matching as before.
export interface Zone {
  id: string;
  cityId: string;
  name: string;
  pincodePrefix: string[]; // full 6-digit pincodes that fall in this zone
  displayOrder: number;
  createdAt: string;
}

// ─── Shared primitives ────────────────────────────────────────────────────────

export type UserRole = "family" | "provider" | "company" | "admin";

// Full state machine: pending → confirmed → in_progress → completed
//                               ↘ cancelled              ↘ disputed → refunded
// Transitions happen server-side only via BookingRepository.transition()
export type BookingStatus =
  | "pending"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "disputed"
  | "refunded";

// Tracks whether a provider's identity documents have been verified by an admin
export type VerificationStatus = "unverified" | "pending" | "verified" | "rejected";

export type NotificationChannel = "in_app" | "sms" | "whatsapp";

// Mirrors Razorpay payment lifecycle
export type PaymentStatus = "created" | "captured" | "failed" | "refunded";

// ─── PHASE 1 — Core entities ──────────────────────────────────────────────────

export interface User {
  id: string;
  phone: string; // +91XXXXXXXXXX — primary identifier; no passwords used
  email?: string;
  name: string;
  role: UserRole;
  consentGivenAt?: string;     // DPDP Act: timestamp of explicit data consent
  erasureRequestedAt?: string; // DPDP Act: set when user invokes right-to-erasure
  preferredLocale: SupportedLocale;
  createdAt: string;
  updatedAt: string;
}

// Phase 1 of i18n covers the provider flow + shared pre-login auth screens.
export type SupportedLocale = "en" | "hi" | "ml" | "ta" | "kn" | "mr" | "te";

// Represents the elderly parent being cared for — created by a family user.
// Contains sensitive health data; Supabase RLS restricts reads to the owning family user
// and any invited FamilyMember records.
export interface ParentProfile {
  id: string;
  familyUserId: string; // the owner — the family member who created this profile
  name: string;
  age: number;
  address: string;
  city: string;
  pincode: string;
  zoneId?: string | null; // auto-populated from pincode at save; null = pincode not matched to any zone
  mobilityNotes?: string; // e.g. "uses a walker", "wheelchair user"
  medicalNotes?: string;  // e.g. "diabetic", "takes blood thinners"
  emergencyContactName: string;
  emergencyContactPhone: string;
  createdAt: string;
  updatedAt: string;
}

// A caregiver or service provider registered on the platform.
// Only shown in search results once verificationStatus === "verified".
export interface ProviderProfile {
  id: string;
  userId: string;
  bio: string;
  services: string[]; // array of ServiceType IDs this provider offers
  cityIds: string[];  // array of City IDs from the cities catalogue
  zoneIds: string[];  // array of Zone IDs; empty = serve entire city (city-level fallback)
  rating: number;     // 0–5, recalculated on each new Review
  reviewCount: number;
  verificationStatus: VerificationStatus;
  photoUrl: string | null;              // profile photo — mandatory before appearing in search
  policeVerificationUrl: string | null; // police clearance certificate — mandatory before appearing in search
  idDocumentUrl: string | null;         // government ID (Aadhaar/PAN) — uploaded during onboarding
  rejectionReason: string | null;       // set by admin when rejecting verification
  trustScore: number;                   // composite 0–100: rating + verification + completion rate + experience
  createdAt: string;
  updatedAt: string;
}

// A type of service offered on the platform (e.g. "Companionship Walk", "Medication Pickup").
// Managed by admins; providers select which types they offer.
export interface ServiceType {
  id: string;
  name: string;
  description: string;
  basePriceInPaise: number; // starting price; final price negotiated per booking
  durationMinutes: number;
}

// A single entry in a booking's audit trail — written on every status transition
export interface BookingStatusEvent {
  status: BookingStatus;
  actorId: string; // user ID of whoever triggered the transition
  timestamp: string;
}

export interface Booking {
  id: string;
  familyUserId: string;
  parentProfileId: string;
  providerUserId: string;
  serviceTypeId: string;
  recurringBookingId?: string; // set if this booking was auto-generated by a RecurringBooking
  companyId?: string;          // set when provider is a company employee; used for revenue attribution
  status: BookingStatus;
  scheduledAt: string;
  durationMinutes: number;
  amountInPaise: number;      // total charged to the family
  platformFeeInPaise: number; // 15% of amountInPaise, retained by ElderLink
  notes?: string;
  statusHistory: BookingStatusEvent[]; // append-only log; never modified, only appended
  createdAt: string;
  updatedAt: string;
}

// One payment record per booking. razorpayPaymentId is null until the user completes checkout.
export interface Payment {
  id: string;
  bookingId: string;
  razorpayOrderId: string;    // created when booking is confirmed
  razorpayPaymentId?: string; // populated via Razorpay webhook after capture
  amountInPaise: number;
  status: PaymentStatus;
  createdAt: string;
  updatedAt: string;
}

// Two-way rating: family rates provider, provider rates family — both linked to the same booking.
export interface Review {
  id: string;
  bookingId: string;
  reviewerUserId: string;
  revieweeUserId: string;
  rating: number; // 1–5
  comment?: string;
  createdAt: string;
}

// Sent across one or more channels (in-app, SMS via MSG91, WhatsApp via MSG91).
export interface Notification {
  id: string;
  userId: string;
  channel: NotificationChannel;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}

// ─── PHASE 2 — Safety + Family MVP ───────────────────────────────────────────

// Controls what a non-owner family member can do with a parent profile.
//   owner   — full access: book, edit profile, manage family members, delete profile
//   manager — can book services and view everything
//   viewer  — read-only: can see bookings and reports, cannot book
export type FamilyMemberRole = "owner" | "manager" | "viewer";

// Join record granting a user access to a parent profile they don't own.
// RLS policy: a user can read a parent profile if they are the owner OR
// have a FamilyMember record with their userId and the profile's id.
export interface FamilyMember {
  id: string;
  parentProfileId: string;
  userId: string;            // the invited user
  role: FamilyMemberRole;
  invitedByUserId: string;   // userId of the family owner who sent the invite
  createdAt: string;
}

// Defines how often a recurring booking repeats
export type RecurrenceFrequency = "daily" | "weekly" | "fortnightly" | "monthly";

// A template that auto-generates Booking records on the defined schedule.
// e.g. "Every Wednesday companion walk with Priya, starting 1 June".
// Individual Booking records reference this via recurringBookingId.
export interface RecurringBooking {
  id: string;
  familyUserId: string;
  parentProfileId: string;
  providerUserId: string;
  serviceTypeId: string;
  frequency: RecurrenceFrequency;
  dayOfWeek?: number; // 0 = Sunday … 6 = Saturday, used when frequency = "weekly"
  timeOfDay: string;  // "HH:MM" in 24h local time
  startDate: string;  // ISO date, first occurrence
  endDate?: string;   // ISO date, omit for open-ended
  amountInPaise: number;
  active: boolean;    // false = paused by family user
  createdAt: string;
  updatedAt: string;
}

// Provider-submitted report after a booking completes.
// Gives remote family members a structured summary of the visit.
export interface ServiceReport {
  id: string;
  bookingId: string;
  providerUserId: string;
  summary: string;          // free-text description of what was done
  photoUrls: string[];      // uploaded to Supabase Storage
  elderMood: "happy" | "neutral" | "sad"; // provider's observation of the elder's mood
  vitalsNoted?: string;     // free text: e.g. "BP looked high, seemed tired"
  followUpRecommended: boolean;
  followUpNotes?: string;   // what to follow up on, if recommended
  createdAt: string;
}

// Who or what triggered an SOS alert
export type SosEventTrigger = "family_user" | "provider" | "wearable";

// Emergency alert record — created when SOS is triggered from any source.
// SOS events are never deleted; they are part of the permanent safety audit trail.
// On creation, all FamilyMember users for the parent profile are notified immediately
// via in-app push, SMS, and WhatsApp simultaneously.
export interface SosEvent {
  id: string;
  parentProfileId: string;
  triggeredBy: SosEventTrigger;
  triggeredByUserId?: string; // set if triggered by a family user or provider
  wearableDeviceId?: string;  // set if triggered by a wearable
  latitude?: number;
  longitude?: number;
  resolvedAt?: string;        // set when family marks the alert as resolved
  resolutionNotes?: string;
  createdAt: string;
}

// ─── PHASE 3 — Engagement + Monetisation ─────────────────────────────────────

// A message in the per-booking chat thread between family user and provider.
// Chat is scoped to a booking — it is not a general inbox.
export interface ChatMessage {
  id: string;
  bookingId: string;
  senderUserId: string;
  body: string;
  photoUrl?: string; // optional image attachment
  readAt?: string;   // null until the recipient opens the message
  createdAt: string;
}

// Net Promoter Score survey auto-sent to both parties after a booking completes.
// Score 0–6 = detractor, 7–8 = passive, 9–10 = promoter.
export interface NpsSurvey {
  id: string;
  bookingId: string;
  respondentUserId: string;
  score: number; // 0–10
  comment?: string;
  createdAt: string;
}

// Defines a subscription tier (e.g. "Basic — 8 visits/month at ₹2,999").
// Managed by admins via the admin dashboard.
export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  visitsPerMonth: number;
  priceInPaise: number;
  serviceTypeIds: string[]; // which service types are included in this plan
  active: boolean;
}

export type SubscriptionStatus = "active" | "paused" | "cancelled" | "expired";

// A family user's active subscription instance.
// Bookings made under a subscription deduct from visitsUsed each billing period.
export interface Subscription {
  id: string;
  familyUserId: string;
  parentProfileId: string;
  planId: string;
  status: SubscriptionStatus;
  razorpaySubscriptionId: string; // Razorpay recurring subscription ID
  currentPeriodStart: string;
  currentPeriodEnd: string;
  visitsUsed: number; // reset to 0 at start of each billing period
  createdAt: string;
  updatedAt: string;
}

// ─── COMPANY — Provider organisation accounts ────────────────────────────────

// Lifecycle of a company↔provider link.
//   pending_company  — provider sent a join request; awaiting company approval
//   pending_provider — company invited a provider; awaiting provider acceptance
//   active           — both sides confirmed; provider appears in company roster
//   inactive         — link suspended (provider left or was removed)
export type CompanyEmployeeStatus =
  | "pending_company"
  | "pending_provider"
  | "active"
  | "inactive";

// A care organisation or staffing agency registered on the platform.
// Appears alongside individual providers once verificationStatus === "verified".
// trustScore is the average trust score of all active employee providers.
export interface CompanyProfile {
  id: string;
  userId: string;                   // company account owner (role: "company")
  companyName: string;
  registrationNumber: string;       // CIN / company registration number — must be unique
  gstNumber?: string;
  bio: string;
  services: string[];               // ServiceType IDs offered by this company
  cityIds: string[];                // City IDs from the cities catalogue
  zoneIds: string[];                // Zone IDs; empty = serve entire city
  verificationStatus: VerificationStatus;
  rejectionReason?: string;
  logoUrl?: string;
  registrationDocumentUrl?: string; // company cert — stored in private bucket
  trustScore: number;               // avg of active employees' trust scores, 0–100
  createdAt: string;
  updatedAt: string;
}

// Join record linking a provider (by their ProviderProfile) to a CompanyProfile.
// A provider may be linked to at most one company at a time.
export interface CompanyEmployee {
  id: string;
  companyId: string;          // references company_profiles.id
  providerProfileId: string;  // references provider_profiles.id
  status: CompanyEmployeeStatus;
  invitedByUserId: string;    // userId of whoever initiated the link
  joinedAt?: string;          // set when status transitions to "active"
  leftAt?: string;            // set when status transitions to "inactive"
  createdAt: string;
}

// ─── PHASE 4 — Intelligence + Wearables ──────────────────────────────────────

// Category of wearable device registered to a parent profile.
// Phase 4 priority: gps_pendant (affordable, widely available in India ₹3k–6k range).
export type WearableType =
  | "gps_pendant"        // GPS location + SOS button
  | "smartwatch"         // Apple Watch / Fitbit / Samsung — health + location
  | "fall_detector"      // dedicated fall detection band
  | "medication_dispenser"; // smart pill dispenser with missed-dose alerts

// A physical wearable device registered to a parent profile.
// ElderLink receives events from these devices via vendor webhooks.
export interface WearableDevice {
  id: string;
  parentProfileId: string;
  type: WearableType;
  deviceId: string;     // hardware serial or IMEI provided by the vendor
  name: string;         // e.g. "Maa's GPS Pendant"
  lastSeenAt?: string;
  batteryLevel?: number; // 0–100; updated on each location_update event
  createdAt: string;
  updatedAt: string;
}

export type WearableEventType =
  | "fall_detected"    // accelerometer-based fall detection
  | "sos_pressed"      // hardware SOS button pressed by elder
  | "low_battery"      // battery below threshold (typically 20%)
  | "location_update"  // periodic GPS ping
  | "vitals_update";   // heart rate / SpO2 update (smartwatch only)

// An event emitted by a wearable device and received via webhook.
// fall_detected and sos_pressed automatically trigger a SosEvent.
export interface WearableEvent {
  id: string;
  wearableDeviceId: string;
  parentProfileId: string;
  type: WearableEventType;
  payload: Record<string, unknown>; // flexible — shape varies by event type and vendor
  sosEventId?: string;   // set if this event triggered an SOS
  processedAt?: string;  // null until the webhook handler finishes creating downstream records
  createdAt: string;
}
