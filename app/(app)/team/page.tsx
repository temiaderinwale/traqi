'use client';
import React, { useState } from 'react';
import { Pencil, UserPlus, Users } from 'lucide-react';
import { useTraqi } from '@/lib/store';
import { fmtDate } from '@/lib/format';
import { ALL_PERMS } from '@/lib/compute';
import { PageHead, EmptyState, Card, Badge, Avatar } from '@/components/ui';
import { AssistantForm } from '@/components/forms';
import type { Assistant } from '@/lib/types';

export default function TeamPage() {
  const { ws, save, log, showToast } = useTraqi();
  const [form, setForm] = useState(false); const [editing, setEditing] = useState<Assistant | null>(null);
  const toggle = (a: Assistant) => {
    const next = a.active === false;
    save('assistants', ws.assistants.map(x => (x.id === a.id ? { ...x, active: next } : x)));
    log(next ? 'Activated assistant' : 'Deactivated assistant', a.name);
    showToast(a.name + (next ? ' activated' : ' deactivated'));
  };
  return (
    <>
      <PageHead title="Team" sub={`${ws.assistants.length} assistant${ws.assistants.length === 1 ? '' : 's'} registered`}
        actions={<button className="btn btn-primary" onClick={() => { setEditing(null); setForm(true); }}><UserPlus />Register Assistant</button>} />
      {ws.assistants.length ? ws.assistants.map(a => {
        const last = ws.auditLog.filter(l => l.userId === a.id).sort((x, y) => +new Date(y.ts) - +new Date(x.ts))[0];
        return (
          <Card key={a.id} style={{ marginBottom: 10, display: 'flex', gap: 14, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <Avatar name={a.name} tone="indigo" size={46} />
            <div style={{ flex: 1, minWidth: 180 }}>
              <div style={{ fontWeight: 700 }}>
                {a.name} <Badge tone={a.active === false ? 'red' : 'green'}>{a.active === false ? 'Inactive' : 'Active'}</Badge>
              </div>
              <div className="hint" style={{ marginTop: 3 }}>
                {a.phone || 'No phone'} · {last ? `${fmtDate(last.ts.slice(0, 10))} — ${last.action}` : 'No activity yet'}
              </div>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 8 }}>
                {(a.perms || []).length
                  ? a.perms.map(p => <Badge key={p}>{ALL_PERMS.find(x => x.key === p)?.label || p}</Badge>)
                  : <span className="hint">No permissions</span>}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn btn-secondary btn-sm" onClick={() => { setEditing(a); setForm(true); }}><Pencil />Edit</button>
              <button className={'btn btn-sm ' + (a.active === false ? 'btn-success' : 'btn-danger')} onClick={() => toggle(a)}>
                {a.active === false ? 'Activate' : 'Deactivate'}
              </button>
            </div>
          </Card>
        );
      }) : (
        <EmptyState icon={Users} title="No assistants yet" text="Add team members with their own PIN and permissions."
          action={<button className="btn btn-primary" onClick={() => setForm(true)}><UserPlus />Register Assistant</button>} />
      )}
      <AssistantForm open={form} onClose={() => setForm(false)} editing={editing} />
    </>
  );
}
