'use client';
/* Traqi admin — Join the Traqi Team: everyone who has applied through /team.

   The pilot queue's twin, for volunteers. It opens on the people nobody has
   spoken to yet, every row carries their WhatsApp number and email, and it
   can be cut by role — the first question when filling a seat is who applied
   for that seat. The same applications are also appended to the team Google
   Sheet; this console is where they are triaged. */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Archive, Check, ExternalLink, FileDown, Handshake, Mail, MessageCircle, RotateCcw, Search, Trash2,
  UserCheck, Users
} from 'lucide-react';
import { Badge, Card, Kpi, KpiGrid, Modal, TableWrap } from '@/components/ui';
import { OptionSelect } from '@/components/Dropdown';
import { useAdmin } from '@/lib/adminStore';
import {
  downloadCsv, fetchTeamApplications, setTeamArchived, setTeamNote, setTeamStatus
} from '@/lib/adminData';
import {
  TEAM_LABEL, TEAM_STATUSES, TeamApplicationRecord, TeamStatus
} from '@/lib/adminTypes';
import { ROLE_NAMES, whatsappLink } from '@/lib/team';
import { Loading, Th, count, dateTime, shortDate, sortRows } from '../bits';

const TONE: Record<TeamStatus, 'amber' | 'blue' | 'indigo' | 'green' | 'slate'> = {
  new: 'amber', contacted: 'blue', interviewed: 'indigo', onboarded: 'green', declined: 'slate'
};

const StatusBadge = ({ s }: { s: TeamStatus }) => <Badge tone={TONE[s]}>{TEAM_LABEL[s]}</Badge>;

/** The message we open WhatsApp with, addressed to the applicant. */
const reply = (r: TeamApplicationRecord) =>
  `Hello ${r.firstName}, this is Traqi. Thank you for applying to join the Traqi Team as a volunteer ${r.role}. `
  + 'We would love to talk with you — when is a good time?';

/* Applicants type links with and without the scheme; an anchor needs one. */
const href = (url: string) => (/^https?:\/\//i.test(url) ? url : 'https://' + url);

export default function TeamApplications() {
  const { logAudit, me } = useAdmin();
  const [copied, setCopied] = useState('');
  const copyTimer = useRef<number>();
  const [rows, setRows] = useState<TeamApplicationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<'' | TeamStatus>('');
  const [role, setRole] = useState('');
  const [sort, setSort] = useState<{ k: string; dir: 1 | -1 }>({ k: 'createdAt', dir: -1 });
  const [open, setOpen] = useState<TeamApplicationRecord | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<'active' | 'archive'>('active');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setRows(await fetchTeamApplications());
    } catch {
      setError('Could not read the team applications. Check that the Firestore rules for teamApplications are published.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const active = useMemo(() => rows.filter(r => !r.archived), [rows]);

  const tally = useMemo(() => {
    const t = { new: 0, contacted: 0, interviewed: 0, onboarded: 0, declined: 0 } as Record<TeamStatus, number>;
    active.forEach(r => { t[r.status]++; });
    return t;
  }, [active]);

  /* Applications per role on the working list, for the role filter and the
     breakdown strip — the quickest read of which seats are oversubscribed. */
  const perRole = useMemo(() => {
    const m: Record<string, number> = {};
    active.forEach(r => { m[r.role] = (m[r.role] || 0) + 1; });
    return m;
  }, [active]);

  const archivedCount = rows.length - active.length;

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const filtered = rows.filter(r => {
      if (r.archived !== (view === 'archive')) return false;
      if (status && r.status !== status) return false;
      if (role && r.role !== role) return false;
      if (!needle) return true;
      return [r.firstName, r.surname, r.role, r.location, r.email, r.whatsapp, r.occupation]
        .some(v => v.toLowerCase().includes(needle));
    });
    return sortRows(filtered, sort);
  }, [rows, q, status, role, sort, view]);

  const patch = (id: string, p: Partial<TeamApplicationRecord>) => {
    setRows(list => list.map(r => (r.id === id ? { ...r, ...p } : r)));
    setOpen(o => (o && o.id === id ? { ...o, ...p } : o));
  };

  const who = (r: TeamApplicationRecord) => `${r.firstName} ${r.surname} · ${r.role}`;

  const move = async (r: TeamApplicationRecord, next: TeamStatus) => {
    setBusy(true);
    try {
      const by = me?.username || me?.email || '';
      await setTeamStatus(r.id, next, by);
      patch(r.id, { status: next, reviewedAt: new Date().toISOString(), reviewedBy: by });
      await logAudit('team_' + next, who(r));
    } catch {
      setError('That change did not save. Please try again.');
    } finally { setBusy(false); }
  };

  const saveNote = async (r: TeamApplicationRecord) => {
    setBusy(true);
    try {
      await setTeamNote(r.id, note);
      patch(r.id, { adminNote: note });
      await logAudit('team_note', who(r));
    } catch {
      setError('That note did not save. Please try again.');
    } finally { setBusy(false); }
  };

  const openRow = (r: TeamApplicationRecord) => { setOpen(r); setNote(r.adminNote || ''); };

  /* Remove files the record in the archive; nothing is destroyed. */
  const archive = async (r: TeamApplicationRecord, next: boolean) => {
    if (next && !window.confirm(
      `Remove ${r.firstName} ${r.surname} from the list?\n\n`
      + 'The application moves to the archive — nothing is deleted, and you can restore it.'
    )) return;
    setBusy(true);
    try {
      const by = me?.username || me?.email || '';
      await setTeamArchived(r.id, next, by);
      patch(r.id, { archived: next, archivedAt: next ? new Date().toISOString() : '', archivedBy: next ? by : '' });
      if (open?.id === r.id) setOpen(null);
      await logAudit(next ? 'team_archived' : 'team_restored', who(r));
    } catch {
      setError(next ? 'Could not archive that application.' : 'Could not restore that application.');
    } finally { setBusy(false); }
  };

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

  const Copy = ({ value }: { value: string }) => (
    value
      ? <button type="button" className="copy-text" title="Click to copy"
          onClick={e => { e.stopPropagation(); copyValue(value); }}>{value}</button>
      : <span className="hint">—</span>
  );

  if (loading) return <Loading text="Reading the team applications…" />;

  return (
    <>
      <KpiGrid>
        <Kpi icon={Users} label="Applications" value={count(active.length)} sub="on the list" />
        <Kpi icon={Handshake} tone="amber" label="Waiting on us" value={count(tally.new)} sub="nobody has replied yet" />
        <Kpi icon={MessageCircle} label="In conversation" value={count(tally.contacted + tally.interviewed)} sub="contacted or interviewed" />
        <Kpi icon={UserCheck} tone="green" label="Onboarded" value={count(tally.onboarded)} sub="now on the Traqi Team" />
      </KpiGrid>

      {/* Per role, on the working list. Each chip is also the role filter. */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
        {ROLE_NAMES.map(n => (
          <button key={n} type="button"
            className={'btn btn-sm ' + (role === n ? 'btn-primary' : 'btn-secondary')}
            onClick={() => setRole(r => (r === n ? '' : n))}>
            {n} <span className="tnum" style={{ opacity: .7, marginLeft: 4 }}>{count(perRole[n] || 0)}</span>
          </button>
        ))}
      </div>

      {error && (
        <Card style={{ marginBottom: 14, borderColor: 'var(--red-600)' }}>
          <p style={{ margin: 0, color: 'var(--red-600)', fontSize: '.84rem', fontWeight: 600 }}>{error}</p>
        </Card>
      )}

      <div className="search-row">
        <div style={{ position: 'relative' }}>
          <Search style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: 'var(--text-3)' }} />
          <input className="search-input" style={{ paddingLeft: 36 }} placeholder="Search name, role, location or email"
            value={q} onChange={e => setQ(e.target.value)} />
        </div>
        <OptionSelect value={role} onChange={setRole} allLabel="Every role"
          options={ROLE_NAMES.map(n => ({ value: n }))} />
        <OptionSelect value={status} onChange={v => setStatus(v as any)} allLabel="Every status"
          options={TEAM_STATUSES.map(s => ({ value: s, label: TEAM_LABEL[s] }))} />
        <button className="btn btn-secondary btn-sm" onClick={load}>Refresh</button>
        <button className={'btn btn-sm ' + (view === 'archive' ? 'btn-primary' : 'btn-secondary')}
          onClick={() => setView(v => (v === 'archive' ? 'active' : 'archive'))}>
          <Archive />{view === 'archive' ? 'Back to the list' : `Archive${archivedCount ? ` (${archivedCount})` : ''}`}
        </button>
        <button className="btn btn-secondary btn-sm" onClick={() => downloadCsv(
          view === 'archive' ? 'traqi_team_archive.csv' : 'traqi_team_applications.csv', [
          ['Applied', 'First name', 'Surname', 'Role', 'Email', 'WhatsApp', 'Location', 'Occupation', 'Availability',
            'Portfolio', 'Experience', 'Motivation', 'Status', 'Note'],
          ...shown.map(r => [
            r.createdAt, r.firstName, r.surname, r.role, r.email, r.whatsapp, r.location, r.occupation,
            r.availability, r.portfolio, r.experience, r.motivation, TEAM_LABEL[r.status], r.adminNote
          ])
        ])}><FileDown />CSV</button>
        <span className="hint" style={{ marginLeft: 'auto' }}>{count(shown.length)} shown</span>
      </div>

      <Card pad={false}>
        <TableWrap minWidth={1180} head={
          <tr>
            <Th label="Applied" k="createdAt" sort={sort} setSort={setSort} />
            <Th label="Applicant" k="firstName" sort={sort} setSort={setSort} />
            <Th label="Role" k="role" sort={sort} setSort={setSort} />
            <Th label="Location" k="location" sort={sort} setSort={setSort} />
            <Th label="Availability" k="availability" sort={sort} setSort={setSort} />
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
              <td>{r.role}</td>
              <td className="hint">{r.location}</td>
              <td className="hint" style={{ whiteSpace: 'nowrap' }}>{r.availability}</td>
              <td><StatusBadge s={r.status} /></td>
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
                  : 'No applications yet. They arrive here the moment somebody fills in the form on /team.'}
            </td></tr>
          )}
        </TableWrap>
      </Card>

      <Modal open={!!open} onClose={() => setOpen(null)} wide
        title={open ? `${open.firstName} ${open.surname}` : ''} icon={Handshake}
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
              <div><span className="label">Role</span><p style={{ margin: '4px 0 0', fontWeight: 600 }}>{open.role}</p></div>
              <div><span className="label">Location</span><p style={{ margin: '4px 0 0' }}>{open.location}</p></div>
              <div><span className="label">Currently</span><p style={{ margin: '4px 0 0' }}>{open.occupation || '—'}</p></div>
              <div><span className="label">Time weekly</span><p style={{ margin: '4px 0 0' }}>{open.availability || '—'}</p></div>
              <div><span className="label">WhatsApp</span><p style={{ margin: '4px 0 0' }} className="tnum">{open.whatsapp}</p></div>
              <div><span className="label">Email</span><p style={{ margin: '4px 0 0' }}>{open.email}</p></div>
              <div className="field full"><span className="label">Portfolio / link</span>
                <p style={{ margin: '4px 0 0', wordBreak: 'break-all' }}>
                  {open.portfolio
                    ? <a href={href(open.portfolio)} target="_blank" rel="noopener noreferrer"
                        style={{ color: 'var(--indigo-600)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        {open.portfolio}<ExternalLink style={{ width: 13, height: 13 }} />
                      </a>
                    : <span className="hint">None given</span>}
                </p>
              </div>
            </div>

            <div>
              <span className="label">Skills and experience, in their words</span>
              <p style={{ margin: '6px 0 0', fontSize: '.86rem', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{open.experience}</p>
            </div>
            <div>
              <span className="label">Why they want to join</span>
              <p style={{ margin: '6px 0 0', fontSize: '.86rem', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{open.motivation}</p>
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
                {TEAM_STATUSES.map(s => (
                  <button key={s} disabled={busy || open.status === s}
                    className={'btn btn-sm ' + (open.status === s ? 'btn-primary' : 'btn-secondary')}
                    onClick={() => move(open, s)}>
                    {TEAM_LABEL[s]}
                  </button>
                ))}
              </div>
            </div>

            <div className="field">
              <label className="label">Internal note</label>
              <textarea rows={3} value={note} onChange={e => setNote(e.target.value)}
                placeholder="How did the conversation go?" />
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

      {copied && (
        <div className="toast show" role="status" aria-live="polite">
          <Check style={{ width: 15, height: 15, color: 'var(--green-600)', flexShrink: 0 }} />
          <span>{copied}</span>
        </div>
      )}
    </>
  );
}
