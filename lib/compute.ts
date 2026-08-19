/* Traqi — permissions and computed business logic (ported from Scentelle) */
import type { Workspace, CurrentUser, Sale, Product } from './types';
import { diffDays } from './format';

/* ---------- Permissions ---------- */
export const PERMISSIONS = {
  low: [
    { key: 'record_sales', label: 'Record Sales', desc: 'Add and edit sales' },
    { key: 'view_customers', label: 'View Customers', desc: 'See customer list' },
    { key: 'add_customers', label: 'Add Customers', desc: 'Add new customers' },
    { key: 'view_products', label: 'View Products', desc: 'See product catalog' },
    { key: 'view_followups', label: 'View Follow-Ups', desc: 'See follow-up tracker' },
    { key: 'use_templates', label: 'WhatsApp Templates', desc: 'Access message templates' }
  ],
  medium: [
    { key: 'edit_customers', label: 'Edit Customers', desc: 'Modify customer details' },
    { key: 'view_inventory', label: 'View Inventory', desc: 'See stock levels' },
    { key: 'restock', label: 'Restock Inventory', desc: 'Add stock (needs approval)' },
    { key: 'view_suppliers', label: 'View Suppliers', desc: 'See supplier list' },
    { key: 'log_returns', label: 'Log Returns', desc: 'Record returns and refunds' }
  ],
  high: [
    { key: 'add_products', label: 'Add Products', desc: 'Add new products (needs approval)' },
    { key: 'edit_products', label: 'Edit Products', desc: 'Modify products (needs approval)' },
    { key: 'view_expenses', label: 'View Expenses', desc: 'See expense tracker' },
    { key: 'add_expenses', label: 'Add Expenses', desc: 'Log business expenses' },
    { key: 'view_debts', label: 'View Debts', desc: 'See debts and credit' },
    { key: 'view_financials', label: 'View Financials', desc: 'See financial reports' }
  ]
};
export const ALL_PERMS = [...PERMISSIONS.low, ...PERMISSIONS.medium, ...PERMISSIONS.high];
export const APPROVAL_REQUIRED = ['add_products', 'restock', 'edit_products'];

export const can = (user: CurrentUser, perm: string) =>
  user.role === 'owner' ? true : user.perms.includes(perm);
export const requiresApproval = (user: CurrentUser, perm: string) =>
  user.role === 'owner' ? false : APPROVAL_REQUIRED.includes(perm);

/* ---------- Financial stats ---------- */
export type Stats = {
  rev: number; grossRev: number; refunds: number; cost: number; exp: number;
  profit: number; pending: number; count: number; orders: number; disc: number;
};
export function salesStats(ws: Workspace, month?: number, year?: number): Stats {
  const inMonth = (d: string) => {
    const dt = new Date(d);
    return dt.getMonth() === month && dt.getFullYear() === year;
  };
  const ms = month === undefined ? ws.sales : ws.sales.filter(s => inMonth(s.date));
  const rev = ms.reduce((a, s) => a + s.qty * s.price, 0);
  const cost = ms.reduce((a, s) => a + s.qty * s.cost, 0);
  const mr = month === undefined ? ws.returns : ws.returns.filter(r => inMonth(r.date));
  const refunds = mr.filter(r => r.action === 'Full Refund' || r.action === 'Exchange')
    .reduce((a, r) => a + (r.amt || 0), 0);
  const exp = (month === undefined ? ws.expenses : ws.expenses.filter(e => inMonth(e.date)))
    .reduce((a, e) => a + e.amt, 0);
  const pending = ms.filter(s => s.status === 'Pending').reduce((a, s) => a + s.qty * s.price, 0);
  const disc = ms.reduce((a, s) => a + (s.discount || 0), 0);
  const netRev = rev - refunds;
  const orders = new Set(ms.map(s => s.orderId || s.id)).size;
  return { rev: netRev, grossRev: rev, refunds, cost, exp, profit: netRev - cost - exp - disc, pending, count: ms.length, orders, disc };
}

/* ---------- Inventory ---------- */
export type InventoryRow = Product & { sold: number; retQty: number; current: number; status: string; value: number };
export function getInventory(ws: Workspace): InventoryRow[] {
  return ws.products.map(p => {
    const sold = ws.sales.filter(s => s.prodId === p.id).reduce((a, s) => a + s.qty, 0);
    const retQty = ws.returns.filter(r => r.prodId === p.id).reduce((a, r) => a + (r.qty || 0), 0);
    const current = (p.stock || 0) - sold + (p.restocked || 0) + retQty;
    const status = current <= 0 ? 'OUT OF STOCK' : current <= (p.reorder || 0) ? 'REORDER NOW' : 'OK';
    return { ...p, sold, retQty, current, status, value: current * p.price };
  });
}

/* ---------- Follow-ups ---------- */
export type FollowUp = {
  saleId: string; custId: string; custName: string; phone: string; wa: string;
  prodName: string; usageDays: number; finishDate: string; followDate: string;
  dFollow: number; dFinish: number; status: 'overdue' | 'followup' | 'upcoming';
};
export function getFollowUps(ws: Workspace, done: Record<string, boolean> = {}): FollowUp[] {
  const latest: Record<string, string> = {};
  ws.sales.forEach(s => {
    const k = s.custId + '|' + s.prodId;
    if (!latest[k] || s.date > latest[k]) latest[k] = s.date;
  });
  const rows: FollowUp[] = [];
  ws.sales.forEach(sale => {
    const prod = ws.products.find(p => p.id === sale.prodId);
    if (!prod || !prod.usageDays) return;
    if (latest[sale.custId + '|' + sale.prodId] !== sale.date) return;
    if (done[sale.id]) return;
    const finish = new Date(sale.date); finish.setDate(finish.getDate() + prod.usageDays);
    const follow = new Date(finish); follow.setDate(follow.getDate() - 3);
    const dFollow = diffDays(follow.toISOString().slice(0, 10));
    const dFinish = diffDays(finish.toISOString().slice(0, 10));
    const cust = ws.customers.find(c => c.id === sale.custId);
    rows.push({
      saleId: sale.id, custId: sale.custId, custName: sale.custName,
      phone: cust?.phone || '—', wa: cust?.wa || cust?.phone || '',
      prodName: sale.prodName, usageDays: prod.usageDays,
      finishDate: finish.toISOString().slice(0, 10), followDate: follow.toISOString().slice(0, 10),
      dFollow, dFinish, status: dFinish < 0 ? 'overdue' : dFollow <= 0 ? 'followup' : 'upcoming'
    });
  });
  return rows.sort((a, b) => a.dFollow - b.dFollow);
}

/* ---------- Birthdays ---------- */
export function getBirthdays(ws: Workspace) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return ws.customers.filter(c => c.bday).map(c => {
    const [d, m] = c.bday.split('/').map(n => parseInt(n));
    if (!d || !m) return null;
    const b = new Date(now.getFullYear(), m - 1, d);
    if (b < start) b.setFullYear(now.getFullYear() + 1);
    const daysAway = Math.round((b.getTime() - start.getTime()) / 86400000);
    return { ...c, daysAway, isToday: d === now.getDate() && m === now.getMonth() + 1 };
  }).filter(Boolean).sort((a, b) => a!.daysAway - b!.daysAway) as (typeof ws.customers[0] & { daysAway: number; isToday: boolean })[];
}

/* ---------- Orders ---------- */
export type Order = {
  orderId: string; date: string; custId: string; custName: string; status: string;
  channel: string; notes: string; firstId: string; recNum: string;
  discount: number; receiptNote: string; lines: Sale[];
};
export function getOrders(ws: Workspace): Order[] {
  const map: Record<string, Order> = {};
  ws.sales.forEach(s => {
    const oid = s.orderId || s.id;
    if (!map[oid]) map[oid] = {
      orderId: oid, date: s.date, custId: s.custId, custName: s.custName, status: s.status,
      channel: s.channel, notes: s.notes, firstId: s.id, recNum: s.recNum || '',
      discount: 0, receiptNote: s.receiptNote || '', lines: []
    };
    map[oid].lines.push(s);
    map[oid].discount += s.discount || 0;
  });
  return Object.values(map).sort((a, b) => +new Date(b.date) - +new Date(a.date));
}

export function productPerformance(ws: Workspace, prodId: string) {
  const sold = ws.sales.filter(s => s.prodId === prodId).reduce((a, s) => a + s.qty, 0);
  const all = ws.sales.reduce((a, s) => a + s.qty, 0);
  if (!all || !sold) return 'new';
  const share = sold / all;
  return share >= 0.2 ? 'best' : share <= 0.05 ? 'slow' : 'normal';
}
export function lastSeenDays(ws: Workspace, custId: string) {
  const cs = ws.sales.filter(s => s.custId === custId).sort((a, b) => +new Date(b.date) - +new Date(a.date));
  return cs.length ? -diffDays(cs[0].date) : -1;
}
export function pendingTaskCount(ws: Workspace, user: CurrentUser) {
  return user.role === 'owner'
    ? ws.tasks.filter(t => t.status !== 'done').length
    : ws.tasks.filter(t => t.assignedTo?.includes(user.id) && t.status !== 'done').length;
}
export const msgUserId = (user: CurrentUser) => (user.role === 'owner' ? 'owner' : user.id);
export function isMsgFromMe(m: { from: string }, user: CurrentUser) {
  return m.from === msgUserId(user) || (user.role === 'owner' && m.from === user.id);
}
export function isMsgVisible(m: { to: string[]; from: string }, user: CurrentUser) {
  const me = msgUserId(user);
  return user.role === 'owner'
    ? m.to.includes('owner') || m.from === 'owner' || m.from === user.id
    : m.to.includes(me) || m.from === me;
}
export function unreadMsgCount(ws: Workspace, user: CurrentUser) {
  const me = msgUserId(user);
  return ws.messages.filter(m => {
    if (m.deletedAt) return false;
    const forMe = user.role === 'owner' ? m.to.includes('owner') : m.to.includes(me);
    return forMe && !isMsgFromMe(m, user) && !m.readBy?.[me];
  }).length;
}
