'use client';
import React, { useEffect, useState } from 'react';
import { Archive, MessagesSquare, Plus, Trash2 } from 'lucide-react';
import { useTraqi } from '@/lib/store';
import { useFabAction } from '@/lib/fab';
import { isMsgFromMe, isMsgVisible, msgUserId } from '@/lib/compute';
import { fmtDate } from '@/lib/format';
import { PageHead, EmptyState, Badge, Avatar } from '@/components/ui';
import { MessageForm } from '@/components/forms';
import type { Message } from '@/lib/types';

export default function MessagesPage() {
  const { ws, user, save, log, showToast } = useTraqi();
  const [form, setForm] = useState(false);
  const [showDeleted, setShowDeleted] = useState(false);
  useFabAction(() => { setForm(true); });
  const me = msgUserId(user);

  const live = ws.messages.filter(m => !m.deletedAt && isMsgVisible(m, user)).sort((a, b) => +new Date(b.ts) - +new Date(a.ts));
  const gone = ws.messages.filter(m => m.deletedAt && isMsgVisible(m, user));

  /* Mark visible inbound messages as read once */
  useEffect(() => {
    const unread = ws.messages.filter(m => !m.deletedAt && isMsgVisible(m, user) && !isMsgFromMe(m, user) && !m.readBy?.[me]);
    if (!unread.length) return;
    const ids = new Set(unread.map(m => m.id));
    save('messages', ws.messages.map(m => (ids.has(m.id) ? { ...m, readBy: { ...m.readBy, [me]: true } } : m)));
  }, [ws.messages, user, me, save]);

  const remove = (m: Message) => {
    if (!isMsgFromMe(m, user)) { showToast('Only the sender can delete this message'); return; }
    if (!confirm('Delete this message? It is removed for the recipient too.')) return;
    save('messages', ws.messages.map(x => (x.id === m.id ? { ...x, deletedAt: new Date().toISOString(), deletedBy: me } : x)));
    log('Deleted message', 'To ' + m.toName);
    showToast('Message deleted');
  };

  const Card = ({ m, deleted }: { m: Message; deleted?: boolean }) => {
    const fromMe = isMsgFromMe(m, user);
    const read = m.readBy?.[me];
    return (
      <div className={'msg-card' + (!fromMe && !read && !deleted ? ' unread' : '') + (deleted ? ' deleted' : '')}>
        <Avatar name={m.fromName} tone={m.from === 'owner' ? 'gold' : undefined} size={36} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: '.85rem' }}>
            {m.fromName}
            {m.type === 'broadcast' && <> <Badge tone="amber">Broadcast</Badge></>}
            {deleted && <> <Badge tone="red">Deleted</Badge></>}
            {fromMe && <span className="hint" style={{ fontWeight: 400 }}> → to {m.toName}</span>}
          </div>
          <div style={{ fontSize: '.85rem', color: 'var(--text-2)', marginTop: 4, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{m.text}</div>
          <div className="hint" style={{ marginTop: 6 }}>
            {fmtDate(m.ts.slice(0, 10))} {new Date(m.ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
        {fromMe && !deleted && <button className="btn btn-danger btn-icon" onClick={() => remove(m)} aria-label="Delete"><Trash2 /></button>}
      </div>
    );
  };

  return (
    <>
      <PageHead title="Messages" sub="Talk to your team without leaving Traqi"
        actions={<button className="btn btn-primary" onClick={() => setForm(true)}><Plus />New Message</button>} />
      {live.length ? live.map(m => <Card key={m.id} m={m} />)
        : <EmptyState icon={MessagesSquare} title="No messages" text="Start a conversation with your team." />}
      {!!gone.length && (
        <div style={{ marginTop: 20 }}>
          <button className="btn btn-secondary btn-block" onClick={() => setShowDeleted(v => !v)}>
            <Archive />Deleted messages ({gone.length})
          </button>
          {showDeleted && <div style={{ marginTop: 10 }}>{gone.map(m => <Card key={m.id} m={m} deleted />)}</div>}
        </div>
      )}
      <MessageForm open={form} onClose={() => setForm(false)} />
    </>
  );
}
