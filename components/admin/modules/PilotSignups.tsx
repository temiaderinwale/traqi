'use client';
/* Traqi admin — everyone who has applied through the unlinked /pilot page.

   The pilot is run by hand: a stranger fills in the form, nobody gets a
   workspace automatically, and somebody here has to read the application and
   start the conversation. So this module is a queue, not a report — it opens
   on the people nobody has spoken to yet, and every row carries the two
   things needed to speak to them, their WhatsApp number and their email. */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Archive, Check, FileDown, Mail, MessageCircle, Rocket, RotateCcw, Search, Sparkles, Trash2
} from 'lucide-react';
import { Badge, Card, Kpi, KpiGrid, Modal, TableWrap } from '@/components/ui';
import { useAdmin } from '@/lib/adminStore';
import {
  downloadCsv, fetchPilotSignups, setPilotArchived, setPilotNote, setPilotStatus
} from '@/lib/adminData';
import {
  PILOT_LABEL, PILOT_STATUSES, PilotSignupRecord, PilotStatus
} from '@/lib/adminTypes';
import { whatsappLink } from '@/lib/pilot';
import { Loading, Th, count, dateTime, shortDate, sortRows } from '../bits';

const TONE: Record<PilotStatus, 'amber' | 'blue' | 'green' | 'slate'> = {
  new: 'amber', contacted: 'blue', approved: 'green', declined: 'slate'
};

const StatusBadge = ({ s }: { s: PilotStatus }) => <Badge tone={TONE[s]}>{PILOT_LABEL[s]}</Badge>;

/** The message we open WhatsApp with, addressed to the applicant — the other
    half of the conversation they started from the pilot page. */
const reply = (r: PilotSignupRecord) =>
  `Hello ${r.firstName}, this is Traqi. Thank you for applying to be one of our early users with ${r.business}. `
  + 'We would love to set you up — when is a good time to talk?';

export default function PilotSignups() {
  const { logAudit, me } = useAdmin();
  const [copied, setCopied] = useState('');
  const copyTimer = useRef<number>();
  const [rows, setRows] = useState<PilotSignupRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<'' | PilotStatus>('');
  const [sort, setSort] = useState<{ k: string; dir: 1 | -1 }>({ k: 'createdAt', dir: -1 });
  const [open, setOpen] = useState<PilotSignupRecord | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  /* Which of the two lists is on screen. The archive is the same collection,
     filtered — not a second place records can go missing in. */
  const [view, setView] = useState<'active' | 'archive'>('active');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setRows(await fetchPilotSignups());
    } catch {
      setError('Could not read the pilot applications. Check that the Firestore rules for pilotSignups are published.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  /* The tiles describe the working queue, so an archived record counts for
     nothing in them — it has already been dealt with one way or another. */
  const tally = useMemo(() => {
    const t = { new: 0, contacted: 0, approved: 0, declined: 0 } as Record<PilotStatus, number>;
    rows.filter(r => !r.archived).forEach(r => { t[r.status]++; });
    return t;
  }, [rows]);

  const archivedCount = useMemo(() => rows.filter(r => r.archived).length, [rows]);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const filtered = rows.filter(r => {
      if (r.archived !== (view === 'archive')) return false;
      if (status && r.status !== status) return false;
      if (!needle) return true;
      return [r.firstName, r.surname, r.business, r.category, r.location, r.email, r.whatsapp]
        .some(v => v.toLowerCase().includes(needle));
    });
    return sortRows(filtered, sort);
  }, [rows, q, status, sort, view]);

  /* Both writes patch the row in place rather than re-reading the collection:
     the console is a queue, and losing your scroll position after every
     triage makes it a slog. */
  const patch = (id: string, p: Partial<PilotSignupRecord>) => {
    setRows(list => list.map(r => (r.id === id ? { ...r, ...p } : r)));
    setOpen(o => (o && o.id === id ? { ...o, ...p } : o));
  };

  const move = async (r: PilotSignupRecord, next: PilotStatus) => {
    setBusy(true);
    try {
      const by = me?.username || me?.email || '';
      await setPilotStatus(r.id, next, by);
      patch(r.id, { status: next, reviewedAt: new Date().toISOString(), reviewedBy: by });
      await logAudit('pilot_' + next, `${r.firstName} ${r.surname} · ${r.business}`);
    } catch {
      setError('That change did not save. Please try again.');
    } finally { setBusy(false); }
  };

  const saveNote = async (r: PilotSignupRecord) => {
    setBusy(true);
    try {
      await setPilotNote(r.id, note);
      patch(r.id, { adminNote: note });
      await logAudit('pilot_note', `${r.firstName} ${r.surname} · ${r.business}`);
    } catch {
      setError('That note did not save. Please try again.');
    } finally { setBusy(false); }
  };

  const openRow = (r: PilotSignupRecord) => { setOpen(r); setNote(r.adminNote || ''); };

  /* Delete here means "take it off my list", not "destroy it" — the details
     are somebody's, and a record of them asking to join. So it asks once,
     then files it in the archive, where it can be brought back. */
  const archive = async (r: PilotSignupRecord, next: boolean) => {
    if (next && !window.confirm(
      `Remove ${r.firstName} ${r.surname} from the list?\n\n`
      + 'The application moves to the archive — nothing is deleted, and you can restore it.'
    )) return;
    setBusy(true);
    try {
      const by = me?.username || me?.email || '';
      await setPilotArchived(r.id, next, by);
      patch(r.id, { archived: next, archivedAt: next ? new Date().toISOString() : '', archivedBy: next ? by : '' });
      if (open?.id === r.id) setOpen(null);
      await logAudit(next ? 'pilot_archived' : 'pilot_restored', `${r.firstName} ${r.surname} · ${r.business}`);
    } catch {
      setError(next ? 'Could not archive that application.' : 'Could not restore that application.');
    } finally { setBusy(false); }
  };

  /* Clipboard writes need a secure context, which the deployed console has and
     a plain-http origin does not — so the failure is reported rather than
     swallowed, otherwise nothing happens and it looks like a dead click. */
  const copyValue = useCallback(async (value: string) => {
    if (!value) return;
    let msg = 'Copied to clipboard';
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      msg = 'Could not copy — select the text instead';
    }
    setCopied(msg);
    window.clearTimeout(copyTimer.current);
    copyTimer.current = window.setTimeout(() => setCopied(''), 2200);
  }, []);

  useEffect(() => () => window.clearTimeout(copyTimer.current), []);

  /** A table cell that hands you its own text. A button, not a span, so it
      answers to the keyboard; stopPropagation keeps it from opening the row. */
  const Copy = ({ value }: { value: string }) => (
    value
      ? <button type="button" className="copy-text" title="Click to copy"
          onClick={e => { e.stopPropagation(); copyValue(value); }}>{value}</button>
      : <span className="hint">—</span>
  );

  if (loading) return <Loading text="Reading the pilot applications…" />;

  return (
    <>
      <KpiGrid>
        <Kpi icon={Sparkles} label="Applications" value={count(rows.length - archivedCount)} sub="on the list" />
        <Kpi icon={Rocket} tone="amber" label="Waiting on us" value={count(tally.new)} sub="nobody has replied yet" />
        <Kpi icon={MessageCircle} label="Contacted" value={count(tally.contacted)} sub="conversation started" />
        <Kpi icon={Mail} tone="green" label="Approved" value={count(tally.approved)} sub="onboarded as early users" />
      </KpiGrid>

      {error && (
        <Card style={{ marginBottom: 14, borderColor: 'var(--red-600)' }}>
          <p style={{ margin: 0, color: 'var(--red-600)', fontSize: '.84rem', fontWeight: 600 }}>{error}</p>
        </Card>
      )}

      <div className="search-row">
        <div style={{ position: 'relative' }}>
          <Search style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: 'var(--text-3)' }} />
          <input className="search-input" style={{ paddingLeft: 36 }} placeholder="Search name, business, location or email"
            value={q} onChange={e => setQ(e.target.value)} />
        </div>
        <select value={status} onChange={e => setStatus(e.target.value as any)}>
          <option value="">Every status</option>
          {PILOT_STATUSES.map(s => <option key={s} value={s}>{PILOT_LABEL[s]}</option>)}
        </select>
        <button className="btn btn-secondary btn-sm" onClick={load}>Refresh</button>
        {/* The archive is only ever on screen because it was asked for. */}
        <button className={'btn btn-sm ' + (view === 'archive' ? 'btn-primary' : 'btn-secondary')}
          onClick={() => setView(v => (v === 'archive' ? 'active' : 'archive'))}>
          <Archive />{view === 'archive' ? 'Back to the list' : `Archive${archivedCount ? ` (${archivedCount})` : ''}`}
        </button>
        <button className="btn btn-secondary btn-sm" onClick={() => downloadCsv(
          view === 'archive' ? 'traqi_pilot_archive.csv' : 'traqi_pilot_applications.csv', [
          ['Applied', 'First name', 'Surname', 'Business', 'Category', 'Category group', 'Location', 'Email', 'WhatsApp', 'About', 'Status', 'Note'],
          ...shown.map(r => [
            r.createdAt, r.firstName, r.surname, r.business, r.category, r.categoryGroup,
            r.location, r.email, r.whatsapp, r.about, PILOT_LABEL[r.status], r.adminNote
          ])
        ])}><FileDown />CSV</button>
        <span className="hint" style={{ marginLeft: 'auto' }}>{count(shown.length)} shown</span>
      </div>

      <Card pad={false}>
        <TableWrap minWidth={1180} head={
          <tr>
            <Th label="Applied" k="createdAt" sort={sort} setSort={setSort} />
            <Th label="Applicant" k="firstName" sort={sort} setSort={setSort} />
            <Th label="Business" k="business" sort={sort} setSort={setSort} />
            <Th label="Category" k="category" sort={sort} setSort={setSort} />
            <Th label="Location" k="location" sort={sort} setSort={setSort} />
            <Th label="Status" k="status" sort={sort} setSort={setSort} />
            <Th label="WhatsApp" k="whatsapp" sort={sort} setSort={setSort} />
            <Th label="Email" k="email" sort={sort} setSort={setSort} />
            <th style={{ textAlign: 'right' }}>Reach out</th>
            <th style={{ textAlign: 'right', width: 1 }} aria-label={view === 'archive' ? 'Restore' : 'Remove'} />
          </tr>
        }>
          {shown.map(r => (
            <tr key={r.id} style={{ cursor: 'pointer' }} onClick={() => openRow(r)}>
              <td className="hint" style={{ whiteSpace: 'nowrap' }}>{shortDate(r.createdAt)}</td>
              <td style={{ fontWeight: 600 }}>{r.firstName} {r.surname}</td>
              <td>{r.business}</td>
              <td className="hint">{r.category}</td>
              <td className="hint">{r.location}</td>
              <td><StatusBadge s={r.status} /></td>
              {/* The number and the address in full, each one click away from
                  the clipboard — most of what this console is used for is
                  pasting one of them somewhere else. */}
              <td className="tnum" style={{ whiteSpace: 'nowrap' }}><Copy value={r.whatsapp} /></td>
              <td><Copy value={r.email} /></td>
              <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }} onClick={e => e.stopPropagation()}>
                <a className="btn btn-secondary btn-sm" href={whatsappLink(reply(r))} target="_blank" rel="noopener noreferrer" aria-label={`WhatsApp ${r.firstName}`}>
                  <MessageCircle />
                </a>{' '}
                <a className="btn btn-secondary btn-sm" href={'mailto:' + r.email} aria-label={`Email ${r.firstName}`}>
                  <Mail />
                </a>
              </td>
              <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }} onClick={e => e.stopPropagation()}>
                <button className={'btn btn-sm ' + (view === 'archive' ? 'btn-secondary' : 'btn-danger')}
                  disabled={busy} onClick={() => archive(r, view !== 'archive')}
                  title={view === 'archive' ? `Restore ${r.firstName} to the list` : `Remove ${r.firstName} from the list`}
                  aria-label={view === 'archive' ? `Restore ${r.firstName}` : `Remove ${r.firstName}`}>
                  {view === 'archive' ? <RotateCcw /> : <Trash2 />}
                </button>
              </td>
            </tr>
          ))}
          {!shown.length && (
            <tr><td colSpan={10} className="hint" style={{ textAlign: 'center', padding: 26 }}>
              {view === 'archive'
                ? 'The archive is empty. Anything you remove from the list lands here.'
                : rows.length
                  ? 'No application matches that search.'
                  : 'No applications yet. They arrive here the moment somebody fills in the form on /pilot.'}
            </td></tr>
          )}
        </TableWrap>
      </Card>

      <Modal open={!!open} onClose={() => setOpen(null)} wide
        title={open ? `${open.firstName} ${open.surname}` : ''} icon={Rocket}
        actions={<>
          <button className="btn btn-secondary" onClick={() => setOpen(null)}>Close</button>
          {open && <button className="btn btn-primary" disabled={busy} onClick={() => saveNote(open)}>Save note</button>}
        </>}>
        {open && (
          <div style={{ display: 'grid', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <StatusBadge s={open.status} />
              <span className="hint">Applied {dateTime(open.createdAt)}</span>
              {open.reviewedBy && <span className="hint">· last touched by {open.reviewedBy}</span>}
            </div>

            <div className="form-grid">
              <div><span className="label">Business</span><p style={{ margin: '4px 0 0', fontWeight: 600 }}>{open.business}</p></div>
              <div><span className="label">Category</span><p style={{ margin: '4px 0 0' }}>{open.category}</p>
                {open.categoryGroup && open.categoryGroup !== open.category &&
                  <span className="hint">chosen under “{open.categoryGroup}”</span>}
              </div>
              <div><span className="label">Location</span><p style={{ margin: '4px 0 0' }}>{open.location}</p></div>
              <div><span className="label">WhatsApp</span><p style={{ margin: '4px 0 0' }} className="tnum">{open.whatsapp}</p></div>
              <div className="field full"><span className="label">Email</span><p style={{ margin: '4px 0 0' }}>{open.email}</p></div>
            </div>

            <div>
              <span className="label">About the business, in their words</span>
              <p style={{ margin: '6px 0 0', fontSize: '.86rem', lineHeight: 1.6 }}>{open.about}</p>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <a className="btn btn-primary btn-sm" href={whatsappLink(reply(open))} target="_blank" rel="noopener noreferrer">
                <MessageCircle />Message on WhatsApp
              </a>
              <a className="btn btn-secondary btn-sm" href={'mailto:' + open.email}><Mail />Email</a>
            </div>

            <div>
              <span className="label">Move this application</span>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                {PILOT_STATUSES.map(s => (
                  <button key={s} disabled={busy || open.status === s}
                    className={'btn btn-sm ' + (open.status === s ? 'btn-primary' : 'btn-secondary')}
                    onClick={() => move(open, s)}>
                    {PILOT_LABEL[s]}
                  </button>
                ))}
              </div>
            </div>

            <div className="field">
              <label className="label">Internal note</label>
              <textarea rows={3} value={note} onChange={e => setNote(e.target.value)}
                placeholder="What came out of the conversation?" />
              <span className="hint">Only admins see this. The applicant never does.</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
              borderTop: '1px solid var(--divider)', paddingTop: 14 }}>
              <button className={'btn btn-sm ' + (open.archived ? 'btn-secondary' : 'btn-danger')}
                disabled={busy} onClick={() => archive(open, !open.archived)}>
                {open.archived ? <><RotateCcw />Restore to the list</> : <><Trash2 />Remove from the list</>}
              </button>
              <span className="hint">
                {open.archived
                  ? `Archived ${shortDate(open.archivedAt)}${open.archivedBy ? ' by ' + open.archivedBy : ''}.`
                  : 'Removing files it in the archive. Nothing is deleted.'}
              </span>
            </div>
          </div>
        )}
      </Modal>

      {/* The app shell's own toast, borrowed: bottom-right, out of the way of
          the table, gone on its own after a couple of seconds. */}
      {copied && (
        <div className="toast show" role="status" aria-live="polite">
          <Check style={{ width: 15, height: 15, color: 'var(--green-600)', flexShrink: 0 }} />
          <span>{copied}</span>
        </div>
      )}
    </>
  );
}
