'use client';
/* Traqi admin — every privileged action, in order. */

import React, { useEffect, useMemo, useState } from 'react';
import { Activity, FileDown, Search } from 'lucide-react';
import { Card, SectionHead, TableWrap, Badge } from '@/components/ui';
import { useAdmin } from '@/lib/adminStore';
import { dateTime } from '../bits';
import { downloadCsv } from '@/lib/adminData';

const LABEL: Record<string, string> = {
  admin_approved: 'Admin approved', admin_rejected: 'Admin declined',
  admin_suspended: 'Admin suspended', admin_pending: 'Admin set pending',
  admin_role: 'Admin role changed', plan_change: 'Plan changed',
  business_suspend: 'Business suspended', business_restore: 'Business restored',
  business_note: 'Note saved', newsletter_draft: 'Newsletter drafted',
  newsletter_schedule: 'Newsletter scheduled', newsletter_send: 'Newsletter queued',
  newsletter_delete: 'Newsletter deleted', unsubscribe_add: 'Unsubscribe added',
  unsubscribe_remove: 'Unsubscribe removed',
  pilot_new: 'Pilot applicant reopened', pilot_contacted: 'Pilot applicant contacted',
  pilot_approved: 'Pilot applicant approved', pilot_declined: 'Pilot applicant declined',
  pilot_note: 'Pilot note saved',
  pilot_archived: 'Pilot applicant archived', pilot_restored: 'Pilot applicant restored'
};

const TONE = (a: string) =>
  a.includes('suspend') || a.includes('reject') || a.includes('decline') || a.includes('delete') ? 'red'
    : a.includes('approve') || a.includes('restore') ? 'green'
      : a.includes('newsletter') ? 'indigo' : a.startsWith('pilot') ? 'blue' : 'slate';

export default function AuditLog() {
  const { audit, refreshAudit } = useAdmin();
  const [q, setQ] = useState('');
  useEffect(() => { refreshAudit(); }, [refreshAudit]);

  const shown = useMemo(() => {
    const n = q.trim().toLowerCase();
    if (!n) return audit;
    return audit.filter(a => [a.name, a.action, a.detail, LABEL[a.action] || ''].some(v => (v || '').toLowerCase().includes(n)));
  }, [audit, q]);

  return (
    <Card pad={false}>
      <div style={{ padding: '16px 18px 0' }}>
        <SectionHead title="Admin activity" icon={Activity} right={
          <>
            <button className="btn btn-secondary btn-sm" onClick={refreshAudit}>Refresh</button>
            <button className="btn btn-secondary btn-sm" onClick={() => downloadCsv('traqi_admin_audit.csv', [
              ['When', 'Admin', 'Action', 'Detail'],
              ...shown.map(a => [a.ts, a.name, LABEL[a.action] || a.action, a.detail])
            ])}><FileDown />CSV</button>
          </>
        } />
      </div>
      <div style={{ padding: '0 18px 12px' }}>
        <div style={{ position: 'relative', maxWidth: 320 }}>
          <Search style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: 'var(--text-3)' }} />
          <input style={{ width: '100%', paddingLeft: 36 }} placeholder="Search the log" value={q} onChange={e => setQ(e.target.value)} />
        </div>
      </div>
      <TableWrap minWidth={640} head={<tr><th>When</th><th>Admin</th><th>Action</th><th>Detail</th></tr>}>
        {shown.map(a => (
          <tr key={a.id}>
            <td className="hint" style={{ whiteSpace: 'nowrap' }}>{dateTime(a.ts)}</td>
            <td style={{ fontWeight: 600 }}>{a.name}</td>
            <td><Badge tone={TONE(a.action) as any}>{LABEL[a.action] || a.action}</Badge></td>
            <td className="hint">{a.detail || '—'}</td>
          </tr>
        ))}
        {!shown.length && (
          <tr><td colSpan={4} className="hint" style={{ textAlign: 'center', padding: 26 }}>
            Nothing logged yet. Approvals, plan changes and sends all land here.
          </td></tr>
        )}
      </TableWrap>
    </Card>
  );
}
