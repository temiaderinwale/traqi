'use client';
/* Traqi admin — the directory of every workspace on the platform. */

import React, { useMemo, useState } from 'react';
import { Building2, FileDown, Search, X } from 'lucide-react';
import { Card, TableWrap, Badge, Kpi, KpiGrid } from '@/components/ui';
import { usePlatform } from '../platform';
import { ActivityBadge, PlanBadge, Loading, Th, count, naira, since, shortDate, sortRows } from '../bits';
import { useAdmin } from '@/lib/adminStore';
import { downloadCsv, setBusinessNote, setBusinessPlan, setBusinessSuspended } from '@/lib/adminData';
import { BusinessSummary, Plan, PLANS, PLAN_LABEL } from '@/lib/adminTypes';

export default function Businesses() {
  const { rows, loading, error, patchRow } = usePlatform();
  const { logAudit, isSuper } = useAdmin();
  const [q, setQ] = useState('');
  const [plan, setPlan] = useState<'' | Plan>('');
  const [state, setState] = useState<'' | 'active' | 'quiet' | 'dormant' | 'suspended'>('');
  const [sort, setSort] = useState<{ k: string; dir: 1 | -1 }>({ k: 'net', dir: -1 });
  const [open, setOpen] = useState<BusinessSummary | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter(b => {
      if (plan && b.plan !== plan) return false;
      if (state) {
        const d = (Date.now() - new Date(b.lastActive || 0).getTime()) / 86400000;
        if (state === 'suspended' && !b.suspended) return false;
        if (state === 'active' && !(d <= 30 && !b.suspended)) return false;
        if (state === 'quiet' && !(d > 30 && d <= 90)) return false;
        if (state === 'dormant' && !(d > 90)) return false;
      }
      if (!needle) return true;
      return [b.bizName, b.ownerName, b.email, b.id].some(v => v.toLowerCase().includes(needle));
    });
  }, [rows, q, plan, state]);

  const shown = sortRows(filtered, sort);
  const totals = shown.reduce((a, b) => ({
    net: a.net + b.net, orders: a.orders + b.orders, customers: a.customers + b.customers
  }), { net: 0, orders: 0, customers: 0 });

  const openPanel = (b: BusinessSummary) => { setOpen(b); setNote(b.adminNote || ''); };

  const changePlan = async (b: BusinessSummary, p: Plan) => {
    setBusy(true);
    try {
      await setBusinessPlan(b.id, p);
      patchRow(b.id, { plan: p });
      setOpen(o => (o && o.id === b.id ? { ...o, plan: p } : o));
      await logAudit('plan_change', `${b.bizName} → ${PLAN_LABEL[p]}`);
    } catch { alert('Could not update the plan. Check the Firestore rules for admin writes.'); }
    setBusy(false);
  };

  const toggleSuspend = async (b: BusinessSummary) => {
    const next = !b.suspended;
    if (next && !confirm(`Suspend ${b.bizName}? Their workspace stays intact — this only flags the account.`)) return;
    setBusy(true);
    try {
      await setBusinessSuspended(b.id, next);
      patchRow(b.id, { suspended: next });
      setOpen(o => (o && o.id === b.id ? { ...o, suspended: next } : o));
      await logAudit(next ? 'business_suspend' : 'business_restore', b.bizName);
    } catch { alert('Could not update the account.'); }
    setBusy(false);
  };

  const saveNote = async (b: BusinessSummary) => {
    setBusy(true);
    try {
      await setBusinessNote(b.id, note);
      patchRow(b.id, { adminNote: note });
      await logAudit('business_note', b.bizName);
    } catch { alert('Could not save the note.'); }
    setBusy(false);
  };

  const exportCsv = () => {
    downloadCsv(`traqi_businesses_${new Date().toISOString().slice(0, 10)}.csv`, [
      ['Business', 'Owner', 'Email', 'Plan', 'Suspended', 'Joined', 'Last active', 'Orders', 'Sale lines',
        'Gross', 'Refunds', 'Discounts', 'Net processed', 'Customers', 'Products', 'Assistants', 'Debt outstanding', 'UID'],
      ...shown.map(b => [b.bizName, b.ownerName, b.email, PLAN_LABEL[b.plan], b.suspended ? 'yes' : 'no',
        b.createdAt, b.lastActive, b.orders, b.lineItems, Math.round(b.gross), Math.round(b.refunds),
        Math.round(b.discounts), Math.round(b.net), b.customers, b.products, b.assistants,
        Math.round(b.debtOutstanding), b.id])
    ]);
  };

  if (error) return <Card><p className="msg err" style={{ margin: 0 }}>{error}</p></Card>;
  if (loading) return <Loading />;

  return (
    <>
      <KpiGrid>
        <Kpi icon={Building2} label="Matching businesses" value={count(shown.length)} sub={`of ${count(rows.length)} on Traqi`} />
        <Kpi icon={Building2} label="Processed (filtered)" value={naira(totals.net)} sub={`${count(totals.orders)} orders`} />
        <Kpi icon={Building2} label="Customers reached" value={count(totals.customers)} sub="end customers in these workspaces" />
      </KpiGrid>

      <div className="search-row">
        <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
          <Search style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: 'var(--text-3)' }} />
          <input className="search-input" style={{ width: '100%', paddingLeft: 36 }} placeholder="Search business, owner, email or UID"
            value={q} onChange={e => setQ(e.target.value)} />
        </div>
        <select value={plan} onChange={e => setPlan(e.target.value as any)}>
          <option value="">All plans</option>
          {PLANS.map(p => <option key={p} value={p}>{PLAN_LABEL[p]}</option>)}
        </select>
        <select value={state} onChange={e => setState(e.target.value as any)}>
          <option value="">Any activity</option>
          <option value="active">Active (30 days)</option>
          <option value="quiet">Quiet (30–90 days)</option>
          <option value="dormant">Dormant (90+ days)</option>
          <option value="suspended">Suspended</option>
        </select>
        <button className="btn btn-secondary btn-sm" onClick={exportCsv}><FileDown />Export CSV</button>
      </div>

      <Card pad={false}>
        <TableWrap minWidth={980} head={
          <tr>
            <Th label="Business" k="bizName" sort={sort} setSort={setSort} />
            <Th label="Owner" k="ownerName" sort={sort} setSort={setSort} />
            <Th label="Plan" k="plan" sort={sort} setSort={setSort} />
            <Th label="Orders" k="orders" sort={sort} setSort={setSort} right />
            <Th label="Processed" k="net" sort={sort} setSort={setSort} right />
            <Th label="Customers" k="customers" sort={sort} setSort={setSort} right />
            <Th label="Team" k="assistants" sort={sort} setSort={setSort} right />
            <Th label="Joined" k="createdAt" sort={sort} setSort={setSort} />
            <Th label="Last active" k="lastActive" sort={sort} setSort={setSort} />
            <th>Status</th>
          </tr>
        }>
          {shown.map(b => (
            <tr key={b.id} style={{ cursor: 'pointer' }} onClick={() => openPanel(b)}>
              <td style={{ fontWeight: 600 }}>{b.bizName}{!b.onboarded && <span className="hint" style={{ display: 'block', fontSize: '.7rem' }}>setup unfinished</span>}</td>
              <td>{b.ownerName}<span className="hint" style={{ display: 'block', fontSize: '.7rem' }}>{b.email}</span></td>
              <td><PlanBadge plan={b.plan} /></td>
              <td className="tnum" style={{ textAlign: 'right' }}>{count(b.orders)}</td>
              <td className="tnum" style={{ textAlign: 'right', fontWeight: 600 }}>{naira(b.net)}</td>
              <td className="tnum" style={{ textAlign: 'right' }}>{count(b.customers)}</td>
              <td className="tnum" style={{ textAlign: 'right' }}>{count(b.assistants + 1)}</td>
              <td className="hint">{shortDate(b.createdAt)}</td>
              <td className="hint">{since(b.lastActive)}</td>
              <td><ActivityBadge b={b} /></td>
            </tr>
          ))}
          {!shown.length && <tr><td colSpan={10} className="hint" style={{ textAlign: 'center', padding: 28 }}>No businesses match those filters.</td></tr>}
        </TableWrap>
      </Card>

      {open && (
        <div className="side-panel open">
          <button className="icon-btn panel-close" onClick={() => setOpen(null)} aria-label="Close"><X /></button>
          <h3 className="font-display" style={{ fontSize: '1.15rem', fontWeight: 800, margin: '0 40px 4px 0' }}>{open.bizName}</h3>
          <p className="hint">{open.ownerName} · {open.email || 'no email on file'}</p>
          <div style={{ marginTop: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <PlanBadge plan={open.plan} />
            <ActivityBadge b={open} />
            <Badge tone="slate">{open.authProvider === 'google' ? 'Google' : 'Password'}</Badge>
            {!open.onboarded && <Badge tone="amber">Setup unfinished</Badge>}
          </div>

          <div className="panel-sec">
            <div className="panel-sec-title">Volume</div>
            <div className="panel-stat"><span>Amount processed</span><strong className="tnum">{naira(open.net)}</strong></div>
            <div className="panel-stat"><span>Gross sales</span><span className="tnum">{naira(open.gross)}</span></div>
            <div className="panel-stat"><span>Refunds</span><span className="tnum">{naira(open.refunds)}</span></div>
            <div className="panel-stat"><span>Discounts given</span><span className="tnum">{naira(open.discounts)}</span></div>
            <div className="panel-stat"><span>Orders / sale lines</span><span className="tnum">{count(open.orders)} / {count(open.lineItems)}</span></div>
            <div className="panel-stat"><span>Average order</span><span className="tnum">{naira(open.orders ? open.net / open.orders : 0)}</span></div>
          </div>

          <div className="panel-sec">
            <div className="panel-sec-title">Workspace</div>
            <div className="panel-stat"><span>Customers</span><span className="tnum">{count(open.customers)}</span></div>
            <div className="panel-stat"><span>Products</span><span className="tnum">{count(open.products)}</span></div>
            <div className="panel-stat"><span>Team members</span><span className="tnum">{count(open.assistants + 1)}</span></div>
            <div className="panel-stat"><span>Expenses logged</span><span className="tnum">{naira(open.expenses)}</span></div>
            <div className="panel-stat"><span>Debt outstanding</span><span className="tnum">{naira(open.debtOutstanding)}</span></div>
            <div className="panel-stat"><span>Joined</span><span>{shortDate(open.createdAt)}</span></div>
            <div className="panel-stat"><span>First / last sale</span><span>{shortDate(open.firstSaleDate)} → {shortDate(open.lastSaleDate)}</span></div>
            <div className="panel-stat"><span>Workspace id</span><span className="hint" style={{ fontSize: '.7rem' }}>{open.id}</span></div>
          </div>

          <div className="panel-sec">
            <div className="panel-sec-title">Plan</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {PLANS.map(p => (
                <button key={p} disabled={busy || open.plan === p}
                  className={'btn btn-sm ' + (open.plan === p ? 'btn-primary' : 'btn-secondary')}
                  onClick={() => changePlan(open, p)}>{PLAN_LABEL[p]}</button>
              ))}
            </div>
          </div>

          <div className="panel-sec">
            <div className="panel-sec-title">Internal note</div>
            <textarea rows={3} value={note} onChange={e => setNote(e.target.value)} placeholder="Context for the team — never shown to the business." />
            <button className="btn btn-secondary btn-sm" style={{ marginTop: 8 }} disabled={busy} onClick={() => saveNote(open)}>Save note</button>
          </div>

          {isSuper && (
            <div className="panel-sec">
              <div className="panel-sec-title">Danger zone</div>
              <button className={'btn btn-block ' + (open.suspended ? 'btn-success' : 'btn-danger')} disabled={busy} onClick={() => toggleSuspend(open)}>
                {open.suspended ? 'Restore account' : 'Suspend account'}
              </button>
              <p className="hint" style={{ marginTop: 8, lineHeight: 1.5 }}>
                Suspending flags the workspace for the app to act on. It never deletes data.
              </p>
            </div>
          )}
        </div>
      )}
    </>
  );
}
