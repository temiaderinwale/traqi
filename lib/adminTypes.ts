/* Traqi — product admin console: domain types and shared constants */

export type AdminRole = 'superadmin' | 'admin';
export type AdminStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

export type AdminUser = {
  uid: string;
  username: string;
  email: string;
  role: AdminRole;
  status: AdminStatus;
  provider: 'password' | 'google';
  createdAt: string;
  approvedAt?: string;
  approvedBy?: string;      // uid of the admin who approved
  approvedByName?: string;
  lastLoginAt?: string;
  note?: string;
};

/* Plans mirror the marketing page. `trial` is what register() writes today as
   subscriptionStatus, so it stays a first-class state rather than a guess. */
export type Plan = 'trial' | 'starter' | 'lite' | 'pro';
export const PLANS: Plan[] = ['trial', 'starter', 'lite', 'pro'];
export const PLAN_LABEL: Record<Plan, string> = {
  trial: 'Trial', starter: 'Starter', lite: 'Lite', pro: 'Pro'
};
/* Indicative monthly value per plan — used for the revenue estimate only.
   Edit here when pricing is published. */
export const PLAN_PRICE: Record<Plan, number> = { trial: 0, starter: 0, lite: 15000, pro: 49500 };

/** One workspace, flattened to the numbers the console reports on. */
export type BusinessSummary = {
  id: string;                    // = owner uid, the businesses/{uid} doc id
  bizName: string;
  ownerName: string;
  email: string;
  plan: Plan;
  suspended: boolean;
  adminNote: string;
  createdAt: string;
  lastActive: string;            // newest of lastModified / latest sale
  onboarded: boolean;
  authProvider: string;
  /* volume */
  lineItems: number;             // sale rows
  orders: number;                // distinct orderIds
  gross: number;                 // ₦ before refunds and discounts
  refunds: number;
  discounts: number;
  net: number;                   // gross − refunds − discounts
  cogs: number;
  /* footprint */
  customers: number;
  products: number;
  assistants: number;
  expenses: number;              // ₦ logged
  debtOutstanding: number;
  lastSaleDate: string;
  firstSaleDate: string;
};

export type MonthPoint = {
  key: string;                   // YYYY-MM
  label: string;                 // "Feb 26"
  processed: number;
  orders: number;
  newBusinesses: number;
};

export type PlatformMetrics = {
  businesses: number;
  onboarded: number;
  active30: number;
  active7: number;
  dormant: number;               // no activity in 90 days
  suspended: number;
  newThisMonth: number;
  newLastMonth: number;
  lineItems: number;
  orders: number;
  processed: number;             // net amount processed, all time
  gross: number;
  refunds: number;
  discounts: number;
  avgOrder: number;
  customers: number;
  products: number;
  assistants: number;
  people: number;                // owners + assistants
  expenses: number;
  debtOutstanding: number;
  planCounts: Record<Plan, number>;
  mrr: number;                   // estimate from PLAN_PRICE
  months: MonthPoint[];          // last 12, oldest first
  fetchedAt: string;
};

/* ---------- Newsletters ---------- */
export type NewsletterAudience =
  | 'all' | 'active30' | 'dormant' | 'trial' | 'starter' | 'lite' | 'pro' | 'onboarded' | 'not_onboarded';

export const AUDIENCES: { key: NewsletterAudience; label: string; desc: string }[] = [
  { key: 'all', label: 'Everyone', desc: 'Every business owner with an email on file' },
  { key: 'active30', label: 'Active (30 days)', desc: 'Recorded activity in the last 30 days' },
  { key: 'dormant', label: 'Dormant (90+ days)', desc: 'No activity for 90 days — win-back' },
  { key: 'onboarded', label: 'Onboarded', desc: 'Finished setup' },
  { key: 'not_onboarded', label: 'Not onboarded', desc: 'Signed up but never finished setup' },
  { key: 'trial', label: 'On trial', desc: 'Still on the trial plan' },
  { key: 'starter', label: 'Starter plan', desc: 'Businesses on Starter' },
  { key: 'lite', label: 'Lite plan', desc: 'Businesses on Lite' },
  { key: 'pro', label: 'Pro plan', desc: 'Businesses on Pro' }
];

export type NewsletterStatus = 'draft' | 'scheduled' | 'queued' | 'sent' | 'failed';

export type Newsletter = {
  id: string;
  subject: string;
  preheader: string;
  body: string;                  // plain text / light markdown-ish
  audience: NewsletterAudience;
  status: NewsletterStatus;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
  scheduledFor?: string;
  sentAt?: string;
  recipientCount: number;
  recipients?: string[];         // snapshot taken at queue time
  error?: string;
};

export type Unsubscribe = { email: string; ts: string; by: string };

/* ---------- Pilot programme ----------
   Applications from /pilot, the unlinked page we hand out to prospective
   early users. An applicant writes the record once and never sees it
   again; from then on it belongs to the console, which moves it along a
   short pipeline: new → contacted → approved (or declined). */
export type PilotStatus = 'new' | 'contacted' | 'approved' | 'declined';
export const PILOT_STATUSES: PilotStatus[] = ['new', 'contacted', 'approved', 'declined'];
export const PILOT_LABEL: Record<PilotStatus, string> = {
  new: 'New', contacted: 'Contacted', approved: 'Approved', declined: 'Declined'
};

export type PilotSignupRecord = {
  id: string;
  firstName: string;
  surname: string;
  business: string;
  category: string;              // what they are, in their own words if "Other"
  categoryGroup: string;         // the onboarding class they picked it from
  location: string;
  email: string;
  whatsapp: string;
  about: string;
  status: PilotStatus;
  adminNote: string;
  reviewedAt: string;
  reviewedBy: string;
  createdAt: string;             // ISO, from the server timestamp
};

/* ---------- Admin audit ---------- */
export type AdminAudit = {
  id: string;
  ts: string;
  uid: string;
  name: string;
  action: string;
  detail: string;
};

/* ---------- Firestore collection names, in one place ---------- */
export const C = {
  businesses: 'businesses',
  admins: 'admins',
  bootstrap: 'adminMeta/bootstrap',
  newsletters: 'newsletters',
  unsubs: 'newsletterUnsubs',
  audit: 'adminAudit',
  mail: 'mail',                  // Firebase "Trigger Email" extension queue
  pilot: 'pilotSignups'          // applications from the unlinked /pilot page
} as const;
