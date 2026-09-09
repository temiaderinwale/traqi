'use client';
/* Traqi admin — what actually moves through the platform. */

import React, { useState } from 'react';
import { Banknote, FileDown, Percent, Receipt, RotateCcw, TrendingUp } from 'lucide-react';
import { Card, Kpi, KpiGrid, SectionHead, BarChart, TableWrap } from '@/components/ui';
import { usePlatform } from '../platform';
import { Delta, Loading, PlanBadge, count, money, naira } from '../bits';
import { downloadCsv } from '@/lib/adminData';

export default function Transactions() {
  const { rows, metrics, loading, error } = usePlatform();
  const [metric, setMetric] = useState<'processed' | 'orders'>('processed');

  if (error) return <Card><p className="msg err" style={{ margin: 0 }}>{error}</p></Card>;
  if (loading || !metrics) return <Loading />;

  const m = metrics;
  const months = m.months;
  const cur = months[months.length - 1], prev = months[months.length - 2];
  const refundRate = m.gross ? (m.refunds / m.gross) * 100 : 0;
  const discountRate = m.gross ? (m.discounts / m.gross) * 100 : 0;
  const ytd = months.reduce((a, p) => a + p.processed, 0);

  const chart = months.map(p => ({
    label: p.label.split(' ')[0],
    value: metric === 'processed' ? p.processed : p.orders,
    display: metric === 'orders' ? String(p.orders || '') : undefined,
    active: p.key === cur?.key
  }));

  const leaders = [...rows].sort((a, b) => b.net - a.net).slice(0, 15);
  const withSales = rows.filter(b => b.orders > 0).length;

  const exportMonths = () => downloadCsv(`traqi_volume_${new Date().toISOString().slice(0, 7)}.csv`, [
    ['Month', 'Amount processed', 'Orders', 'New businesses'],
    ...months.map(p => [p.label, Math.round(p.processed), p.orders, p.newBusinesses]),
    ['All time', Math.round(m.processed), m.orders, m.businesses]
  ]);

  return (
    <>
      <KpiGrid>
        <Kpi icon={Banknote} tone="green" accent="green" label="Amount processed (all time)" value={money(m.processed)} sub={naira(m.processed)} />
        <Kpi icon={Receipt} label="Orders" value={count(m.orders)} sub={`${count(m.lineItems)} sale lines recorded`} />
        <Kpi icon={TrendingUp} label="Average order value" value={naira(m.avgOrder)} sub={`across ${count(withSales)} trading businesses`} />
        <Kpi icon={Banknote} label="Last 12 months" value={money(ytd)} sub={<>this month <Delta now={cur?.processed || 0} prev={prev?.processed || 0} /></>} />
      </KpiGrid>

      <KpiGrid>
        <Kpi icon={RotateCcw} tone="red" label="Refunds" value={money(m.refunds)} sub={`${refundRate.toFixed(1)}% of gross sales`} />
        <Kpi icon={Percent} tone="amber" label="Discounts given" value={money(m.discounts)} sub={`${discountRate.toFixed(1)}% of gross sales`} />
        <Kpi icon={Banknote} label="Gross sales" value={money(m.gross)} sub="before refunds and discounts" />
        <Kpi icon={Receipt} label="Orders this month" value={count(cur?.orders || 0)} sub={<>vs last month <Delta now={cur?.orders || 0} prev={prev?.orders || 0} /></>} />
      </KpiGrid>

      <Card style={{ marginBottom: 18 }}>
        <SectionHead title="Monthly volume" icon={TrendingUp} right={
          <>
            <div className="pill-toggle">
              <button className={metric === 'processed' ? 'on' : ''} onClick={() => setMetric('processed')}>Amount</button>
              <button className={metric === 'orders' ? 'on' : ''} onClick={() => setMetric('orders')}>Orders</button>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={exportMonths}><FileDown />CSV</button>
          </>
        } />
        <BarChart data={chart} height={200} />
      </Card>

      <div className="grid-3-2">
        <Card pad={false}>
          <div style={{ padding: '16px 18px 0' }}><SectionHead title="Volume leaderboard" icon={Receipt} /></div>
          <TableWrap minWidth={620} head={
            <tr>
              <th>#</th><th>Business</th><th>Plan</th>
              <th style={{ textAlign: 'right' }}>Orders</th>
              <th style={{ textAlign: 'right' }}>Avg order</th>
              <th style={{ textAlign: 'right' }}>Processed</th>
              <th style={{ textAlign: 'right' }}>Share</th>
            </tr>
          }>
            {leaders.map((b, i) => (
              <tr key={b.id}>
                <td className="hint tnum">{i + 1}</td>
                <td style={{ fontWeight: 600 }}>{b.bizName}</td>
                <td><PlanBadge plan={b.plan} /></td>
                <td className="tnum" style={{ textAlign: 'right' }}>{count(b.orders)}</td>
                <td className="tnum" style={{ textAlign: 'right' }}>{naira(b.orders ? b.net / b.orders : 0)}</td>
                <td className="tnum" style={{ textAlign: 'right', fontWeight: 600 }}>{naira(b.net)}</td>
                <td className="tnum hint" style={{ textAlign: 'right' }}>{m.processed ? Math.round((b.net / m.processed) * 100) : 0}%</td>
              </tr>
            ))}
            {!leaders.length && <tr><td colSpan={7} className="hint" style={{ textAlign: 'center', padding: 24 }}>No sales recorded yet.</td></tr>}
          </TableWrap>
        </Card>

        <Card>
          <SectionHead title="Month by month" icon={TrendingUp} />
          <div style={{ marginTop: 4 }}>
            {[...months].reverse().map(p => (
              <div key={p.key} className="panel-stat">
                <span>{p.label}</span>
                <span className="tnum">{money(p.processed)} · {count(p.orders)} orders</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}
