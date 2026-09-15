/* Traqi — product admin console: reading and summarising every workspace.

   Each business is a single Firestore document (businesses/{uid}) holding the
   whole workspace, so platform figures are rolled up on the client from one
   collection read. That is fine at the current scale and keeps the console
   dependency-free; when the collection outgrows a single read, move this
   summarise step into a scheduled Cloud Function that writes
   `platformRollups/{month}` and have the console read that instead. */
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { adminDb } from './adminFirebase';
import {
  BusinessSummary, MonthPoint, PlatformMetrics, Plan, PLANS, PLAN_PRICE,
  NewsletterAudience, PilotSignupRecord, PilotStatus, PILOT_STATUSES, C
} from './adminTypes';

const num = (v: any) => (typeof v === 'number' && isFinite(v) ? v : Number(v) || 0);
const str = (v: any) => (typeof v === 'string' ? v : '');
const arr = (v: any): any[] => (Array.isArray(v) ? v : []);

const daysSince = (iso: string) => {
  if (!iso) return Infinity;
  const t = new Date(iso).getTime();
  return isNaN(t) ? Infinity : (Date.now() - t) / 86400000;
};

const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
const monthLabel = (d: Date) =>
  d.toLocaleDateString('en-GB', { month: 'short' }) + ' ' + String(d.getFullYear()).slice(2);

/** Plan on the doc wins; otherwise a trial subscriptionStatus, otherwise Starter. */
function resolvePlan(d: Record<string, any>): Plan {
  const p = str(d.plan).toLowerCase();
  if ((PLANS as string[]).includes(p)) return p as Plan;
  return str(d.subscriptionStatus).toLowerCase() === 'trial' ? 'trial' : 'starter';
}

export function summarise(id: string, d: Record<string, any>): BusinessSummary {
  const cfg = (d.config || {}) as Record<string, any>;
  const sales = arr(d.sales), returns = arr(d.returns);

  const gross = sales.reduce((a, s) => a + num(s.qty) * num(s.price), 0);
  const cogs = sales.reduce((a, s) => a + num(s.qty) * num(s.cost), 0);
  const discounts = sales.reduce((a, s) => a + num(s.discount), 0);
  const refunds = returns
    .filter(r => r.action === 'Full Refund' || r.action === 'Exchange')
    .reduce((a, r) => a + num(r.amt), 0);

  const dates = sales.map(s => str(s.date)).filter(Boolean).sort();
  const lastSaleDate = dates.length ? dates[dates.length - 1] : '';
  const lastModified = num(d.lastModified) ? new Date(num(d.lastModified)).toISOString() : '';
  const lastActive = [lastModified, lastSaleDate ? new Date(lastSaleDate).toISOString() : '']
    .filter(Boolean).sort().pop() || str(d.createdAt);

  return {
    id,
    bizName: str(cfg.bizName) || str(d.bizName) || 'Unnamed business',
    ownerName: str(cfg.ownerName) || str(d.username) || '—',
    email: str(cfg.email) || str(d.email),
    plan: resolvePlan(d),
    suspended: d.suspended === true,
    adminNote: str(d.adminNote),
    createdAt: str(d.createdAt),
    lastActive,
    onboarded: cfg.onboarded === true,
    authProvider: str(d.authProvider) || 'password',
    lineItems: sales.length,
    orders: new Set(sales.map(s => str(s.orderId) || str(s.id))).size,
    gross,
    refunds,
    discounts,
    net: gross - refunds - discounts,
    cogs,
    customers: arr(d.customers).length,
    products: arr(d.products).length,
    assistants: arr(d.assistants).length,
    expenses: arr(d.expenses).reduce((a, e) => a + num(e.amt), 0),
    debtOutstanding: arr(d.debts)
      .filter(x => x.status !== 'Cleared')
      .reduce((a, x) => a + (num(x.total) - num(x.paid)), 0),
    lastSaleDate,
    firstSaleDate: dates[0] || ''
  };
}

/** One read of the whole collection, summarised. */
export async function fetchBusinesses(): Promise<BusinessSummary[]> {
  const snap = await getDocs(collection(adminDb, C.businesses));
  return snap.docs
    .map(dc => summarise(dc.id, dc.data() as Record<string, any>))
    .sort((a, b) => (b.lastActive || '').localeCompare(a.lastActive || ''));
}

export function computeMetrics(rows: BusinessSummary[]): PlatformMetrics {
  const now = new Date();
  const thisKey = monthKey(now);
  const lastKey = monthKey(new Date(now.getFullYear(), now.getMonth() - 1, 1));

  const months: MonthPoint[] = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
    return { key: monthKey(d), label: monthLabel(d), processed: 0, orders: 0, newBusinesses: 0 };
  });
  const byKey = new Map(months.map(m => [m.key, m]));

  const planCounts = PLANS.reduce((a, p) => ({ ...a, [p]: 0 }), {} as Record<Plan, number>);
  const m: PlatformMetrics = {
    businesses: rows.length, onboarded: 0, active30: 0, active7: 0, dormant: 0, suspended: 0,
    newThisMonth: 0, newLastMonth: 0, lineItems: 0, orders: 0, processed: 0, gross: 0,
    refunds: 0, discounts: 0, avgOrder: 0, customers: 0, products: 0, assistants: 0,
    people: 0, expenses: 0, debtOutstanding: 0, planCounts, mrr: 0, months,
    fetchedAt: new Date().toISOString()
  };

  rows.forEach(b => {
    const age = daysSince(b.lastActive);
    if (b.onboarded) m.onboarded++;
    if (age <= 7) m.active7++;
    if (age <= 30) m.active30++;
    if (age > 90) m.dormant++;
    if (b.suspended) m.suspended++;
    const created = b.createdAt ? new Date(b.createdAt) : null;
    if (created && !isNaN(created.getTime())) {
      const k = monthKey(created);
      if (k === thisKey) m.newThisMonth++;
      if (k === lastKey) m.newLastMonth++;
      const bucket = byKey.get(k);
      if (bucket) bucket.newBusinesses++;
    }
    m.lineItems += b.lineItems;
    m.orders += b.orders;
    m.gross += b.gross;
    m.refunds += b.refunds;
    m.discounts += b.discounts;
    m.processed += b.net;
    m.customers += b.customers;
    m.products += b.products;
    m.assistants += b.assistants;
    m.expenses += b.expenses;
    m.debtOutstanding += b.debtOutstanding;
    m.planCounts[b.plan]++;
    m.mrr += b.suspended ? 0 : PLAN_PRICE[b.plan];
  });

  m.people = rows.length + m.assistants;
  m.avgOrder = m.orders ? Math.round(m.processed / m.orders) : 0;
  return m;
}

/** Per-month processed/orders needs the raw sale rows, so it is a second pass. */
export function monthlyFromDocs(docs: { id: string; data: Record<string, any> }[], months: MonthPoint[]): MonthPoint[] {
  const byKey = new Map(months.map(mm => [mm.key, { ...mm, processed: 0, orders: 0 }]));
  docs.forEach(({ data }) => {
    const seen = new Map<string, Set<string>>();
    arr(data.sales).forEach(s => {
      const d = new Date(str(s.date));
      if (isNaN(d.getTime())) return;
      const bucket = byKey.get(monthKey(d));
      if (!bucket) return;
      bucket.processed += num(s.qty) * num(s.price) - num(s.discount);
      const key = monthKey(d);
      if (!seen.has(key)) seen.set(key, new Set());
      seen.get(key)!.add(str(s.orderId) || str(s.id));
    });
    seen.forEach((ids, key) => {
      const bucket = byKey.get(key);
      if (bucket) bucket.orders += ids.size;
    });
    arr(data.returns).forEach(r => {
      if (r.action !== 'Full Refund' && r.action !== 'Exchange') return;
      const d = new Date(str(r.date));
      if (isNaN(d.getTime())) return;
      const bucket = byKey.get(monthKey(d));
      if (bucket) bucket.processed -= num(r.amt);
    });
  });
  return months.map(mm => byKey.get(mm.key)!);
}

/** Single trip: summaries, metrics and the monthly series from one collection read. */
export async function loadPlatform(): Promise<{ rows: BusinessSummary[]; metrics: PlatformMetrics }> {
  const snap = await getDocs(collection(adminDb, C.businesses));
  const raw = snap.docs.map(dc => ({ id: dc.id, data: dc.data() as Record<string, any> }));
  const rows = raw.map(r => summarise(r.id, r.data))
    .sort((a, b) => (b.lastActive || '').localeCompare(a.lastActive || ''));
  const metrics = computeMetrics(rows);
  metrics.months = monthlyFromDocs(raw, metrics.months);
  return { rows, metrics };
}

/* ---------- Admin writes onto a workspace (rules limit these fields) ---------- */
export async function setBusinessPlan(id: string, plan: Plan) {
  await updateDoc(doc(adminDb, C.businesses, id), { plan, planUpdatedAt: new Date().toISOString() });
}
export async function setBusinessSuspended(id: string, suspended: boolean) {
  await updateDoc(doc(adminDb, C.businesses, id), { suspended, planUpdatedAt: new Date().toISOString() });
}
export async function setBusinessNote(id: string, adminNote: string) {
  await updateDoc(doc(adminDb, C.businesses, id), { adminNote });
}

/* ---------- Pilot applications ----------
   The /pilot page writes these and cannot read them back; the console is the
   only place they are ever seen. Small enough to read whole, and ordering by
   `createdAt` in the query would silently drop any record still holding an
   unresolved server timestamp — so sort here instead. */
export function readPilotSignup(id: string, d: Record<string, any>): PilotSignupRecord {
  const status = str(d.status).toLowerCase();
  return {
    id,
    firstName: str(d.firstName),
    surname: str(d.surname),
    business: str(d.business),
    category: str(d.category),
    categoryGroup: str(d.categoryGroup) || str(d.category),
    location: str(d.location),
    email: str(d.email),
    whatsapp: str(d.whatsapp),
    about: str(d.about),
    status: (PILOT_STATUSES as string[]).includes(status) ? (status as PilotStatus) : 'new',
    adminNote: str(d.adminNote),
    reviewedAt: str(d.reviewedAt),
    reviewedBy: str(d.reviewedBy),
    /* serverTimestamp() resolves a beat after the write, so a record read in
       that window has no date yet — show it as the newest, not as 1970. */
    createdAt: d.createdAt?.toDate ? d.createdAt.toDate().toISOString() : str(d.createdAt),
    archived: d.archived === true,
    archivedAt: str(d.archivedAt),
    archivedBy: str(d.archivedBy)
  };
}

export async function fetchPilotSignups(): Promise<PilotSignupRecord[]> {
  const snap = await getDocs(collection(adminDb, C.pilot));
  return snap.docs
    .map(d => readPilotSignup(d.id, d.data() as Record<string, any>))
    .sort((a, b) => (b.createdAt || '9999').localeCompare(a.createdAt || '9999'));
}

export async function setPilotStatus(id: string, status: PilotStatus, by: string) {
  await updateDoc(doc(adminDb, C.pilot, id), {
    status, reviewedAt: new Date().toISOString(), reviewedBy: by
  });
}
export async function setPilotNote(id: string, adminNote: string) {
  await updateDoc(doc(adminDb, C.pilot, id), { adminNote });
}

/** Moves a record to the archive, or brings it back. Nothing is destroyed —
    an application is somebody's details and a record of them asking, so it
    leaves the working list rather than the database. */
export async function setPilotArchived(id: string, archived: boolean, by: string) {
  await updateDoc(doc(adminDb, C.pilot, id), {
    archived,
    archivedAt: archived ? new Date().toISOString() : '',
    archivedBy: archived ? by : ''
  });
}

/* ---------- Audience selection ---------- */
export function inAudience(b: BusinessSummary, a: NewsletterAudience): boolean {
  const age = daysSince(b.lastActive);
  switch (a) {
    case 'all': return true;
    case 'active30': return age <= 30;
    case 'dormant': return age > 90;
    case 'onboarded': return b.onboarded;
    case 'not_onboarded': return !b.onboarded;
    case 'trial': case 'starter': case 'lite': case 'pro': return b.plan === a;
    default: return false;
  }
}

/** Deduplicated, unsubscribe-aware recipient list for an audience. */
export function recipientsFor(
  rows: BusinessSummary[], audience: NewsletterAudience, unsubs: Set<string>
): { email: string; name: string; biz: string }[] {
  const seen = new Set<string>();
  const out: { email: string; name: string; biz: string }[] = [];
  rows.forEach(b => {
    const email = b.email.trim().toLowerCase();
    if (!email || !email.includes('@')) return;
    if (b.suspended || seen.has(email) || unsubs.has(email)) return;
    if (!inAudience(b, audience)) return;
    seen.add(email);
    out.push({ email, name: b.ownerName, biz: b.bizName });
  });
  return out;
}

/* ---------- CSV ---------- */
export function toCsv(rows: (string | number)[][]): string {
  return rows
    .map(r => r.map(c => {
      const v = String(c ?? '');
      return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
    }).join(','))
    .join('\n');
}

export function downloadCsv(filename: string, rows: (string | number)[][]) {
  const url = URL.createObjectURL(new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export { daysSince };
