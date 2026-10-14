'use client';
import React, { useState } from 'react';
import {
  ArrowUp, Banknote, BarChart3, Calendar, CalendarDays, FileDown, Hourglass,
  PieChart, Table as TableIcon, Target, TrendingUp, Wallet
} from 'lucide-react';
import { useTraqi, useMoney } from '@/lib/store';
import { salesStats } from '@/lib/compute';
import { marginClass } from '@/lib/format';
import { PageHead, TableWrap, Kpi, KpiGrid, Card, SectionHead, BarChart, HBar, Progress, Badge } from '@/components/ui';
import { TargetForm } from '@/components/forms';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const PALETTE = ['#4F46E5', '#818CF8', '#F59E0B', '#14B8A6', '#94A3B8', '#6366F1'];

export default function FinancialsPage() {
  const { ws } = useTraqi();
  const money = useMoney();
  const [targetOpen, setTargetOpen] = useState(false);
  const now = new Date(), m = now.getMonth(), y = now.getFullYear();
  const all = salesStats(ws), thisM = salesStats(ws, m, y);
  const lastM = salesStats(ws, m === 0 ? 11 : m - 1, m === 0 ? y - 1 : y);
  const monthly = MONTHS.map((mn, i) => ({ month: mn, idx: i, ...salesStats(ws, i, y) }));
  const trend = lastM.rev ? Math.round((thisM.rev - lastM.rev) / lastM.rev * 100) : 0;
  const margin = all.rev ? Math.round(all.profit / all.rev * 100) : 0;
  const target = ws.targets[`${m + 1}-${y}`] || 0;
  const pct = target ? Math.min(100, Math.round(thisM.rev / target * 100)) : 0;

  /* The breakdown and the chart under it answer the same question — revenue or
     profit, by category or by product — so one pair of toggles drives both.
     Profit here is per sale line (price less cost and discount); expenses
     belong to the business, not to any one product, so they stay out of it. */
  const [metric, setMetric] = useState<'rev' | 'profit'>('rev');
  const [group, setGroup] = useState<'cat' | 'prod'>('cat');
  const [focus, setFocus] = useState('');
  const [showAll, setShowAll] = useState(false);
  const metricName = metric === 'rev' ? 'Revenue' : 'Profit';
  const groupName = group === 'cat' ? 'category' : 'product';

  const keyOf = (s: typeof ws.sales[number]) =>
    group === 'cat' ? (s.cat || 'Uncategorised') : (s.prodId || s.prodName || 'Unknown product');
  const lineValue = (s: typeof ws.sales[number]) =>
    metric === 'rev' ? s.qty * s.price : s.qty * (s.price - s.cost) - (s.discount || 0);
  const labelOf = (k: string) =>
    group === 'cat' ? k : (ws.products.find(p => p.id === k)?.name || ws.sales.find(s => s.prodId === k)?.prodName || k);

  const totals: Record<string, number> = {};
  ws.sales.forEach(s => { const k = keyOf(s); totals[k] = (totals[k] || 0) + lineValue(s); });
  const keys = Object.keys(totals).sort((a, b) => totals[b] - totals[a]);
  const maxAbs = Math.max(...keys.map(k => Math.abs(totals[k])), 1);
  const LIMIT = 8;
  const shownKeys = showAll ? keys : keys.slice(0, LIMIT);

  const chartData = MONTHS.map((mn, i) => {
    const v = ws.sales.reduce((a, s) => {
      const d = new Date(s.date);
      if (d.getMonth() !== i || d.getFullYear() !== y) return a;
      if (focus && keyOf(s) !== focus) return a;
      return a + lineValue(s);
    }, 0);
    return {
      label: mn.slice(0, 1), value: Math.max(0, v), active: i === m,
      display: v ? (v < 0 ? '−' : '') + Math.round(Math.abs(v) / 1000) + 'k' : ''
    };
  });
  const switchView = (mt: typeof metric, gr: typeof group) => {
    if (gr !== group) { setFocus(''); setShowAll(false); }
    setMetric(mt); setGroup(gr);
  };

  const exportCSV = () => {
    const rows = [['Month', 'Revenue', 'Expenses', 'COGS', 'Net Profit', 'Margin %', 'Sales']];
    monthly.forEach(r => rows.push([r.month, String(r.rev), String(r.exp), String(r.cost), String(r.profit), String(r.rev ? Math.round(r.profit / r.rev * 100) : 0), String(r.count)]));
    rows.push(['Total', String(all.rev), String(all.exp), String(all.cost), String(all.profit), String(margin), String(all.count)]);
    const url = URL.createObjectURL(new Blob([rows.map(r => r.join(',')).join('\n')], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.download = `${(ws.config.bizName || 'Traqi').replace(/\s+/g, '_')}_Financials_${y}.csv`;
    a.href = url; a.click(); URL.revokeObjectURL(url);
  };

  return (
    <>
      <PageHead sub={`January – December ${y} · all figures in ₦`}
        actions={<>
          <button className="btn btn-secondary" onClick={() => window.print()}><FileDown />Print / PDF</button>
          <button className="btn btn-ghost" onClick={exportCSV}><TableIcon />Export CSV</button>
        </>} />
      <KpiGrid>
        <Kpi icon={Banknote} label="Total revenue" value={money(all.rev)} sub={`${all.orders} orders`} />
        <Kpi icon={Wallet} tone="red" label="Total expenses" value={money(all.exp)} sub={`incl. COGS ${money(all.cost)}`} />
        <Kpi icon={TrendingUp} tone="green" accent="green" label="Net profit" value={money(all.profit)}
          sub={<span className={marginClass(margin)}>{margin}% margin</span>} />
        <Kpi icon={CalendarDays} label="This month" value={money(thisM.rev)}
          sub={lastM.rev ? <span className={trend >= 0 ? 'pos' : 'neg'}><ArrowUp style={{ transform: trend >= 0 ? undefined : 'rotate(180deg)' }} />{Math.abs(trend)}% vs last month</span> : 'No prior month'} />
        <Kpi icon={Hourglass} tone="amber" label="Pending payments" value={money(all.pending)} />
      </KpiGrid>

      <Card style={{ marginBottom: 18 }}>
        {target ? (
          <>
            <div className="sec-head" style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span className="kpi-ico"><Target /></span>
                <div>
                  <h3 className="sec-title" style={{ fontSize: '1rem' }}>{MONTHS[m]} revenue target</h3>
                  <p className="hint tnum" style={{ marginTop: 2 }}>{money(thisM.rev)} of {money(target)}</p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span className="font-display tnum" style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--indigo-600)' }}>{pct}%</span>
                <button className="btn btn-ghost btn-sm" onClick={() => setTargetOpen(true)}>Edit</button>
              </div>
            </div>
            <Progress pct={pct} />
            {pct >= 100
              ? <p className="pos" style={{ fontSize: '.8rem', margin: '10px 0 0' }}>Target achieved — well done!</p>
              : <p className="hint" style={{ margin: '10px 0 0' }}>{money(target - thisM.rev)} to go</p>}
          </>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <h3 className="sec-title" style={{ fontSize: '1rem' }}><Target />Set a monthly target</h3>
              <p className="hint" style={{ marginTop: 4 }}>Give yourself something to aim at this month.</p>
            </div>
            <button className="btn btn-primary" onClick={() => setTargetOpen(true)}>Set target</button>
          </div>
        )}
      </Card>

      <div className="grid-3-2">
        <div>
          <SectionHead title="Monthly breakdown" icon={Calendar} right={<Badge>{y}</Badge>} />
          <TableWrap minWidth={700}
            head={<tr><th>Month</th><th className="num">Revenue</th><th className="num">Expenses</th><th className="num">COGS</th><th className="num">Net profit</th><th className="num">Margin</th><th className="num">Sales</th></tr>}
            foot={<tr><th>Total</th><td className="num tnum">{money(all.rev)}</td><td className="num tnum">{money(all.exp)}</td>
              <td className="num tnum">{money(all.cost)}</td><td className="num tnum pos">{money(all.profit)}</td>
              <td className="num tnum">{margin}%</td><td className="num tnum">{all.count}</td></tr>}>
            {monthly.map(r => {
              const pm = r.rev ? Math.round(r.profit / r.rev * 100) : 0;
              return (
                <tr key={r.month} className={r.idx === m ? 'row-now' : undefined}>
                  <th scope="row">{r.month}{r.idx === m && <> <Badge tone="indigo">Now</Badge></>}</th>
                  <td className="num tnum">{r.rev ? money(r.rev) : '—'}</td>
                  <td className="num tnum">{r.exp ? money(r.exp) : '—'}</td>
                  <td className="num tnum">{r.cost ? money(r.cost) : '—'}</td>
                  <td className="num tnum"><strong className={r.profit >= 0 ? 'pos' : 'neg'}>{r.rev || r.exp ? money(r.profit) : '—'}</strong></td>
                  <td className={'num tnum ' + (r.rev ? marginClass(pm) : '')}>{r.rev ? pm + '%' : '—'}</td>
                  <td className="num tnum">{r.count}</td>
                </tr>
              );
            })}
          </TableWrap>
        </div>
        <div>
          <SectionHead title={`${metricName} by ${groupName}`} icon={PieChart} />
          <Card>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
              <div className="pill-toggle">
                <button className={metric === 'rev' ? 'on' : ''} onClick={() => switchView('rev', group)}>Revenue</button>
                <button className={metric === 'profit' ? 'on' : ''} onClick={() => switchView('profit', group)}>Profit</button>
              </div>
              <div className="pill-toggle">
                <button className={group === 'cat' ? 'on' : ''} onClick={() => switchView(metric, 'cat')}>Category</button>
                <button className={group === 'prod' ? 'on' : ''} onClick={() => switchView(metric, 'prod')}>Product</button>
              </div>
            </div>
            {keys.length ? <>
              {shownKeys.map((k, i) => {
                const v = totals[k];
                const on = focus === k;
                return (
                  <div key={k} role="button" tabIndex={0} title="Show in the chart below"
                    onClick={() => setFocus(on ? '' : k)}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setFocus(on ? '' : k); } }}
                    style={{ marginBottom: 14, cursor: 'pointer', opacity: focus && !on ? 0.55 : 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: '.83rem', marginBottom: 6 }}>
                      <span style={{ fontWeight: on ? 700 : 500 }}>{labelOf(k)}</span>
                      <strong className={'tnum' + (v < 0 ? ' neg' : '')}>{money(v)}</strong>
                    </div>
                    <HBar pct={Math.abs(v) / maxAbs * 100} color={v < 0 ? 'var(--red-600)' : PALETTE[i % PALETTE.length]} />
                  </div>
                );
              })}
              {keys.length > LIMIT && (
                <button className="btn btn-ghost btn-sm" onClick={() => setShowAll(s => !s)}>
                  {showAll ? 'Show top ' + LIMIT : `Show all ${keys.length}`}
                </button>
              )}
              {metric === 'profit' && <p className="hint" style={{ margin: '10px 0 0' }}>Selling price less cost and discounts, before expenses.</p>}
            </> : <p className="hint" style={{ textAlign: 'center', margin: 0 }}>No sales data yet</p>}
          </Card>
          <div style={{ height: 16 }} />
          <SectionHead title={`${metricName} chart`} icon={BarChart3}
            right={focus
              ? <button className="btn btn-ghost btn-sm" onClick={() => setFocus('')}>{labelOf(focus)} ✕</button>
              : <Badge>All {group === 'cat' ? 'categories' : 'products'} · {y}</Badge>} />
          <Card>
            <BarChart data={chartData} />
          </Card>
        </div>
      </div>
      <TargetForm open={targetOpen} onClose={() => setTargetOpen(false)} />
    </>
  );
}
