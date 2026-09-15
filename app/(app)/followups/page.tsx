'use client';
import React from 'react';
import { AlertCircle, BellRing, Check, Clock, Info, MessageCircle } from 'lucide-react';
import { useTraqi } from '@/lib/store';
import { getFollowUps } from '@/lib/compute';
import { fmtDate, waLink } from '@/lib/format';
import { PageHead, EmptyState, Kpi, KpiGrid, RowCard, Avatar, Badge } from '@/components/ui';

export default function FollowUpsPage() {
  const { ws, followUpsDone, markFollowUpDone } = useTraqi();
  const rows = getFollowUps(ws, followUpsDone);
  const overdue = rows.filter(r => r.status === 'overdue');
  const due = rows.filter(r => r.status === 'followup');
  const upcoming = rows.filter(r => r.status === 'upcoming');

  const Group = ({ title, arr, tone }: { title: string; arr: typeof rows; tone: 'bad' | 'warn' | 'ok' }) =>
    arr.length ? (
      <>
        <h3 className="sec-title" style={{ fontSize: '1rem', margin: '18px 0 10px' }}>{title} <Badge>{arr.length}</Badge></h3>
        {arr.map(f => (
          <RowCard key={f.saleId} tone={tone}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', minWidth: 0 }}>
              <Avatar name={f.custName} />
              <div style={{ minWidth: 0 }}>
                <div className="row-title">{f.custName}</div>
                <div className="row-meta">{f.prodName} · {f.usageDays}-day product · {f.phone}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0 }}>
              <div style={{ textAlign: 'right' }}>
                <div className="hint">Finishes {fmtDate(f.finishDate)}</div>
                <div className={'hint ' + (f.dFinish < 0 ? 'neg' : '')}>
                  {f.dFinish >= 0 ? `${f.dFinish}d left` : `${Math.abs(f.dFinish)}d overdue`}
                </div>
              </div>
              <a className="btn btn-wa btn-sm" href={waLink(f.wa)} target="_blank" rel="noreferrer"><MessageCircle /></a>
              <button className="btn btn-success btn-sm" onClick={() => markFollowUpDone(f.saleId)}><Check />Done</button>
            </div>
          </RowCard>
        ))}
      </>
    ) : null;

  return (
    <>
      <PageHead sub="Auto-calculated from sales and product usage days" />
      <KpiGrid>
        <Kpi icon={AlertCircle} tone="red" label="Overdue" value={overdue.length} sub="Contact now" />
        <Kpi icon={BellRing} tone="amber" label="Due now" value={due.length} sub="Within 3 days" />
        <Kpi icon={Clock} tone="green" label="Upcoming" value={upcoming.length} sub="Still in use" />
      </KpiGrid>
      <div className="info-banner"><Info />Traqi reminds you 3 days before each customer finishes their product.</div>
      {rows.length ? (
        <>
          <Group title="Overdue" arr={overdue} tone="bad" />
          <Group title="Due now" arr={due} tone="warn" />
          <Group title="Upcoming" arr={upcoming} tone="ok" />
        </>
      ) : <EmptyState icon={BellRing} title="No follow-ups yet" text="Record sales with usage days and reminders appear here automatically." />}
    </>
  );
}
