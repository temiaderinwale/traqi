'use client';
import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Pencil, Plus, Receipt, Trash2 } from 'lucide-react';
import { useTraqi, useMoney } from '@/lib/store';
import { useFabAction } from '@/lib/fab';
import { getOrders } from '@/lib/compute';
import { fmtDate, marginClass } from '@/lib/format';
import { PageHead, TableWrap, EmptyState, Badge } from '@/components/ui';
import { SaleForm, ReceiptModal } from '@/components/SaleForm';

export default function SalesPage() {
  const { ws, isOwner, can, save, log, showToast } = useTraqi();
  const money = useMoney();
  const params = useSearchParams();
  const [q, setQ] = useState(''); const [status, setStatus] = useState(''); const [channel, setChannel] = useState(''); const [date, setDate] = useState('');
  const [form, setForm] = useState(false); const [editId, setEditId] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<string | null>(null);
  useFabAction(() => { setEditId(null); setForm(true); });

  useEffect(() => { if (params.get('new')) { setEditId(null); setForm(true); } }, [params]);

  let orders = getOrders(ws);
  if (q) orders = orders.filter(o => o.custName.toLowerCase().includes(q.toLowerCase()) || o.lines.some(l => l.prodName.toLowerCase().includes(q.toLowerCase())));
  if (status) orders = orders.filter(o => o.status === status);
  if (channel) orders = orders.filter(o => o.channel === channel);
  if (date) orders = orders.filter(o => o.date === date);

  const remove = (orderId: string) => {
    if (!confirm('Delete this sale order? This cannot be undone.')) return;
    save('sales', ws.sales.filter(s => (s.orderId || s.id) !== orderId));
    log('Sale deleted', orderId);
    showToast('Order deleted');
  };

  return (
    <>
      <PageHead sub={`${ws.sales.length} line item${ws.sales.length === 1 ? '' : 's'} recorded`}
        actions={can('record_sales') ? <button className="btn btn-primary" onClick={() => { setEditId(null); setForm(true); }}><Plus />Record Sale</button> : null} />
      <div className="search-row">
        <input className="search-input" placeholder="Search customer or product…" value={q} onChange={e => setQ(e.target.value)} />
        <select value={status} onChange={e => setStatus(e.target.value)}><option value="">All statuses</option>{['Paid', 'Pending', 'Part Payment'].map(s => <option key={s}>{s}</option>)}</select>
        <select value={channel} onChange={e => setChannel(e.target.value)}><option value="">All channels</option>{['WhatsApp', 'Walk-in', 'Instagram', 'Phone', 'Referral', 'Other'].map(s => <option key={s}>{s}</option>)}</select>
        <input type="date" value={date} onChange={e => setDate(e.target.value)} />
      </div>
      {orders.length ? (
        <TableWrap head={<tr><th>Receipt</th><th>Date</th><th>Customer</th><th>Products</th><th className="num">Qty</th><th className="num">Total</th>{isOwner && <th className="num">Profit</th>}<th>Channel</th><th>Status</th><th /></tr>}>
          {orders.map(o => {
            const total = o.lines.reduce((a, l) => a + l.qty * l.price, 0);
            const profit = o.lines.reduce((a, l) => a + l.qty * (l.price - l.cost), 0) - o.discount;
            const qty = o.lines.reduce((a, l) => a + l.qty, 0);
            const margin = (total - o.discount) ? Math.round(profit / (total - o.discount) * 100) : 0;
            return (
              <tr key={o.orderId}>
                <td><Badge tone="indigo">{o.recNum || '—'}</Badge></td>
                <td>{fmtDate(o.date)}</td>
                <td><strong>{o.custName}</strong></td>
                <td style={{ maxWidth: 180 }}>
                  <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {o.lines.length > 1 && <Badge>{o.lines.length} items</Badge>} {o.lines.map(l => l.prodName).join(', ')}
                  </div>
                </td>
                <td className="num tnum">{qty}</td>
                <td className="num tnum"><strong>{money(total - o.discount)}</strong>{o.discount ? <div className="hint pos">-{money(o.discount)}</div> : null}</td>
                {isOwner && <td className={'num tnum ' + marginClass(margin)}>{money(profit)}</td>}
                <td><Badge>{o.channel || '—'}</Badge></td>
                <td><Badge tone={o.status === 'Paid' ? 'green' : o.status === 'Pending' ? 'amber' : 'indigo'}>{o.status}</Badge></td>
                <td><div className="row-actions">
                  <button className="btn btn-primary btn-icon" onClick={() => setReceipt(o.orderId)} aria-label="Receipt"><Receipt /></button>
                  <button className="btn btn-secondary btn-icon" onClick={() => { setEditId(o.orderId); setForm(true); }} aria-label="Edit"><Pencil /></button>
                  {isOwner && <button className="btn btn-danger btn-icon" onClick={() => remove(o.orderId)} aria-label="Delete"><Trash2 /></button>}
                </div></td>
              </tr>
            );
          })}
        </TableWrap>
      ) : (
        <EmptyState icon={Receipt} title={ws.sales.length ? 'No matching sales' : 'No sales yet'}
          text={ws.sales.length ? 'Try clearing your filters.' : 'Record your first sale — a receipt is generated automatically.'}
          action={can('record_sales') ? <button className="btn btn-primary" onClick={() => { setEditId(null); setForm(true); }}><Plus />Record Sale</button> : null} />
      )}
      <SaleForm open={form} onClose={() => setForm(false)} editOrderId={editId} onSaved={setReceipt} />
      <ReceiptModal orderId={receipt} onClose={() => setReceipt(null)} />
    </>
  );
}
