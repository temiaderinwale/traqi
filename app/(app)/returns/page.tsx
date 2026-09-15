'use client';
import React, { useState } from 'react';
import { Banknote, Package, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { useTraqi, useMoney } from '@/lib/store';
import { useFabAction } from '@/lib/fab';
import { fmtDate } from '@/lib/format';
import { PageHead, TableWrap, EmptyState, Badge, Kpi, KpiGrid } from '@/components/ui';
import { ReturnForm } from '@/components/forms';

export default function ReturnsPage() {
  const { ws, isOwner, can, save, showToast } = useTraqi();
  const money = useMoney();
  const [form, setForm] = useState(false);
  useFabAction(() => { setForm(true); });
  const totRef = ws.returns.reduce((a, r) => a + (r.amt || 0), 0);
  const totQty = ws.returns.reduce((a, r) => a + (r.qty || 0), 0);
  const remove = (id: string) => {
    const before = ws.returns;
    save('returns', ws.returns.filter(r => r.id !== id));
    showToast('Return deleted', () => save('returns', before));
  };
  return (
    <>
      <PageHead sub="Track what came back and why"
        actions={can('log_returns') ? <button className="btn btn-primary" onClick={() => setForm(true)}><Plus />Log Return</button> : null} />
      <KpiGrid>
        <Kpi icon={RotateCcw} tone="red" label="Total returns" value={ws.returns.length} />
        <Kpi icon={Banknote} tone="amber" label="Refunded" value={money(totRef)} />
        <Kpi icon={Package} label="Units returned" value={totQty} />
      </KpiGrid>
      {ws.returns.length ? (
        <TableWrap head={<tr><th>Date</th><th>Customer</th><th>Product</th><th className="num">Qty</th><th className="num">Refund</th><th>Reason</th><th>Action</th><th /></tr>}>
          {[...ws.returns].sort((a, b) => +new Date(b.date) - +new Date(a.date)).map(r => (
            <tr key={r.id}>
              <td>{fmtDate(r.date)}</td><td>{r.custName || '—'}</td><td>{r.prodName}</td>
              <td className="num tnum">{r.qty}</td><td className="num tnum">{money(r.amt)}</td><td>{r.reason}</td>
              <td><Badge tone={r.action === 'Full Refund' ? 'red' : r.action === 'Exchange' ? 'amber' : 'slate'}>{r.action}</Badge></td>
              <td><div className="row-actions">{isOwner && <button className="btn btn-danger btn-icon" onClick={() => remove(r.id)} aria-label="Delete"><Trash2 /></button>}</div></td>
            </tr>
          ))}
        </TableWrap>
      ) : <EmptyState icon={RotateCcw} title="No returns logged" text="Returns and refunds you record will appear here." />}
      <ReturnForm open={form} onClose={() => setForm(false)} />
    </>
  );
}
