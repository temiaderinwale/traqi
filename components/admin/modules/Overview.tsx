'use client';
/* Traqi admin — platform pulse: who is on Traqi, how much moves through it. */

import React from 'react';
import {
  Activity, Banknote, BarChart3, Building2, CreditCard, Receipt, TrendingUp, UserPlus, Users, Wallet
} from 'lucide-react';
import { Kpi, KpiGrid, Card, SectionHead, BarChart, TableWrap, HBar } from '@/components/ui';
import { usePlatform } from '../platform';
import { money, naira, count, since, Delta, Loading, ActivityBadge, PlanBadge } from '../bits';
import { PLANS, PLAN_LABEL } from '@/lib/adminTypes';

export default function Overview() {
  const { rows, metrics, loading, error } = usePlatform();
  if (error) return <Card><p className="msg err" style={{ margin: 0 }}>{error}</p></Card>;
  if (loading || !metrics) return <Loading />;

  const m = metrics;
  const last12 = m.months;
  const thisMonth = last12[last12.length - 1];
  const prevMonth = last12[last12.length - 2];
  const chart = last12.map(p => ({ label: p.label.split(' ')[0], value: p.processed, active: p.key === thisMonth?.key }));
  const newChart = last12.map(p => ({ label: p.label.split(' ')[0], value: p.newBusinesses, display: String(p.newBusinesses || ''), active: p.key === thisMonth?.key }));
  const topBiz = [...rows].sort((a, b) => b.net - a.net).slice(0, 8);

  return (
    <>
      <KpiGrid>
        <Kpi icon={Building2} label="Businesses on Traqi" value={count(m.businesses)}
          sub={<>{count(m.newThisMonth)} joined this month · <Delta now={m.newThisMonth} prev={m.newLastMonth} /></>} />
        <Kpi icon={Banknote} tone="green" accent="green" label="Amount processed" value={money(m.processed)}
          sub={`${naira(m.processed)} net of refunds & discounts`} />
        <Kpi icon={Receipt} label="Transaction volume" value={count(m.orders)}
          sub={`${count(m.lineItems)} sale lines · avg order ${naira(m.avgOrder)}`} />
        <Kpi icon={Activity} tone="amber" label="Active businesses" value={count(m.active30)}
          sub={`${count(m.active7)} this week · ${count(m.dormant)} dormant`} />
      </KpiGrid>

      <KpiGrid>
        <Kpi icon={Users} label="People on the platform" value={count(m.people)}
          sub={`${count(m.businesses)} owners · ${count(m.assistants)} assistants`} />
        <Kpi icon={CreditCard} label="Est. monthly recurring" value={money(m.mrr)}
          sub={`${count(m.planCounts.pro)} Pro · ${count(m.planCounts.lite)} Lite`} />
        <Kpi icon={BarChart3} label="This month processed" value={money(thisMonth?.processed || 0)}
          sub={<>vs last month <Delta now={thisMonth?.processed || 0} prev={prevMonth?.processed || 0} /></>} />
        <Kpi icon={Wallet} tone="red" label="Outstanding customer debt" value={money(m.debtOutstanding)}
          sub={`tracked across ${count(m.businesses)} workspaces`} />
      </KpiGrid>

      <Card style={{ marginBottom: 18 }}>
        <SectionHead title="Amount processed — last 12 months" icon={TrendingUp} />
        <BarChart data={chart} height={190} />
      </Card>

      <div className="two-col" style={{ marginBottom: 18 }}>
        <Card>
          <SectionHead title="New businesses per month" icon={UserPlus} />
          <BarChart data={newChart} height={150} />
        </Card>
        <Card>
          <SectionHead title="Plan mix" icon={CreditCard} />
          <div style={{ display: 'grid', gap: 12, marginTop: 6 }}>
            {PLANS.map(p => {
              const n = m.planCounts[p];
              const pct = m.businesses ? Math.round((n / m.businesses) * 100) : 0;
              return (
                <div key={p}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.8rem', marginBottom: 5 }}>
                    <span style={{ fontWeight: 600 }}>{PLAN_LABEL[p]}</span>
                    <span className="tnum hint">{count(n)} · {pct}%</span>
                  </div>
                  <HBar pct={pct} color={p === 'pro' ? 'var(--indigo-600)' : p === 'lite' ? 'var(--amber-500)' : 'var(--text-3)'} />
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <Card pad={false}>
        <div style={{ padding: '16px 18px 0' }}>
          <SectionHead title="Biggest workspaces by volume" icon={BarChart3} />
        </div>
        <TableWrap head={
          <tr>
            <th>Business</th><th>Owner</th><th>Plan</th>
            <th style={{ textAlign: 'right' }}>Orders</th>
            <th style={{ textAlign: 'right' }}>Processed</th>
            <th>Status</th><th>Last active</th>
          </tr>
        }>
          {topBiz.map(b => (
            <tr key={b.id}>
              <td style={{ fontWeight: 600 }}>{b.bizName}</td>
              <td className="hint">{b.ownerName}</td>
              <td><PlanBadge plan={b.plan} /></td>
              <td className="tnum" style={{ textAlign: 'right' }}>{count(b.orders)}</td>
              <td className="tnum" style={{ textAlign: 'right', fontWeight: 600 }}>{naira(b.net)}</td>
              <td><ActivityBadge b={b} /></td>
              <td className="hint">{since(b.lastActive)}</td>
            </tr>
          ))}
          {!topBiz.length && <tr><td colSpan={7} className="hint" style={{ textAlign: 'center', padding: 24 }}>No businesses yet.</td></tr>}
        </TableWrap>
      </Card>
    </>
  );
}
