'use client';
import React, { useState } from 'react';
import { Check, Copy, Link2, Mail, MessageCircle, Pencil, ShieldCheck, UserPlus, Users } from 'lucide-react';
import { useTraqi } from '@/lib/store';
import { fmtDate } from '@/lib/format';
import { ALL_PERMS } from '@/lib/compute';
import { PageHead, EmptyState, Card, Badge, Avatar } from '@/components/ui';
import { AssistantForm } from '@/components/forms';
import { ensureInvite, inviteMessage, mailtoInvite, queueInviteEmail, whatsappInvite } from '@/lib/invites';
import type { Assistant } from '@/lib/types';

export default function TeamPage() {
  const { ws, save, log, showToast, fbUser } = useTraqi();
  const [form, setForm] = useState(false);
  const [editing, setEditing] = useState<Assistant | null>(null);
  const [busy, setBusy] = useState('');
  const [copied, setCopied] = useState('');

  const toggle = (a: Assistant) => {
    const next = a.active === false;
    save('assistants', ws.assistants.map(x => (x.id === a.id ? { ...x, active: next } : x)));
    log(next ? 'Activated assistant' : 'Deactivated assistant', a.name);
    showToast(a.name + (next ? ' activated' : ' deactivated'));
  };

  /* Mints (or refreshes) the invite and remembers its token on the record, so
     a link already sent keeps working after an edit. */
  const prepare = async (a: Assistant) => {
    if (!fbUser) throw new Error('not signed in');
    const { inv, url, token } = await ensureInvite(a, fbUser.uid, ws.config.bizName, ws.config.ownerName);
    if (a.inviteToken !== token) {
      save('assistants', ws.assistants.map(x => (x.id === a.id ? { ...x, inviteToken: token } : x)));
    }
    return { inv, url };
  };

  const withBusy = async (a: Assistant, key: string, fn: (r: { inv: any; url: string }) => Promise<void> | void) => {
    setBusy(a.id + key);
    try { await fn(await prepare(a)); }
    catch { showToast('Could not prepare the invite — check your connection'); }
    setBusy('');
  };

  const sendEmail = (a: Assistant) => withBusy(a, 'mail', async ({ inv, url }) => {
    try {
      await queueInviteEmail(inv, url);
      log('Sent assistant invite', `${a.name} · ${a.email}`);
      showToast(`Invite sent to ${a.email}`);
    } catch {
      /* No mail queue configured — hand it to the owner's own mail client. */
      window.location.href = mailtoInvite(a.email,
        `${ws.config.ownerName} added you to ${ws.config.bizName} on Traqi`, inviteMessage(inv, url));
      showToast('Opening your email app with the invite');
    }
  });

  const sendWhatsApp = (a: Assistant) => withBusy(a, 'wa', ({ inv, url }) => {
    window.open(whatsappInvite(a.phone, inviteMessage(inv, url)), '_blank', 'noopener');
    log('Sent assistant invite', `${a.name} · WhatsApp`);
  });

  const copyLink = (a: Assistant) => withBusy(a, 'copy', async ({ url }) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(a.id);
      window.setTimeout(() => setCopied(''), 2200);
      showToast('Invite link copied');
    } catch { window.prompt('Copy this invite link', url); }
  });

  const joined = ws.assistants.filter(a => a.accountUid).length;

  return (
    <>
      <PageHead title="Team"
        sub={`${ws.assistants.length} assistant${ws.assistants.length === 1 ? '' : 's'} registered · ${joined} with their own sign-in`}
        actions={<button className="btn btn-primary" onClick={() => { setEditing(null); setForm(true); }}><UserPlus />Register Assistant</button>} />

      {ws.assistants.length ? ws.assistants.map(a => {
        const last = ws.auditLog.filter(l => l.userId === a.id).sort((x, y) => +new Date(y.ts) - +new Date(x.ts))[0];
        const canInvite = !!a.email && !a.accountUid;
        return (
          <Card key={a.id} style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <Avatar name={a.name} tone="indigo" size={46} />
              <div style={{ flex: 1, minWidth: 180 }}>
                <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  {a.name}
                  <Badge tone={a.active === false ? 'red' : 'green'}>{a.active === false ? 'Inactive' : 'Active'}</Badge>
                  {a.accountUid && <Badge tone="indigo"><ShieldCheck style={{ width: 11, height: 11, marginRight: 4, verticalAlign: '-1px' }} />Own sign-in</Badge>}
                  {canInvite && a.inviteToken && <Badge tone="amber">Invite sent</Badge>}
                </div>
                <div className="hint" style={{ marginTop: 3 }}>
                  {a.email || 'No email'} · {a.phone || 'No phone'}
                </div>
                <div className="hint" style={{ marginTop: 2 }}>
                  {a.onboardedAt ? `Joined ${fmtDate(a.onboardedAt.slice(0, 10))} · ` : ''}
                  {last ? `${fmtDate(last.ts.slice(0, 10))} — ${last.action}` : 'No activity yet'}
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
            </div>

            {canInvite && (
              <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--divider)' }}>
                <p className="hint" style={{ marginBottom: 10 }}>
                  Invite {a.name} to set up their own sign-in — the link fills in the business, their name
                  and their email, and only {a.email} can use it.
                </p>
                <div className="row-actions" style={{ justifyContent: 'flex-start' }}>
                  <button className="btn btn-primary btn-sm" disabled={busy === a.id + 'mail'} onClick={() => sendEmail(a)}>
                    <Mail />Send invite
                  </button>
                  <button className="btn btn-wa btn-sm" disabled={busy === a.id + 'wa'} onClick={() => sendWhatsApp(a)}>
                    <MessageCircle />Send on WhatsApp
                  </button>
                  <button className="btn btn-secondary btn-sm" disabled={busy === a.id + 'copy'} onClick={() => copyLink(a)}>
                    {copied === a.id ? <Check /> : <Copy />}{copied === a.id ? 'Copied' : 'Copy link'}
                  </button>
                </div>
              </div>
            )}
            {!a.email && (
              <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--divider)' }}>
                <p className="hint" style={{ margin: 0, display: 'flex', gap: 8, alignItems: 'center' }}>
                  <Link2 style={{ width: 14, height: 14 }} />
                  Add an email on this assistant to invite them to their own sign-in.
                </p>
              </div>
            )}
          </Card>
        );
      }) : (
        <EmptyState icon={Users} title="No assistants yet"
          text="Add team members with their own PIN and permissions, then invite them to sign in on their own device."
          action={<button className="btn btn-primary" onClick={() => setForm(true)}><UserPlus />Register Assistant</button>} />
      )}
      <AssistantForm open={form} onClose={() => setForm(false)} editing={editing} />
    </>
  );
}
