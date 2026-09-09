/* Traqi — account tiers.

   The three plans on the marketing page, expressed as something the app can
   enforce. A tier is a set of feature keys plus a couple of numeric limits;
   everything else in the product is available to every account.

   All three are free while Traqi is in launch pricing — `price` is what the
   selector shows, and the gating below is what actually applies. When money
   turns on, only `price`/`priceNote` change.

   This applies to business accounts only. The product admin console (/admin)
   has its own roles and never reads any of this. */

export type TierKey = 'starter' | 'lite' | 'pro';

/** Capabilities a tier can unlock. Anything not listed here is unrestricted. */
export type FeatureKey = 'followups' | 'financials' | 'team' | 'tasks';

export const FEATURE_LABEL: Record<FeatureKey, string> = {
  followups: 'Smart follow-ups & birthday alerts',
  financials: 'Financial reports & monthly targets',
  team: 'Team roles, approvals & activity log',
  tasks: 'Task management'
};

export type Tier = {
  key: TierKey;
  name: string;
  tagline: string;
  price: string;
  priceNote: string;
  features: FeatureKey[];
  /** Infinity means no cap. */
  limits: { customers: number; assistants: number };
  includes: string[];      // what the selector lists as included
  adds: string[];          // what this tier adds over the one before it
};

export const TIERS: Record<TierKey, Tier> = {
  starter: {
    key: 'starter',
    name: 'Starter',
    tagline: 'For solo sellers getting organised',
    price: 'Free',
    priceNote: 'Everything you need to start selling',
    features: [],
    limits: { customers: 50, assistants: 0 },
    includes: ['Sales log & receipts', 'Up to 50 customers', 'Basic inventory tracking', 'Standard support'],
    adds: []
  },
  lite: {
    key: 'lite',
    name: 'Lite',
    tagline: 'For growing sellers with regulars',
    price: 'Free',
    priceNote: 'Free while Traqi is in launch pricing',
    features: ['followups', 'financials'],
    limits: { customers: 100, assistants: 0 },
    includes: [
      'Everything in Starter', 'Up to 100 customers', 'Smart follow-ups & birthday alerts',
      'Financial reports & monthly targets', 'Priority support'
    ],
    adds: ['Up to 100 customers', 'Smart follow-ups & birthday alerts', 'Financial reports & monthly targets']
  },
  pro: {
    key: 'pro',
    name: 'Pro',
    tagline: 'For teams that sell every day',
    price: 'Free',
    priceNote: 'Free while Traqi is in launch pricing',
    features: ['followups', 'financials', 'team', 'tasks'],
    limits: { customers: Infinity, assistants: Infinity },
    includes: [
      'Everything in Starter, unlimited', 'Smart follow-ups & birthday alerts',
      'Financial reports & monthly targets', 'Team roles, approvals & activity log',
      'Task management', 'Priority support'
    ],
    adds: ['Unlimited customers', 'Team roles, approvals & activity log', 'Task management']
  }
};

export const TIER_ORDER: TierKey[] = ['starter', 'lite', 'pro'];
export const TIER_LIST: Tier[] = TIER_ORDER.map(k => TIERS[k]);

export const isTierKey = (v: unknown): v is TierKey => TIER_ORDER.includes(v as TierKey);

/** An account with no plan yet is treated as Starter until it chooses one. */
export const getTier = (plan: string | undefined): Tier => (isTierKey(plan) ? TIERS[plan] : TIERS.starter);

export const tierHas = (plan: string | undefined, f: FeatureKey) => getTier(plan).features.includes(f);

export const customerLimit = (plan: string | undefined) => getTier(plan).limits.customers;
export const assistantLimit = (plan: string | undefined) => getTier(plan).limits.assistants;

/** The cheapest tier that unlocks a feature — what an upgrade prompt points at. */
export function tierWith(f: FeatureKey): Tier {
  return TIER_LIST.find(t => t.features.includes(f)) || TIERS.pro;
}

/** The cheapest tier that allows this many customers. */
export function tierForCustomers(n: number): Tier {
  return TIER_LIST.find(t => t.limits.customers >= n) || TIERS.pro;
}

export const limitLabel = (n: number) => (n === Infinity ? 'Unlimited' : String(n));
