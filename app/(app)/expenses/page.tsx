'use client';
import React, { useState } from 'react';
import { CalendarDays, List, Pencil, Plus, Tag, Trash2, Wallet } from 'lucide-react';
import { useTraqi, useMoney } from '@/lib/store';
import { useFabAction } from '@/lib/fab';
import { fmtDate } from '@/lib/format';
import { PageHead, TableWrap, EmptyState, Badge, Kpi, KpiGrid } from '@/components/ui';
import { ExpenseForm } from '@/components/forms';
import type { Expense } from '@/lib/types';

export default function ExpensesPage() {
  const { ws, isOwner, can, save, showToast } = useTraqi();
  const money = useMoney();
  const [form, setForm] = useState(false); const [editing, setEditing] = useState<Expense | null>(null);
  useFabAction(() => { setEditing(null); setForm(true); });
  const total = ws.expenses.reduce((a, e) => a + e.amt, 0);
  const now = new Date();
  const thisM = ws.expenses.filter(e => { const d = new Date(e.date); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); }).reduce((a, e) => a + e.amt, 0);
  const bycat: Record<string, number> = {};
  ws.expenses.forEach(e => { bycat[e.cat] = (bycat[e.cat] || 0) + e.amt; });
  const top = Object.keys(bycat).sort((a, b) => bycat[b] - bycat[a])[0];
  const remove = (id: string) => {
    const before = ws.expenses;
    save('expenses', ws.expenses.filter(e => e.id !== id));
    showToast('Expense deleted', () => save('expenses', before));
  };
  return (
    <>
      <PageHead title="Expenses" sub="Every naira going out"
        actions={can('add_expenses') ? <button className="btn btn-primary" onClick={() => { setEditing(null); setForm(true); }}><Plus />Add Expense</button> : null} />
      <KpiGrid>
        <Kpi icon={Wallet} tone="red" label="Total expenses" value={money(total)} />
        <Kpi icon={CalendarDays} tone="amber" label="This month" value={money(thisM)} />
        <Kpi icon={Tag} label="Top category" value={top || '—'} />
        <Kpi icon={List} label="Entries" value={ws.expenses.length} />
      </KpiGrid>
      {ws.expenses.length ? (
        <TableWrap minWidth={560} head={<tr><th>Date</th><th>Category</th><th>Description</th><th className="num">Amount</th><th>Paid by</th><th /></tr>}>
          {[...ws.expenses].sort((a, b) => +new Date(b.date) - +new Date(a.date)).map(e => (
            <tr key={e.id}>
              <td>{fmtDate(e.date)}</td><td><Badge tone="indigo">{e.cat}</Badge></td><td>{e.desc}</td>
              <td className="num tnum neg">{money(e.amt)}</td><td>{e.by}</td>
              <td><div className="row-actions">
                <button className="btn btn-secondary btn-icon" onClick={() => { setEditing(e); setForm(true); }} aria-label="Edit"><Pencil /></button>
                {isOwner && <button className="btn btn-danger btn-icon" onClick={() => remove(e.id)} aria-label="Delete"><Trash2 /></button>}
              </div></td>
            </tr>
          ))}
        </TableWrap>
      ) : (
        <EmptyState icon={Wallet} title="No expenses logged" text="Track packaging, delivery, ads and more to see true profit."
          action={can('add_expenses') ? <button className="btn btn-primary" onClick={() => setForm(true)}><Plus />Add Expense</button> : null} />
      )}
      <ExpenseForm open={form} onClose={() => setForm(false)} editing={editing} />
    </>
  );
}
