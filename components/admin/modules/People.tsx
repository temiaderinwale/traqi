'use client';
/* Traqi admin — the humans: owners, their teams, and how they sign in. */

import React, { useMemo, useState } from 'react';
import { FileDown, Search, UserCog, Users, UserSquare2 } from 'lucide-react';
import { Card, Kpi, KpiGrid, SectionHead, TableWrap, Badge, HBar } from '@/components/ui';
import { usePlatform } from '../platform';
import { ActivityBadge, Loading, PlanBadge, Th, count, since, shortDate, sortRows } from '../bits';
import { downloadCsv } from '@/lib/adminData';

export default function People() {
  const { rows, metrics, loading, error } = usePlatform();
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<{ k: string; dir: 1 | -1 }>({ k: 'assistants', dir: -1 });

  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase();
    if (!n) return rows;
    return rows.filter(b => [b.ownerName, b.email, b.bizName].some(v => v.toLowerCase().includes(n)));
  }, [rows, q]);

  if (error) return <Card><p className="msg err" style={{ margin: 0 }}>{error}</p></Card>;
  if (loading || !metrics) return <Loading />;

  const m = metrics;
  const google = rows.filter(b => b.authProvider === 'google').length;
  const withTeam = rows.filter(b => b.assistants > 0).length;
  const biggest = [...rows].sort((a, b) => b.assistants - a.assistants)[0];
  const shown = sortRows(filtered, sort);

  return (
    <>
      <KpiGrid>
        <Kpi icon={Users} label="People on Traqi" value={count(m.people)} sub={`${count(m.businesses)} owners · ${count(m.assistants)} assistants`} />
        <Kpi icon={UserCog} label="Businesses with a team" value={count(withTeam)}
          sub={`${m.businesses ? Math.round((withTeam / m.businesses) * 100) : 0}% have added assistants`} />
        <Kpi icon={UserSquare2} label="End customers tracked" value={count(m.customers)} sub="records inside all workspaces" />
        <Kpi icon={Users} label="Largest team" value={biggest ? count(biggest.assistants + 1) : '0'} sub={biggest?.bizName || '—'} />
      </KpiGrid>

      <div className="two-col" style={{ marginBottom: 18 }}>
        <Card>
          <SectionHead title="How owners sign in" icon={Users} />
          {[{ label: 'Google', n: google }, { label: 'Email & password', n: rows.length - google }].map(r => {
            const pct = rows.length ? Math.round((r.n / rows.length) * 100) : 0;
            return (
              <div key={r.label} style={{ marginTop: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.82rem', marginBottom: 5 }}>
                  <span style={{ fontWeight: 600 }}>{r.label}</span><span className="tnum hint">{count(r.n)} · {pct}%</span>
                </div>
                <HBar pct={pct} />
              </div>
            );
          })}
          <p className="hint" style={{ marginTop: 18, lineHeight: 1.6 }}>
            Assistants never hold their own Firebase account — they sign in with a PIN inside the
            owner&apos;s workspace, which is why they are counted here but have no login of their own.
          </p>
        </Card>
        <Card>
          <SectionHead title="Setup funnel" icon={UserCog} />
          {[
            { label: 'Registered', n: m.businesses },
            { label: 'Finished onboarding', n: m.onboarded },
            { label: 'Recorded a sale', n: rows.filter(b => b.orders > 0).length },
            { label: 'Added a team member', n: withTeam },
            { label: 'Active in last 30 days', n: m.active30 }
          ].map(step => {
            const pct = m.businesses ? Math.round((step.n / m.businesses) * 100) : 0;
            return (
              <div key={step.label} style={{ marginTop: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.82rem', marginBottom: 5 }}>
                  <span style={{ fontWeight: 600 }}>{step.label}</span><span className="tnum hint">{count(step.n)} · {pct}%</span>
                </div>
                <HBar pct={pct} color={pct > 60 ? 'var(--green-600)' : pct > 30 ? 'var(--amber-500)' : 'var(--red-600)'} />
              </div>
            );
          })}
        </Card>
      </div>

      <div className="search-row">
        <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
          <Search style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: 'var(--text-3)' }} />
          <input className="search-input" style={{ width: '100%', paddingLeft: 36 }} placeholder="Search owner, email or business"
            value={q} onChange={e => setQ(e.target.value)} />
        </div>
        <button className="btn btn-secondary btn-sm" onClick={() => downloadCsv('traqi_owners.csv', [
          ['Owner', 'Email', 'Business', 'Plan', 'Sign-in', 'Team size', 'Customers', 'Joined', 'Last active'],
          ...shown.map(b => [b.ownerName, b.email, b.bizName, b.plan, b.authProvider, b.assistants + 1, b.customers, b.createdAt, b.lastActive])
        ])}><FileDown />Export CSV</button>
      </div>

      <Card pad={false}>
        <TableWrap minWidth={860} head={
          <tr>
            <Th label="Owner" k="ownerName" sort={sort} setSort={setSort} />
            <Th label="Business" k="bizName" sort={sort} setSort={setSort} />
            <Th label="Plan" k="plan" sort={sort} setSort={setSort} />
            <th>Sign-in</th>
            <Th label="Team" k="assistants" sort={sort} setSort={setSort} right />
            <Th label="Customers" k="customers" sort={sort} setSort={setSort} right />
            <Th label="Joined" k="createdAt" sort={sort} setSort={setSort} />
            <Th label="Last active" k="lastActive" sort={sort} setSort={setSort} />
            <th>Status</th>
          </tr>
        }>
          {shown.map(b => (
            <tr key={b.id}>
              <td style={{ fontWeight: 600 }}>{b.ownerName}<span className="hint" style={{ display: 'block', fontSize: '.7rem' }}>{b.email}</span></td>
              <td>{b.bizName}</td>
              <td><PlanBadge plan={b.plan} /></td>
              <td><Badge tone="slate">{b.authProvider === 'google' ? 'Google' : 'Password'}</Badge></td>
              <td className="tnum" style={{ textAlign: 'right' }}>{count(b.assistants + 1)}</td>
              <td className="tnum" style={{ textAlign: 'right' }}>{count(b.customers)}</td>
              <td className="hint">{shortDate(b.createdAt)}</td>
              <td className="hint">{since(b.lastActive)}</td>
              <td><ActivityBadge b={b} /></td>
            </tr>
          ))}
          {!shown.length && <tr><td colSpan={9} className="hint" style={{ textAlign: 'center', padding: 28 }}>Nobody matches that search.</td></tr>}
        </TableWrap>
      </Card>
    </>
  );
}
