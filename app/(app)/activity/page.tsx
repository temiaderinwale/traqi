'use client';
import React, { useState } from 'react';
import { Activity } from 'lucide-react';
import { useTraqi } from '@/lib/store';
import { PageHead, EmptyState, Card } from '@/components/ui';

export default function ActivityPage() {
  const { ws } = useTraqi();
  const [q, setQ] = useState(''); const [who, setWho] = useState('');
  const users: Record<string, string> = {};
  ws.auditLog.forEach(l => { users[l.userId] = l.userName; });
  const logs = ws.auditLog.slice().reverse().filter(l =>
    (!q || `${l.userName} ${l.action} ${l.detail}`.toLowerCase().includes(q.toLowerCase())) &&
    (!who || l.userId === who));

  return (
    <>
      <PageHead sub="Everything that happened in this workspace" />
      <div className="search-row">
        <input className="search-input" placeholder="Filter by name or action…" value={q} onChange={e => setQ(e.target.value)} />
        <select value={who} onChange={e => setWho(e.target.value)}>
          <option value="">All users</option>
          {Object.keys(users).map(u => <option key={u} value={u}>{users[u]}</option>)}
        </select>
      </div>
      {logs.length ? (
        <Card>
          {logs.slice(0, 150).map(l => {
            const t = new Date(l.ts);
            return (
              <div className="act-item" key={l.id}>
                <span className={'act-dot ' + (l.role === 'owner' ? 'owner' : 'assistant')} />
                <div style={{ flex: 1 }}>
                  <div><strong>{l.userName}</strong> <span style={{ color: 'var(--text-2)' }}>{l.action}</span></div>
                  {l.detail && <div className="hint" style={{ marginTop: 2 }}>{l.detail}</div>}
                </div>
                <div className="hint" style={{ whiteSpace: 'nowrap' }}>
                  {t.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} {t.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            );
          })}
        </Card>
      ) : <EmptyState icon={Activity} title="No activity yet" text="Actions are logged here as you and your team work." />}
    </>
  );
}
