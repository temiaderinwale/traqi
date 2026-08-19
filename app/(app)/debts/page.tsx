'use client';
import React, { useState } from 'react';
import { CheckCircle2, Hourglass, Pencil, Plus, Trash2, Users } from 'lucide-react';
import { useTraqi, useMoney } from '@/lib/store';
import { fmtDate, diffDays } from '@/lib/format';
import { PageHead, TableWrap, EmptyState, Badge, Kpi, KpiGrid } from '@/components/ui';
import { DebtForm } from '@/components/forms';
import type { Debt } from '@/lib/types';

export default function DebtsPage() {
  const { ws, isOwner, save, log, showToast } = useTraqi();
  const money = useMoney();
  const [form, setForm] = useState(false); const [editing, setEditing] = useState<Debt | null>(null);
  const owed = ws.debts.reduce((a, d) => a + (d.total - d.paid), 0);
  const active = ws.debts.filter(d => d.status !== 'Cleared').length;
  const cleared = ws.debts.filter(d => d.status === 'Cleared').length;
  const markPaid = (d: Debt) => {
    save('debts', ws.debts.map(x => (x.id === d.id ? { ...x, paid: x.total, status: 'Cleared' } : x)));
    log('Debt cleared', `${d.custName} — ${money(d.total)}`);
    showToast('Debt cleared');
  };
  const remove = (id: string) => {
    const before = ws.debts;
    save('debts', ws.debts.filter(d => d.id !== id));
    showToast('Debt deleted', () => save('debts', before));
  };
  return (
    <>
      <PageHead title="Debts & Credit" sub="Who owes what, and since when"
        actions={<button className="btn btn-primary" onClick={() => { setEditing(null); setForm(true); }}><Plus />Add Debt</button>} />
      <KpiGrid>
        <Kpi icon={Hourglass} tone="amber" label="Outstanding" value={money(owed)} />
        <Kpi icon={Users} label="Active debts" value={active} />
        <Kpi icon={CheckCircle2} tone="green" label="Cleared" value={cleared} />
      </KpiGrid>
      {ws.debts.length ? (
        <TableWrap minWidth={820} head={<tr><th>Date</th><th>Customer</th><th>Product</th><th className="num">Total</th><th className="num">Paid</th><th className="num">Balance</th><th>Due</th><th>Status</th><th /></tr>}>
          {[...ws.debts].sort((a, b) => +new Date(b.date) - +new Date(a.date)).map(d => {
            const bal = d.total - d.paid, over = d.due ? -diffDays(d.due) : 0;
            return (
              <tr key={d.id}>
                <td>{fmtDate(d.date)}</td><td><strong>{d.custName}</strong></td><td>{d.prod || '—'}</td>
                <td className="num tnum">{money(d.total)}</td><td className="num tnum">{money(d.paid)}</td>
                <td className="num tnum"><strong className={bal > 0 ? 'neg' : 'pos'}>{money(bal)}</strong></td>
                <td>{fmtDate(d.due)}{over > 0 && d.status !== 'Cleared' ? <> <Badge tone="red">{over}d late</Badge></> : null}</td>
                <td><Badge tone={d.status === 'Cleared' ? 'green' : bal === d.total ? 'red' : 'amber'}>{d.status}</Badge></td>
                <td><div className="row-actions">
                  {d.status !== 'Cleared' && <button className="btn btn-success btn-sm" onClick={() => markPaid(d)}>Mark paid</button>}
                  <button className="btn btn-secondary btn-icon" onClick={() => { setEditing(d); setForm(true); }} aria-label="Edit"><Pencil /></button>
                  {isOwner && <button className="btn btn-danger btn-icon" onClick={() => remove(d.id)} aria-label="Delete"><Trash2 /></button>}
                </div></td>
              </tr>
            );
          })}
        </TableWrap>
      ) : <EmptyState icon={Hourglass} title="No debts recorded" text="Part-payments and credit sales show up here." />}
      <DebtForm open={form} onClose={() => setForm(false)} editing={editing} />
    </>
  );
}
