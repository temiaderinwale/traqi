'use client';
/* Traqi admin — data health, exports and the things worth checking on. */

import React from 'react';
import { AlertTriangle, Database, FileDown, HeartPulse, RefreshCw } from 'lucide-react';
import { Card, Kpi, KpiGrid, SectionHead, TableWrap, Badge } from '@/components/ui';
import { usePlatform } from '../platform';
import { useAdmin } from '@/lib/adminStore';
import { Loading, count, dateTime, naira, shortDate, since } from '../bits';
import { downloadCsv, daysSince } from '@/lib/adminData';
import { PLAN_LABEL } from '@/lib/adminTypes';

export default function System() {
  const { rows, metrics, loading, error, refresh } = usePlatform();
  const { me } = useAdmin();
  if (error) return <Card><p className="msg err" style={{ margin: 0 }}>{error}</p></Card>;
  if (loading || !metrics) return <Loading />;

  const m = metrics;
  const noEmail = rows.filter(b => !b.email || !b.email.includes('@'));
  const stalled = rows.filter(b => !b.onboarded);
  const noSales = rows.filter(b => b.orders === 0);
  const dormant = rows.filter(b => daysSince(b.lastActive) > 90);

  const issues = [
    { key: 'email', label: 'No usable email on file', tone: 'red' as const, rows: noEmail, why: 'Cannot be reached by newsletter or support.' },
    { key: 'setup', label: 'Never finished onboarding', tone: 'amber' as const, rows: stalled, why: 'Signed up but stopped before the workspace was set up.' },
    { key: 'sales', label: 'Never recorded a sale', tone: 'amber' as const, rows: noSales, why: 'Registered but the product has not been used in anger yet.' },
    { key: 'dormant', label: 'Dormant for 90+ days', tone: 'slate' as const, rows: dormant, why: 'Candidates for a win-back campaign.' }
  ];

  const exportEverything = () => downloadCsv(`traqi_platform_${new Date().toISOString().slice(0, 10)}.csv`, [
    ['Business', 'Owner', 'Email', 'Plan', 'Suspended', 'Onboarded', 'Joined', 'Last active',
      'Orders', 'Sale lines', 'Gross', 'Refunds', 'Discounts', 'Net processed', 'COGS',
      'Customers', 'Products', 'Assistants', 'Expenses', 'Debt outstanding', 'First sale', 'Last sale', 'UID'],
    ...rows.map(b => [b.bizName, b.ownerName, b.email, PLAN_LABEL[b.plan], b.suspended ? 'yes' : 'no',
      b.onboarded ? 'yes' : 'no', b.createdAt, b.lastActive, b.orders, b.lineItems, Math.round(b.gross),
      Math.round(b.refunds), Math.round(b.discounts), Math.round(b.net), Math.round(b.cogs),
      b.customers, b.products, b.assistants, Math.round(b.expenses), Math.round(b.debtOutstanding),
      b.firstSaleDate, b.lastSaleDate, b.id])
  ]);

  return (
    <>
      <KpiGrid>
        <Kpi icon={Database} label="Workspaces read" value={count(rows.length)} sub={`snapshot ${dateTime(m.fetchedAt)}`} />
        <Kpi icon={HeartPulse} tone="green" label="Healthy accounts" value={count(rows.length - noEmail.length - stalled.length)}
          sub="email on file and onboarded" />
        <Kpi icon={AlertTriangle} tone="amber" label="Need attention" value={count(noEmail.length + stalled.length)}
          sub="missing email or unfinished setup" />
        <Kpi icon={Database} label="Total records" value={count(m.lineItems + m.customers + m.products)}
          sub={`${count(m.lineItems)} sales · ${count(m.customers)} customers · ${count(m.products)} products`} />
      </KpiGrid>

      <div className="two-col" style={{ marginBottom: 18 }}>
        <Card>
          <SectionHead title="Console session" icon={HeartPulse} />
          <div className="panel-stat"><span>Signed in as</span><strong>{me?.username || me?.email}</strong></div>
          <div className="panel-stat"><span>Role</span><Badge tone={me?.role === 'superadmin' ? 'amber' : 'indigo'}>{me?.role === 'superadmin' ? 'Owner' : 'Admin'}</Badge></div>
          <div className="panel-stat"><span>Admin since</span><span>{shortDate(me?.createdAt || '')}</span></div>
          <div className="panel-stat"><span>Data snapshot</span><span>{since(m.fetchedAt)}</span></div>
          <button className="btn btn-secondary btn-block" style={{ marginTop: 14 }} onClick={refresh}><RefreshCw />Re-read the platform</button>
        </Card>
        <Card>
          <SectionHead title="Exports" icon={FileDown} />
          <p className="hint" style={{ marginBottom: 12, lineHeight: 1.6 }}>
            One row per business with every figure this console computes — useful for board decks,
            reconciliation, or a spreadsheet pivot.
          </p>
          <button className="btn btn-primary btn-block" onClick={exportEverything}><FileDown />Export full platform CSV</button>
          <p className="hint" style={{ marginTop: 14, lineHeight: 1.6 }}>
            Figures are rolled up in the browser from one read of the <code>businesses</code> collection.
            When that read gets heavy, move the rollup into a scheduled Cloud Function and have this
            console read the summary instead.
          </p>
        </Card>
      </div>

      {issues.map(g => (
        <Card pad={false} key={g.key} style={{ marginBottom: 18 }}>
          <div style={{ padding: '16px 18px 0' }}>
            <SectionHead title={`${g.label} — ${g.rows.length}`} icon={AlertTriangle}
              right={<Badge tone={g.tone}>{g.rows.length ? 'review' : 'clear'}</Badge>} />
            <p className="hint" style={{ margin: '-6px 0 10px' }}>{g.why}</p>
          </div>
          {g.rows.length ? (
            <TableWrap minWidth={620} head={
              <tr><th>Business</th><th>Owner</th><th>Email</th><th>Joined</th><th>Last active</th><th style={{ textAlign: 'right' }}>Processed</th></tr>
            }>
              {g.rows.slice(0, 25).map(b => (
                <tr key={b.id}>
                  <td style={{ fontWeight: 600 }}>{b.bizName}</td>
                  <td>{b.ownerName}</td>
                  <td className="hint">{b.email || '—'}</td>
                  <td className="hint">{shortDate(b.createdAt)}</td>
                  <td className="hint">{since(b.lastActive)}</td>
                  <td className="tnum" style={{ textAlign: 'right' }}>{naira(b.net)}</td>
                </tr>
              ))}
              {g.rows.length > 25 && (
                <tr><td colSpan={6} className="hint" style={{ textAlign: 'center' }}>+ {count(g.rows.length - 25)} more</td></tr>
              )}
            </TableWrap>
          ) : (
            <p className="hint" style={{ padding: '0 18px 18px' }}>Nothing to fix here.</p>
          )}
        </Card>
      ))}
    </>
  );
}
