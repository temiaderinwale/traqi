'use client';
/* Traqi admin — who may enter the console, and the queue of people asking to. */

import React from 'react';
import { BadgeCheck, Crown, ShieldCheck, ShieldX, UserPlus } from 'lucide-react';
import { Card, Kpi, KpiGrid, SectionHead, TableWrap, Badge } from '@/components/ui';
import { useAdmin } from '@/lib/adminStore';
import { Avatar } from '@/components/ui';
import { count, dateTime, since } from '../bits';
import { AdminStatus } from '@/lib/adminTypes';

const TONE: Record<AdminStatus, 'green' | 'amber' | 'red' | 'slate'> = {
  approved: 'green', pending: 'amber', rejected: 'red', suspended: 'red'
};

export default function AdminTeam() {
  const { admins, me, isSuper, setAdminStatus, setAdminRole, refreshAdmins } = useAdmin();
  const [busy, setBusy] = React.useState('');

  const act = async (fn: () => Promise<void>, uid: string) => {
    setBusy(uid);
    try { await fn(); }
    catch { alert('That change was refused. Only the owner account can manage admins — check the Firestore rules.'); }
    setBusy('');
  };

  const pending = admins.filter(a => a.status === 'pending');
  const active = admins.filter(a => a.status === 'approved');

  return (
    <>
      <KpiGrid>
        <Kpi icon={ShieldCheck} label="Active admins" value={count(active.length)} sub={`${count(admins.length)} accounts on record`} />
        <Kpi icon={UserPlus} tone="amber" label="Waiting for approval" value={count(pending.length)}
          sub={pending.length ? 'review them below' : 'nothing in the queue'} />
        <Kpi icon={Crown} label="Owner account" value={admins.find(a => a.role === 'superadmin')?.username || '—'}
          sub="the first account that registered" />
      </KpiGrid>

      {!isSuper && (
        <Card style={{ marginBottom: 18 }}>
          <p className="hint" style={{ margin: 0, lineHeight: 1.6 }}>
            You have full console access, but approving new admins is reserved for the owner account —
            the first admin that ever registered.
          </p>
        </Card>
      )}

      <Card pad={false} style={{ marginBottom: 18 }}>
        <div style={{ padding: '16px 18px 0' }}>
          <SectionHead title="Access requests" icon={UserPlus} right={
            <button className="btn btn-secondary btn-sm" onClick={refreshAdmins}>Refresh</button>
          } />
        </div>
        <TableWrap minWidth={700} head={
          <tr><th>Person</th><th>Email</th><th>Signed up</th><th>Via</th><th style={{ textAlign: 'right' }}>Decision</th></tr>
        }>
          {pending.map(a => (
            <tr key={a.uid}>
              <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Avatar name={a.username || a.email} tone="indigo" size={32} />
                  <strong>{a.username || '—'}</strong>
                </div>
              </td>
              <td className="hint">{a.email}</td>
              <td className="hint">{dateTime(a.createdAt)}</td>
              <td><Badge tone="slate">{a.provider === 'google' ? 'Google' : 'Password'}</Badge></td>
              <td>
                <div className="row-actions">
                  <button className="btn btn-success btn-sm" disabled={!isSuper || busy === a.uid}
                    onClick={() => act(() => setAdminStatus(a.uid, 'approved'), a.uid)}><BadgeCheck />Approve</button>
                  <button className="btn btn-danger btn-sm" disabled={!isSuper || busy === a.uid}
                    onClick={() => act(() => setAdminStatus(a.uid, 'rejected'), a.uid)}><ShieldX />Decline</button>
                </div>
              </td>
            </tr>
          ))}
          {!pending.length && (
            <tr><td colSpan={5} className="hint" style={{ textAlign: 'center', padding: 26 }}>
              No one is waiting. New registrations land here the moment they sign up.
            </td></tr>
          )}
        </TableWrap>
      </Card>

      <Card pad={false}>
        <div style={{ padding: '16px 18px 0' }}><SectionHead title="Admin roster" icon={ShieldCheck} /></div>
        <TableWrap minWidth={860} head={
          <tr><th>Person</th><th>Email</th><th>Role</th><th>Status</th><th>Approved by</th><th>Last seen</th><th style={{ textAlign: 'right' }}>Actions</th></tr>
        }>
          {admins.map(a => {
            const self = a.uid === me?.uid;
            const owner = a.role === 'superadmin';
            return (
              <tr key={a.uid}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Avatar name={a.username || a.email} tone={owner ? 'gold' : 'indigo'} size={32} />
                    <span>
                      <strong>{a.username || '—'}</strong>
                      {self && <span className="hint" style={{ display: 'block', fontSize: '.7rem' }}>that&apos;s you</span>}
                    </span>
                  </div>
                </td>
                <td className="hint">{a.email}</td>
                <td>{owner ? <Badge tone="amber"><Crown style={{ width: 11, height: 11, marginRight: 4, verticalAlign: '-1px' }} />Owner</Badge> : <Badge tone="indigo">Admin</Badge>}</td>
                <td><Badge tone={TONE[a.status]}>{a.status}</Badge></td>
                <td className="hint">{a.approvedByName || (owner ? 'bootstrap' : '—')}</td>
                <td className="hint">{a.lastLoginAt ? since(a.lastLoginAt) : '—'}</td>
                <td>
                  <div className="row-actions">
                    {isSuper && !owner && a.status === 'approved' && (
                      <>
                        <button className="btn btn-secondary btn-sm" disabled={busy === a.uid}
                          onClick={() => act(() => setAdminRole(a.uid, 'superadmin'), a.uid)}>Make owner</button>
                        <button className="btn btn-danger btn-sm" disabled={busy === a.uid}
                          onClick={() => act(() => setAdminStatus(a.uid, 'suspended'), a.uid)}>Suspend</button>
                      </>
                    )}
                    {isSuper && !owner && (a.status === 'suspended' || a.status === 'rejected') && (
                      <button className="btn btn-success btn-sm" disabled={busy === a.uid}
                        onClick={() => act(() => setAdminStatus(a.uid, 'approved'), a.uid)}>Restore</button>
                    )}
                    {isSuper && owner && !self && (
                      <button className="btn btn-secondary btn-sm" disabled={busy === a.uid}
                        onClick={() => act(() => setAdminRole(a.uid, 'admin'), a.uid)}>Step down</button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
          {!admins.length && <tr><td colSpan={7} className="hint" style={{ textAlign: 'center', padding: 26 }}>No admin accounts loaded.</td></tr>}
        </TableWrap>
      </Card>
    </>
  );
}
