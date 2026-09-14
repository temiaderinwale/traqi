'use client';
import React, { useState } from 'react';
import { AlertCircle, Check, CheckCheck, CheckCircle2, ListChecks, MessageSquare, Plus, Trash2 } from 'lucide-react';
import { useTraqi } from '@/lib/store';
import { useFabAction } from '@/lib/fab';
import { fmtDate, diffDays } from '@/lib/format';
import { PageHead, EmptyState, Card, Badge, Kpi, KpiGrid } from '@/components/ui';
import { TaskForm, FeedbackForm } from '@/components/forms';

export default function TasksPage() {
  const { ws, user, isOwner, save, log, showToast } = useTraqi();
  const [form, setForm] = useState(false);
  const [feedbackId, setFeedbackId] = useState<string | null>(null);
  useFabAction(() => { setForm(true); });

  const mine = (isOwner ? ws.tasks : ws.tasks.filter(t => t.assignedTo?.includes(user.id)))
    .slice().sort((a, b) => {
      const rank = (t: typeof a) => (t.status === 'done' ? 2 : t.status === 'acknowledged' ? 1 : 0);
      return rank(a) !== rank(b) ? rank(a) - rank(b) : +new Date(b.created) - +new Date(a.created);
    });
  const pending = mine.filter(t => t.status !== 'done').length;
  const urgent = mine.filter(t => t.priority === 'urgent' && t.status !== 'done').length;
  const done = mine.filter(t => t.status === 'done').length;

  const ack = (id: string) => {
    save('tasks', ws.tasks.map(t => t.id === id
      ? { ...t, acknowledged: { ...t.acknowledged, [user.id]: new Date().toISOString() }, status: t.status === 'pending' ? 'acknowledged' as const : t.status }
      : t));
    showToast('Task acknowledged');
  };
  const complete = (id: string) => {
    save('tasks', ws.tasks.map(t => {
      if (t.id !== id) return t;
      const completed = { ...t.completed, [user.id]: new Date().toISOString() };
      const allDone = t.assignedTo.every(a => completed[a]);
      return { ...t, completed, status: allDone ? 'done' as const : 'acknowledged' as const };
    }));
    log('Completed task', ws.tasks.find(t => t.id === id)?.title || '');
    showToast('Task marked done');
  };
  const remove = (id: string) => {
    if (!confirm('Delete this task?')) return;
    save('tasks', ws.tasks.filter(t => t.id !== id));
    showToast('Task deleted');
  };

  return (
    <>
      <PageHead title="Tasks" sub={isOwner ? 'Assign work and track completion' : 'Work assigned to you'}
        actions={isOwner ? <button className="btn btn-primary" onClick={() => setForm(true)}><Plus />Assign Task</button> : null} />
      <KpiGrid>
        <Kpi icon={ListChecks} tone="amber" label="Pending" value={pending} />
        <Kpi icon={AlertCircle} tone={urgent ? 'red' : undefined} label="Urgent" value={urgent} />
        <Kpi icon={CheckCircle2} tone="green" label="Completed" value={done} />
      </KpiGrid>
      {mine.length ? mine.map(t => {
        const isDone = t.status === 'done';
        const acked = t.acknowledged?.[user.id];
        const names = t.assignedTo.map(id => ws.assistants.find(a => a.id === id)?.name || id).join(', ');
        const overdue = t.dueDate && !isDone && diffDays(t.dueDate) < 0;
        return (
          <Card key={t.id} style={{
            marginBottom: 10, opacity: isDone ? .72 : 1,
            borderLeft: `4px solid var(--${isDone ? 'green-600' : t.priority === 'urgent' ? 'red-600' : 'indigo-600'})`
          }}>
            <div style={{ fontWeight: 700, fontSize: '.94rem' }}>
              {t.priority === 'urgent' && <Badge tone="red">Urgent</Badge>} {t.title}
            </div>
            <div className="hint" style={{ marginTop: 5 }}>
              <Badge tone={isDone ? 'green' : acked ? 'amber' : 'slate'}>{isDone ? 'Done' : acked ? 'Acknowledged' : 'Pending'}</Badge>
              {' '}Assigned to {names} · {t.dueDate ? 'Due ' + fmtDate(t.dueDate) : 'No due date'}
              {overdue && <> <Badge tone="red">Overdue</Badge></>}
            </div>
            {t.description && <p style={{ fontSize: '.85rem', color: 'var(--text-2)', margin: '10px 0 0', lineHeight: 1.6 }}>{t.description}</p>}
            <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
              {!isOwner && !isDone && <>
                {!acked && <button className="btn btn-secondary btn-sm" onClick={() => ack(t.id)}><Check />Acknowledge</button>}
                <button className="btn btn-success btn-sm" onClick={() => complete(t.id)}><CheckCheck />Mark done</button>
                <button className="btn btn-ghost btn-sm" onClick={() => setFeedbackId(t.id)}><MessageSquare />Feedback</button>
              </>}
              {isOwner && <button className="btn btn-danger btn-sm" onClick={() => remove(t.id)}><Trash2 /></button>}
            </div>
            {!!t.feedback?.length && (
              <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--divider)' }}>
                <div className="label" style={{ marginBottom: 6 }}>Feedback ({t.feedback.length})</div>
                {t.feedback.map((f, i) => (
                  <div key={i} style={{ background: 'var(--surface-2)', borderRadius: '.7rem', padding: 10, marginTop: 6, fontSize: '.8rem' }}>
                    <strong style={{ fontSize: '.75rem' }}>{f.name}</strong> <span className="hint">{fmtDate(f.ts.slice(0, 10))}</span>
                    <div style={{ marginTop: 4 }}>{f.text}</div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        );
      }) : (
        <EmptyState icon={ListChecks} title="No tasks" text={isOwner ? 'Assign a task to your team to get started.' : 'Nothing assigned to you yet.'}
          action={isOwner ? <button className="btn btn-primary" onClick={() => setForm(true)}><Plus />Assign Task</button> : null} />
      )}
      <TaskForm open={form} onClose={() => setForm(false)} />
      <FeedbackForm open={!!feedbackId} onClose={() => setFeedbackId(null)} taskId={feedbackId || ''} />
    </>
  );
}
