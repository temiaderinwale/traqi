'use client';
/* Traqi — small presentational helpers shared by the admin modules. */

import React from 'react';
import { Badge } from '@/components/ui';
import { BusinessSummary, Plan, PLAN_LABEL } from '@/lib/adminTypes';
import { daysSince } from '@/lib/adminData';

/** ₦12,400 up to 5 figures, then ₦1.2m / ₦840k — headline tiles get long fast. */
export function money(n: number): string {
  const v = Math.round(Number(n) || 0);
  const a = Math.abs(v);
  if (a >= 1_000_000_000) return '₦' + (v / 1_000_000_000).toFixed(a >= 10_000_000_000 ? 0 : 1) + 'b';
  if (a >= 1_000_000) return '₦' + (v / 1_000_000).toFixed(a >= 10_000_000 ? 0 : 1) + 'm';
  if (a >= 100_000) return '₦' + Math.round(v / 1000) + 'k';
  return '₦' + v.toLocaleString();
}
export const naira = (n: number) => '₦' + Math.round(Number(n) || 0).toLocaleString();
export const count = (n: number) => Number(n || 0).toLocaleString();

export function since(iso: string): string {
  const d = daysSince(iso);
  if (!isFinite(d)) return 'never';
  if (d < 1) return 'today';
  if (d < 2) return 'yesterday';
  if (d < 31) return Math.floor(d) + ' days ago';
  if (d < 365) return Math.floor(d / 30) + ' mo ago';
  return Math.floor(d / 365) + ' yr ago';
}

export const shortDate = (iso: string) =>
  iso ? new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) : '—';

export const dateTime = (iso: string) =>
  iso ? new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';

const PLAN_TONE: Record<Plan, 'slate' | 'amber' | 'indigo' | 'green'> = {
  trial: 'slate', starter: 'slate', lite: 'amber', pro: 'indigo'
};
export const PlanBadge = ({ plan }: { plan: Plan }) => (
  <Badge tone={PLAN_TONE[plan]}>{PLAN_LABEL[plan]}</Badge>
);

export function ActivityBadge({ b }: { b: BusinessSummary }) {
  if (b.suspended) return <Badge tone="red">Suspended</Badge>;
  const d = daysSince(b.lastActive);
  if (d <= 7) return <Badge tone="green">Active</Badge>;
  if (d <= 30) return <Badge tone="blue">Recent</Badge>;
  if (d <= 90) return <Badge tone="amber">Quiet</Badge>;
  return <Badge tone="slate">Dormant</Badge>;
}

/** Delta against a previous period, rendered the way the app shows trends. */
export function Delta({ now, prev, suffix = '' }: { now: number; prev: number; suffix?: string }) {
  if (!prev) return <span className="hint">no prior period</span>;
  const pct = Math.round(((now - prev) / prev) * 100);
  return <span className={pct >= 0 ? 'pos' : 'neg'}>{pct >= 0 ? '▲' : '▼'} {Math.abs(pct)}%{suffix}</span>;
}

export function Loading({ text = 'Reading the platform…' }: { text?: string }) {
  return (
    <div className="card"><div className="empty">
      <div className="pl-track" style={{ width: 180, margin: '0 auto 14px' }}><span className="pl-fill" /></div>
      <p>{text}</p>
    </div></div>
  );
}

/** Sortable column header — the tables here are all read-and-rank. */
export function Th({ label, k, sort, setSort, right }: {
  label: string; k: string; right?: boolean;
  sort: { k: string; dir: 1 | -1 }; setSort: (s: { k: string; dir: 1 | -1 }) => void;
}) {
  const on = sort.k === k;
  return (
    <th style={{ textAlign: right ? 'right' : 'left', cursor: 'pointer', whiteSpace: 'nowrap' }}
      onClick={() => setSort({ k, dir: on && sort.dir === -1 ? 1 : -1 })}>
      {label}{on ? (sort.dir === -1 ? ' ↓' : ' ↑') : ''}
    </th>
  );
}

export function sortRows<T extends Record<string, any>>(rows: T[], sort: { k: string; dir: 1 | -1 }): T[] {
  return [...rows].sort((a, b) => {
    const x = a[sort.k], y = b[sort.k];
    if (typeof x === 'number' && typeof y === 'number') return (x - y) * sort.dir;
    return String(x ?? '').localeCompare(String(y ?? '')) * sort.dir;
  });
}
