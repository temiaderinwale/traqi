'use client';
/* Traqi admin — newsletters: compose, segment, queue, and keep the history.

   Delivery is handed to Firestore: each recipient becomes a document in the
   `mail` collection using the shape the Firebase "Trigger Email from
   Firestore" extension reads. Install that extension (or point any worker at
   the same collection) and queued mail goes out; without it the campaign is
   still recorded and every address can be exported. */

import React, { useMemo, useState } from 'react';
import {
  Ban, Copy, FileDown, Mail, Megaphone, Send, Trash2, Users
} from 'lucide-react';
import { Card, Kpi, KpiGrid, SectionHead, TableWrap, Badge, Field, Modal } from '@/components/ui';
import { addDoc, collection, deleteDoc, doc, getDocs, setDoc, updateDoc, useAdmin } from '@/lib/adminStore';
import { adminDb } from '@/lib/adminFirebase';
import { usePlatform } from '../platform';
import { Loading, count, dateTime, shortDate } from '../bits';
import { downloadCsv, recipientsFor } from '@/lib/adminData';
import { AUDIENCES, C, Newsletter, NewsletterAudience, NewsletterStatus } from '@/lib/adminTypes';

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));

/** {{name}} / {{business}} are filled per recipient; everything else is literal. */
function personalise(text: string, r: { name: string; biz: string }) {
  return text.replace(/\{\{\s*name\s*\}\}/gi, r.name || 'there').replace(/\{\{\s*business\s*\}\}/gi, r.biz || 'your business');
}

function htmlBody(body: string, preheader: string) {
  const paras = body.split(/\n{2,}/).map(p => `<p style="margin:0 0 16px;line-height:1.65">${esc(p).replace(/\n/g, '<br>')}</p>`).join('');
  return `<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:600px;margin:0 auto;padding:28px 24px;color:#0F172A">
<span style="display:none;opacity:0">${esc(preheader)}</span>
<div style="font-weight:800;font-size:22px;color:#4F46E5;margin-bottom:22px">Traqı</div>
${paras}
<hr style="border:none;border-top:1px solid #E2E8F0;margin:28px 0 14px">
<p style="font-size:12px;color:#64748B;margin:0">You're receiving this because you run a business on Traqi.<br>Reply to this email to unsubscribe.</p>
</div>`;
}

const STATUS_TONE: Record<NewsletterStatus, 'slate' | 'amber' | 'green' | 'red' | 'indigo'> = {
  draft: 'slate', scheduled: 'amber', queued: 'indigo', sent: 'green', failed: 'red'
};

export default function Newsletters() {
  const { rows, unsubs, loading, error, refresh } = usePlatform();
  const { me, logAudit, isSuper } = useAdmin();

  const [list, setList] = useState<Newsletter[]>([]);
  const [listLoaded, setListLoaded] = useState(false);
  const [editing, setEditing] = useState<Newsletter | null>(null);
  const [subject, setSubject] = useState('');
  const [preheader, setPreheader] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState<NewsletterAudience>('all');
  const [scheduledFor, setScheduledFor] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: 'ok' | 'err' } | null>(null);
  const [preview, setPreview] = useState(false);
  const [unsubOpen, setUnsubOpen] = useState(false);
  const [newUnsub, setNewUnsub] = useState('');

  const loadList = React.useCallback(async () => {
    const snap = await getDocs(collection(adminDb, C.newsletters)).catch(() => null);
    setList((snap?.docs || [])
      .map(d => ({ id: d.id, ...(d.data() as any) } as Newsletter))
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')));
    setListLoaded(true);
  }, []);
  React.useEffect(() => { loadList(); }, [loadList]);

  const recipients = useMemo(() => recipientsFor(rows, audience, unsubs), [rows, audience, unsubs]);

  const reset = () => {
    setEditing(null); setSubject(''); setPreheader(''); setBody('');
    setAudience('all'); setScheduledFor(''); setMsg(null);
  };

  const load = (n: Newsletter) => {
    setEditing(n); setSubject(n.subject); setPreheader(n.preheader || '');
    setBody(n.body); setAudience(n.audience); setScheduledFor(n.scheduledFor || ''); setMsg(null);
  };

  const persist = async (status: NewsletterStatus): Promise<Newsletter | null> => {
    if (!subject.trim() || !body.trim()) { setMsg({ text: 'A subject and a body are required.', type: 'err' }); return null; }
    const now = new Date().toISOString();
    const id = editing?.id || 'NL-' + Date.now();
    const rec: Newsletter = {
      id, subject: subject.trim(), preheader: preheader.trim(), body,
      audience, status,
      createdBy: me?.uid || '', createdByName: me?.username || me?.email || '',
      createdAt: editing?.createdAt || now, updatedAt: now,
      scheduledFor: status === 'scheduled' ? scheduledFor : '',
      recipientCount: recipients.length
    };
    await setDoc(doc(adminDb, C.newsletters, id), rec, { merge: true });
    await loadList();
    setEditing(rec);
    return rec;
  };

  const saveDraft = async () => {
    setBusy(true);
    const rec = await persist('draft').catch(() => null);
    if (rec) { setMsg({ text: 'Draft saved.', type: 'ok' }); await logAudit('newsletter_draft', rec.subject); }
    setBusy(false);
  };

  const schedule = async () => {
    if (!scheduledFor) { setMsg({ text: 'Pick a date and time to schedule for.', type: 'err' }); return; }
    setBusy(true);
    const rec = await persist('scheduled').catch(() => null);
    if (rec) {
      setMsg({ text: `Scheduled for ${dateTime(scheduledFor)} — queue it from here when the time comes.`, type: 'ok' });
      await logAudit('newsletter_schedule', `${rec.subject} @ ${scheduledFor}`);
    }
    setBusy(false);
  };

  const send = async () => {
    if (!recipients.length) { setMsg({ text: 'That audience has no reachable addresses.', type: 'err' }); return; }
    if (!confirm(`Queue "${subject}" to ${recipients.length} recipient${recipients.length === 1 ? '' : 's'}?`)) return;
    setBusy(true);
    setMsg(null);
    try {
      const rec = await persist('queued');
      if (!rec) { setBusy(false); return; }
      /* One mail document per recipient, in batches so a big list does not
         open hundreds of parallel writes. */
      const size = 20;
      for (let i = 0; i < recipients.length; i += size) {
        await Promise.all(recipients.slice(i, i + size).map(r => addDoc(collection(adminDb, C.mail), {
          to: [r.email],
          message: {
            subject: personalise(subject, r),
            text: personalise(body, r),
            html: htmlBody(personalise(body, r), preheader)
          },
          traqi: { newsletterId: rec.id, audience, queuedBy: me?.uid || '', queuedAt: new Date().toISOString() }
        })));
      }
      await updateDoc(doc(adminDb, C.newsletters, rec.id), {
        status: 'sent', sentAt: new Date().toISOString(),
        recipientCount: recipients.length, recipients: recipients.map(r => r.email)
      });
      await logAudit('newsletter_send', `${rec.subject} → ${recipients.length} recipients`);
      await loadList();
      setMsg({ text: `Queued to ${recipients.length} recipients. Delivery runs through the mail collection.`, type: 'ok' });
    } catch (e: any) {
      setMsg({
        text: e?.code === 'permission-denied'
          ? 'Firestore refused the write — publish the admin rules so approved admins can write to `mail`.'
          : 'Could not queue the campaign. Try again.',
        type: 'err'
      });
    }
    setBusy(false);
  };

  const remove = async (n: Newsletter) => {
    if (!confirm(`Delete "${n.subject}"? The campaign record goes; anything already queued still sends.`)) return;
    await deleteDoc(doc(adminDb, C.newsletters, n.id)).catch(() => {});
    await logAudit('newsletter_delete', n.subject);
    if (editing?.id === n.id) reset();
    await loadList();
  };

  const addUnsub = async () => {
    const email = newUnsub.trim().toLowerCase();
    if (!email.includes('@')) return;
    await setDoc(doc(adminDb, C.unsubs, email), { email, ts: new Date().toISOString(), by: me?.uid || '' });
    await logAudit('unsubscribe_add', email);
    setNewUnsub('');
    await refresh();
  };
  const removeUnsub = async (email: string) => {
    await deleteDoc(doc(adminDb, C.unsubs, email)).catch(() => {});
    await logAudit('unsubscribe_remove', email);
    await refresh();
  };

  const copyEmails = async () => {
    try {
      await navigator.clipboard.writeText(recipients.map(r => r.email).join(', '));
      setMsg({ text: 'Addresses copied to the clipboard.', type: 'ok' });
    } catch { setMsg({ text: 'Clipboard blocked — use Export CSV instead.', type: 'err' }); }
  };

  if (error) return <Card><p className="msg err" style={{ margin: 0 }}>{error}</p></Card>;
  if (loading) return <Loading />;

  const sent = list.filter(n => n.status === 'sent');
  const reach = new Set(sent.flatMap(n => n.recipients || [])).size;

  return (
    <>
      <KpiGrid>
        <Kpi icon={Mail} label="Reachable owners" value={count(recipientsFor(rows, 'all', unsubs).length)}
          sub={`${count(unsubs.size)} unsubscribed`} />
        <Kpi icon={Megaphone} label="Campaigns sent" value={count(sent.length)} sub={`${count(list.length)} total including drafts`} />
        <Kpi icon={Users} tone="amber" label="Selected audience" value={count(recipients.length)}
          sub={AUDIENCES.find(a => a.key === audience)?.label} />
        <Kpi icon={Send} label="Unique people mailed" value={count(reach)} sub="across all sent campaigns" />
      </KpiGrid>

      <div className="grid-3-2">
        <Card>
          <SectionHead title={editing ? 'Edit campaign' : 'New campaign'} icon={Megaphone} right={
            editing ? <button className="btn btn-secondary btn-sm" onClick={reset}>New</button> : undefined
          } />
          <Field label="Subject">
            <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Your February numbers are ready" />
          </Field>
          <div style={{ marginTop: 14 }}>
            <Field label="Preheader" hint="The grey line inbox clients show after the subject.">
              <input value={preheader} onChange={e => setPreheader(e.target.value)} placeholder="A quick look at what changed this month" />
            </Field>
          </div>
          <div style={{ marginTop: 14 }}>
            <Field label="Message" hint="Blank line starts a new paragraph. Use {{name}} and {{business}} to personalise.">
              <textarea rows={10} value={body} onChange={e => setBody(e.target.value)}
                placeholder={'Hi {{name}},\n\nHere is what is new in Traqi this month…'} />
            </Field>
          </div>
          <div style={{ marginTop: 14 }}>
            <Field label="Audience">
              <select value={audience} onChange={e => setAudience(e.target.value as NewsletterAudience)}>
                {AUDIENCES.map(a => <option key={a.key} value={a.key}>{a.label}</option>)}
              </select>
            </Field>
            <p className="hint" style={{ marginTop: 6 }}>
              {AUDIENCES.find(a => a.key === audience)?.desc} · <strong>{count(recipients.length)}</strong> recipients
            </p>
          </div>
          <div style={{ marginTop: 14 }}>
            <Field label="Schedule for" hint="Optional. Scheduled campaigns wait here until you queue them.">
              <input type="datetime-local" value={scheduledFor} onChange={e => setScheduledFor(e.target.value)} />
            </Field>
          </div>

          {msg && <div className={'msg ' + msg.type}>{msg.text}</div>}

          <div className="row-actions" style={{ justifyContent: 'flex-start', marginTop: 16 }}>
            <button className="btn btn-primary" disabled={busy} onClick={send}><Send />Queue &amp; send</button>
            <button className="btn btn-secondary" disabled={busy} onClick={saveDraft}>Save draft</button>
            <button className="btn btn-secondary" disabled={busy} onClick={schedule}>Schedule</button>
            <button className="btn btn-ghost" onClick={() => setPreview(true)}>Preview</button>
          </div>
        </Card>

        <div>
          <Card style={{ marginBottom: 18 }}>
            <SectionHead title="Recipients" icon={Users} right={
              <>
                <button className="btn btn-secondary btn-sm" onClick={copyEmails}><Copy />Copy</button>
                <button className="btn btn-secondary btn-sm" onClick={() => downloadCsv(`traqi_audience_${audience}.csv`, [
                  ['Email', 'Owner', 'Business'], ...recipients.map(r => [r.email, r.name, r.biz])
                ])}><FileDown />CSV</button>
              </>
            } />
            <p className="hint" style={{ marginBottom: 10 }}>{count(recipients.length)} reachable · unsubscribes and suspended accounts already removed.</p>
            <div style={{ maxHeight: 260, overflowY: 'auto' }}>
              {recipients.slice(0, 60).map(r => (
                <div className="panel-stat" key={r.email}>
                  <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.email}</span>
                  <span className="hint" style={{ whiteSpace: 'nowrap', marginLeft: 8 }}>{r.biz}</span>
                </div>
              ))}
              {recipients.length > 60 && <p className="hint" style={{ marginTop: 10 }}>+ {count(recipients.length - 60)} more</p>}
              {!recipients.length && <p className="hint">No addresses in this segment.</p>}
            </div>
          </Card>

          <Card>
            <SectionHead title="Unsubscribes" icon={Ban} right={
              <button className="btn btn-secondary btn-sm" onClick={() => setUnsubOpen(true)}>Manage</button>
            } />
            <p className="hint">{count(unsubs.size)} addresses will never be included in a send.</p>
          </Card>
        </div>
      </div>

      <Card pad={false} style={{ marginTop: 18 }}>
        <div style={{ padding: '16px 18px 0' }}><SectionHead title="Campaign history" icon={Mail} /></div>
        <TableWrap minWidth={760} head={
          <tr>
            <th>Subject</th><th>Audience</th><th>Status</th>
            <th style={{ textAlign: 'right' }}>Recipients</th>
            <th>Created</th><th>Sent</th><th></th>
          </tr>
        }>
          {list.map(n => (
            <tr key={n.id}>
              <td style={{ fontWeight: 600, cursor: 'pointer' }} onClick={() => load(n)}>{n.subject}
                <span className="hint" style={{ display: 'block', fontSize: '.7rem' }}>by {n.createdByName || '—'}</span>
              </td>
              <td className="hint">{AUDIENCES.find(a => a.key === n.audience)?.label || n.audience}</td>
              <td><Badge tone={STATUS_TONE[n.status] || 'slate'}>{n.status}</Badge></td>
              <td className="tnum" style={{ textAlign: 'right' }}>{count(n.recipientCount || 0)}</td>
              <td className="hint">{shortDate(n.createdAt)}</td>
              <td className="hint">{n.sentAt ? dateTime(n.sentAt) : n.scheduledFor ? 'sched. ' + dateTime(n.scheduledFor) : '—'}</td>
              <td>
                <div className="row-actions">
                  <button className="btn btn-secondary btn-sm" onClick={() => load(n)}>Open</button>
                  {isSuper && <button className="btn btn-danger btn-sm" onClick={() => remove(n)}><Trash2 /></button>}
                </div>
              </td>
            </tr>
          ))}
          {listLoaded && !list.length && (
            <tr><td colSpan={7} className="hint" style={{ textAlign: 'center', padding: 26 }}>No campaigns yet — write the first one above.</td></tr>
          )}
        </TableWrap>
      </Card>

      <Modal open={preview} onClose={() => setPreview(false)} title="Preview" icon={Mail} wide
        actions={<button className="btn btn-secondary" onClick={() => setPreview(false)}>Close</button>}>
        <p className="hint" style={{ marginBottom: 12 }}>
          Shown for {recipients[0]?.name || 'a recipient'} · subject: <strong>{subject || '(no subject)'}</strong>
        </p>
        <div className="muted-box" style={{ maxHeight: '55vh', overflowY: 'auto' }}
          dangerouslySetInnerHTML={{
            __html: htmlBody(personalise(body || '(nothing written yet)', recipients[0] || { name: 'there', biz: 'your business' }), preheader)
          }} />
      </Modal>

      <Modal open={unsubOpen} onClose={() => setUnsubOpen(false)} title="Unsubscribes" icon={Ban}
        actions={<button className="btn btn-secondary" onClick={() => setUnsubOpen(false)}>Done</button>}>
        <div className="search-row">
          <input style={{ flex: 1 }} placeholder="email@example.com" value={newUnsub}
            onChange={e => setNewUnsub(e.target.value)} onKeyDown={e => e.key === 'Enter' && addUnsub()} />
          <button className="btn btn-primary btn-sm" onClick={addUnsub}>Add</button>
        </div>
        <div style={{ maxHeight: '45vh', overflowY: 'auto' }}>
          {Array.from(unsubs).sort().map(e => (
            <div className="panel-stat" key={e}>
              <span>{e}</span>
              <button className="link-btn" onClick={() => removeUnsub(e)}>Remove</button>
            </div>
          ))}
          {!unsubs.size && <p className="hint">Nobody has unsubscribed.</p>}
        </div>
      </Modal>
    </>
  );
}
