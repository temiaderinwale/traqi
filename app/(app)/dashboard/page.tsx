'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import {
  Banknote, BellRing, Cake, Hourglass, ListChecks, MessageCircle, MessagesSquare,
  PackageX, Plus, ShieldCheck, TrendingUp
} from 'lucide-react';
import { useTraqi, useMoney } from '@/lib/store';
import { getFollowUps, getInventory, getBirthdays, pendingTaskCount, unreadMsgCount } from '@/lib/compute';
import { todayStr, waLink, diffDays } from '@/lib/format';
import { Kpi, KpiGrid, SectionHead, BarChart, Card, Avatar, RowCard, Badge } from '@/components/ui';
import { SaleForm, ReceiptModal } from '@/components/SaleForm';

export default function DashboardPage() {
  const { ws, user, isOwner, can, followUpsDone } = useTraqi();
  const money = useMoney();
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('today');
  const [saleOpen, setSaleOpen] = useState(false);
  const [receipt, setReceipt] = useState<string | null>(null);

  const hr = new Date().getHours(), dow = new Date().getDay();
  const greet = hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : 'Good evening';
  const extra = dow === 1 ? ' Happy new week!' : dow === 5 ? ' Happy Friday!' : '';

  const today = todayStr(), now = new Date();
  let scoped = ws.sales;
  if (period === 'today') scoped = ws.sales.filter(s => s.date === today);
  else if (period === 'week') { const w = new Date(); w.setDate(w.getDate() - 7); scoped = ws.sales.filter(s => new Date(s.date) >= w); }
  else scoped = ws.sales.filter(s => { const d = new Date(s.date); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); });
  if (!isOwner) scoped = scoped.filter(s => s.recordedBy === user.id);

  const rev = scoped.reduce((a, s) => a + s.qty * s.price, 0);
  const orders = new Set(scoped.map(s => s.orderId || s.id)).size;

  const fus = getFollowUps(ws, followUpsDone);
  const due = fus.filter(f => f.status !== 'upcoming');
  const lowStock = getInventory(ws).filter(i => i.status !== 'OK');
  const debts = ws.debts.filter(d => d.status !== 'Cleared');
  const bdays = getBirthdays(ws).filter(b => b.daysAway <= 7);
  const tasks = pendingTaskCount(ws, user), unread = unreadMsgCount(ws, user);
  const approvals = ws.pending.filter(p => p.status === 'pending').length;

  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    const ds = d.toISOString().slice(0, 10);
    return {
      label: d.toLocaleDateString('en-GB', { weekday: 'short' }).slice(0, 3),
      value: ws.sales.filter(s => s.date === ds).reduce((a, s) => a + s.qty * s.price, 0),
      active: ds === today
    };
  });

  const tiles = [
    tasks && { icon: ListChecks, label: 'Tasks', value: tasks, href: '/tasks', tone: 'amber' as const },
    unread && { icon: MessagesSquare, label: 'Unread messages', value: unread, href: '/messages', tone: 'amber' as const },
    isOwner && approvals && { icon: ShieldCheck, label: 'Approvals waiting', value: approvals, href: '/approvals', tone: 'red' as const },
    bdays.length && { icon: Cake, label: 'Birthdays this week', value: bdays.length, href: '/customers', tone: undefined }
  ].filter(Boolean) as { icon: any; label: string; value: number; href: string; tone?: 'amber' | 'red' }[];

  return (
    <>
      <div className="sec-head" style={{ marginBottom: 18 }}>
        <div>
          <div className="page-h1">{greet}, {(user.name || 'there').split(' ')[0]} 👋{extra}</div>
          <div className="page-sub">{new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
        </div>
        {can('record_sales') && <button className="btn btn-primary" onClick={() => setSaleOpen(true)}><Plus />New Sale</button>}
      </div>

      <KpiGrid>
        <Kpi icon={Banknote} label={period === 'today' ? "Today's Revenue" : period === 'week' ? 'Revenue · 7 days' : 'Revenue · this month'}
          value={money(rev)} sub={`${orders} order${orders === 1 ? '' : 's'}`} />
        <Kpi icon={BellRing} tone="amber" label="Follow-ups due" value={due.length} sub={due.length ? 'Contact them today' : 'All caught up'} />
        <Kpi icon={PackageX} tone={lowStock.length ? 'red' : 'green'} label="Low stock items" value={lowStock.length} sub={lowStock.length ? 'Restock soon' : 'Stock healthy'} />
        <Kpi icon={Hourglass} tone="amber" label="Outstanding debts" value={money(debts.reduce((a, d) => a + (d.total - d.paid), 0))} sub={`${debts.length} customer${debts.length === 1 ? '' : 's'}`} />
      </KpiGrid>

      <Card style={{ marginBottom: 18 }}>
        <div className="sec-head" style={{ marginBottom: 6 }}>
          <div>
            <h3 className="sec-title" style={{ fontSize: '1rem' }}><TrendingUp />Sales summary</h3>
            <p className="hint" style={{ marginTop: 4 }}>
              Last 7 days · <strong className="tnum" style={{ color: 'var(--text)' }}>{money(week.reduce((a, d) => a + d.value, 0))}</strong>
            </p>
          </div>
          <div className="pill-toggle">
            {(['today', 'week', 'month'] as const).map(p => (
              <button key={p} className={period === p ? 'on' : ''} onClick={() => setPeriod(p)}>
                {p === 'today' ? 'Today' : p === 'week' ? '7 Days' : 'Month'}
              </button>
            ))}
          </div>
        </div>
        <div style={{ marginTop: 14 }}><BarChart data={week} /></div>
      </Card>

      {!!tiles.length && (
        <KpiGrid>
          {tiles.map(t => (
            <Link key={t.label} href={t.href} className="kpi card-hover" style={{ cursor: 'pointer', display: 'block' }}>
              <div className="kpi-head"><span className={'kpi-ico ' + (t.tone || '')}><t.icon /></span><span className="kpi-label">{t.label}</span></div>
              <div className="kpi-value">{t.value}</div>
            </Link>
          ))}
        </KpiGrid>
      )}

      <div className="grid-3-2" style={{ marginBottom: 18 }}>
        <div>
          <SectionHead title="Today's follow-ups" icon={BellRing}
            right={<Link className="btn btn-ghost btn-sm" href="/followups">View all →</Link>} />
          {due.length ? due.slice(0, 5).map(f => (
            <RowCard key={f.saleId} tone={f.status === 'overdue' ? 'bad' : 'warn'}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', minWidth: 0 }}>
                <Avatar name={f.custName} />
                <div style={{ minWidth: 0 }}>
                  <div className="row-title">{f.custName}</div>
                  <div className="row-meta">{f.prodName} · {f.phone}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                <Badge tone={f.status === 'overdue' ? 'red' : 'amber'}>{f.status === 'overdue' ? 'OVERDUE' : 'DUE'}</Badge>
                <a className="btn btn-wa btn-icon" href={waLink(f.wa)} target="_blank" rel="noreferrer" aria-label="WhatsApp"><MessageCircle /></a>
              </div>
            </RowCard>
          )) : <div className="muted-box">No urgent follow-ups</div>}
        </div>
        <div>
          <SectionHead title="Birthdays" icon={Cake} />
          <div className="card gradient-card card-p">
            <div className="mark-pattern" />
            <div style={{ position: 'relative' }}>
              {bdays.length ? bdays.slice(0, 4).map(b => (
                <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid rgba(255,255,255,.08)' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '.86rem' }}>{b.name}{b.isToday ? ' 🎉' : ''}</div>
                    <div className="g-sub" style={{ fontSize: '.72rem' }}>{b.isToday ? 'Today!' : `In ${b.daysAway} days`}</div>
                  </div>
                  <a className="btn btn-sm" style={{ background: 'rgba(255,255,255,.12)', color: '#fff' }}
                    href={waLink(b.wa || b.phone)} target="_blank" rel="noreferrer">Wish</a>
                </div>
              )) : <p style={{ color: 'var(--indigo-400)', fontSize: '.85rem', margin: 0 }}>No birthdays in the next 7 days</p>}
            </div>
          </div>
        </div>
      </div>

      <div className="two-col">
        <div>
          <SectionHead title="Low stock" icon={PackageX} right={<Link className="btn btn-ghost btn-sm" href="/inventory">Restock →</Link>} />
          {lowStock.length ? lowStock.slice(0, 4).map(i => (
            <RowCard key={i.id} tone={i.status === 'OUT OF STOCK' ? 'bad' : 'warn'}>
              <div><div className="row-title">{i.name}</div><div className="row-meta">Reorder level: {i.reorder || 0}</div></div>
              <strong className={'tnum ' + (i.status === 'OUT OF STOCK' ? 'neg' : 'warn-t')}>{i.current} left</strong>
            </RowCard>
          )) : <div className="muted-box">All stock levels are healthy</div>}
        </div>
        <div>
          <SectionHead title="Outstanding debts" icon={Hourglass} right={<Link className="btn btn-ghost btn-sm" href="/debts">View all →</Link>} />
          {debts.length ? debts.slice(0, 4).map(d => {
            const over = d.due && diffDays(d.due) < 0;
            return (
              <RowCard key={d.id} tone={over ? 'bad' : 'warn'}>
                <div><div className="row-title">{d.custName}</div><div className="row-meta">{d.prod || '—'}{over ? ' · overdue' : ''}</div></div>
                <strong className="tnum">{money(d.total - d.paid)}</strong>
              </RowCard>
            );
          }) : <div className="muted-box">No outstanding debts</div>}
        </div>
      </div>

      <SaleForm open={saleOpen} onClose={() => setSaleOpen(false)} onSaved={setReceipt} />
      <ReceiptModal orderId={receipt} onClose={() => setReceipt(null)} />
    </>
  );
}
