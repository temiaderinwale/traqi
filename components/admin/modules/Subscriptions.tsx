'use client';
/* Traqi admin — plans, trials and what they are worth. */

import React, { useMemo, useState } from 'react';
import { CreditCard, FileDown, Sparkles, TrendingUp, Users } from 'lucide-react';
import { Card, Kpi, KpiGrid, SectionHead, TableWrap, HBar, Badge } from '@/components/ui';
import { usePlatform } from '../platform';
import { useAdmin } from '@/lib/adminStore';
import { Loading, PlanBadge, count, money, naira, since, shortDate } from '../bits';
import { downloadCsv, setBusinessPlan, daysSince } from '@/lib/adminData';
import { Plan, PLANS, PLAN_LABEL, PLAN_PRICE } from '@/lib/adminTypes';

export default function Subscriptions() {
  const { rows, metrics, loading, error, patchRow } = usePlatform();
  const { logAudit } = useAdmin();
  const [busy, setBusy] = useState('');

  const byPlan = useMemo(() => {
    const map = {} as Record<Plan, { n: number; processed: number; value: number }>;
    PLANS.forEach(p => { map[p] = { n: 0, processed: 0, value: 0 }; });
    rows.forEach(b => {
      map[b.plan].n++;
      map[b.plan].processed += b.net;
      if (!b.suspended) map[b.plan].value += PLAN_PRICE[b.plan];
    });
    return map;
  }, [rows]);

  /* Trials that have been running a while are the ones worth a call. */
  const trials = useMemo(
    () => rows.filter(b => b.plan === 'trial')
      .map(b => ({ ...b, age: Math.floor(daysSince(b.createdAt)) }))
      .sort((a, b) => b.age - a.age),
    [rows]
  );

  const move = async (id: string, name: string, plan: Plan) => {
    setBusy(id);
    try {
      await setBusinessPlan(id, plan);
      patchRow(id, { plan });
      await logAudit('plan_change', `${name} → ${PLAN_LABEL[plan]}`);
    } catch { alert('Could not update the plan.'); }
    setBusy('');
  };

  if (error) return <Card><p className="msg err" style={{ margin: 0 }}>{error}</p></Card>;
  if (loading || !metrics) return <Loading />;

  const m = metrics;
  const paying = m.planCounts.lite + m.planCounts.pro;
  const conversion = m.businesses ? Math.round((paying / m.businesses) * 100) : 0;

  return (
    <>
      <KpiGrid>
        <Kpi icon={CreditCard} label="Estimated MRR" value={money(m.mrr)} sub={`${naira(m.mrr * 12)} annualised`} />
        <Kpi icon={Users} tone="green" accent="green" label="Paying businesses" value={count(paying)} sub={`${conversion}% of all accounts`} />
        <Kpi icon={Sparkles} tone="amber" label="On trial" value={count(m.planCounts.trial)} sub={`${count(trials.filter(t => t.age > 30).length)} running over 30 days`} />
        <Kpi icon={TrendingUp} label="Free (Starter)" value={count(m.planCounts.starter)} sub="upgrade candidates" />
      </KpiGrid>

      <div className="two-col" style={{ marginBottom: 18 }}>
        <Card>
          <SectionHead title="Plan distribution" icon={CreditCard} />
          <div style={{ display: 'grid', gap: 14, marginTop: 6 }}>
            {PLANS.map(p => {
              const d = byPlan[p];
              const pct = m.businesses ? Math.round((d.n / m.businesses) * 100) : 0;
              return (
                <div key={p}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
                    <span style={{ fontWeight: 600, fontSize: '.85rem' }}>{PLAN_LABEL[p]}
                      <span className="hint" style={{ marginLeft: 8, fontWeight: 400 }}>{PLAN_PRICE[p] ? naira(PLAN_PRICE[p]) + '/mo' : 'free'}</span>
                    </span>
                    <span className="tnum hint">{count(d.n)} · {pct}%</span>
                  </div>
                  <HBar pct={pct} color={p === 'pro' ? 'var(--indigo-600)' : p === 'lite' ? 'var(--amber-500)' : 'var(--text-3)'} />
                  <div className="hint" style={{ fontSize: '.7rem', marginTop: 4 }}>
                    {money(d.processed)} processed · {money(d.value)} monthly value
                  </div>
                </div>
              );
            })}
          </div>
          <p className="hint" style={{ marginTop: 16, lineHeight: 1.6 }}>
            Plan prices live in <code>lib/adminTypes.ts</code> (<code>PLAN_PRICE</code>) — edit them there when
            pricing is published and every figure here follows.
          </p>
        </Card>

        <Card>
          <SectionHead title="Revenue mix" icon={TrendingUp} right={
            <button className="btn btn-secondary btn-sm" onClick={() => downloadCsv('traqi_plans.csv', [
              ['Plan', 'Businesses', 'Monthly value', 'Processed'],
              ...PLANS.map(p => [PLAN_LABEL[p], byPlan[p].n, byPlan[p].value, Math.round(byPlan[p].processed)])
            ])}><FileDown />CSV</button>
          } />
          <div style={{ marginTop: 4 }}>
            {PLANS.map(p => (
              <div className="panel-stat" key={p}>
                <span><PlanBadge plan={p} /></span>
                <span className="tnum">{count(byPlan[p].n)} × {PLAN_PRICE[p] ? naira(PLAN_PRICE[p]) : '₦0'} = <strong>{naira(byPlan[p].value)}</strong></span>
              </div>
            ))}
            <div className="panel-stat" style={{ borderBottom: 'none', paddingTop: 14 }}>
              <strong>Estimated MRR</strong><strong className="tnum">{naira(m.mrr)}</strong>
            </div>
          </div>
        </Card>
      </div>

      <Card pad={false}>
        <div style={{ padding: '16px 18px 0' }}>
          <SectionHead title="Trials — oldest first" icon={Sparkles} />
        </div>
        <TableWrap minWidth={760} head={
          <tr>
            <th>Business</th><th>Owner</th>
            <th style={{ textAlign: 'right' }}>Trial age</th>
            <th style={{ textAlign: 'right' }}>Processed</th>
            <th>Last active</th><th>Joined</th><th>Move to</th>
          </tr>
        }>
          {trials.map(b => (
            <tr key={b.id}>
              <td style={{ fontWeight: 600 }}>{b.bizName}</td>
              <td>{b.ownerName}<span className="hint" style={{ display: 'block', fontSize: '.7rem' }}>{b.email}</span></td>
              <td style={{ textAlign: 'right' }}>
                {isFinite(b.age) ? <Badge tone={b.age > 30 ? 'red' : b.age > 14 ? 'amber' : 'slate'}>{b.age} days</Badge> : <span className="hint">—</span>}
              </td>
              <td className="tnum" style={{ textAlign: 'right' }}>{naira(b.net)}</td>
              <td className="hint">{since(b.lastActive)}</td>
              <td className="hint">{shortDate(b.createdAt)}</td>
              <td>
                <div className="row-actions">
                  {(['starter', 'lite', 'pro'] as Plan[]).map(p => (
                    <button key={p} className="btn btn-secondary btn-sm" disabled={busy === b.id}
                      onClick={() => move(b.id, b.bizName, p)}>{PLAN_LABEL[p]}</button>
                  ))}
                </div>
              </td>
            </tr>
          ))}
          {!trials.length && <tr><td colSpan={7} className="hint" style={{ textAlign: 'center', padding: 24 }}>No accounts are on trial.</td></tr>}
        </TableWrap>
      </Card>
    </>
  );
}
