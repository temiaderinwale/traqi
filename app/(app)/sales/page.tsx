'use client';
import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CalendarDays, CreditCard, Megaphone, Pencil, Plus, Receipt, Trash2, X } from 'lucide-react';
import { useTraqi, useMoney } from '@/lib/store';
import { useFabAction } from '@/lib/fab';
import { getOrders } from '@/lib/compute';
import { fmtDate, marginClass, todayStr } from '@/lib/format';
import { smartFilter } from '@/lib/search';
import { PageHead, TableWrap, EmptyState, Badge } from '@/components/ui';
import { SaleForm, ReceiptModal } from '@/components/SaleForm';
import { OptionSelect } from '@/components/Dropdown';

type DateMode = '' | 'today' | 'day' | 'range';
const DATE_MODES = [
  { value: 'today', label: 'Today' },
  { value: 'day', label: 'Specific date', sub: 'Sales from one day' },
  { value: 'range', label: 'Date range', sub: 'Everything from one date to another' }
];

export default function SalesPage() {
  const { ws, isOwner, can, save, log, showToast } = useTraqi();
  const money = useMoney();
  const params = useSearchParams();
  const [q, setQ] = useState(''); const [status, setStatus] = useState(''); const [channel, setChannel] = useState('');
  /* Dates are ISO strings (YYYY-MM-DD), so they compare correctly as text. */
  const [dateMode, setDateMode] = useState<DateMode>('');
  const [day, setDay] = useState(todayStr());
  const [from, setFrom] = useState(''); const [to, setTo] = useState('');
  const [form, setForm] = useState(false); const [editId, setEditId] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<string | null>(null);
  useFabAction(() => { setEditId(null); setForm(true); });

  useEffect(() => { if (params.get('new')) { setEditId(null); setForm(true); } }, [params]);

  let orders = getOrders(ws);
  if (q) orders = smartFilter(orders, q, o => `${o.custName} ${o.recNum || ''} ${o.lines.map(l => l.prodName).join(' ')}`);
  if (status) orders = orders.filter(o => o.status === status);
  if (channel) orders = orders.filter(o => o.channel === channel);
  if (dateMode === 'today') orders = orders.filter(o => o.date === todayStr());
  if (dateMode === 'day' && day) orders = orders.filter(o => o.date === day);
  if (dateMode === 'range' && (from || to)) {
    /* Either end may be left open; a backwards range is read the right way round. */
    const [lo, hi] = from && to && from > to ? [to, from] : [from, to];
    orders = orders.filter(o => (!lo || o.date >= lo) && (!hi || o.date <= hi));
  }
  const filtered = !!(q || status || channel || dateMode);
  const shownTotal = orders.reduce((a, o) => a + o.lines.reduce((b, l) => b + l.qty * l.price, 0) - o.discount, 0);
  const rangeLabel = dateMode === 'today' ? 'today'
    : dateMode === 'day' && day ? 'on ' + fmtDate(day)
    : dateMode === 'range' && (from || to)
      ? (from && to ? `${fmtDate(from > to ? to : from)} – ${fmtDate(from > to ? from : to)}` : from ? 'from ' + fmtDate(from) : 'up to ' + fmtDate(to))
      : '';
  const clearFilters = () => { setQ(''); setStatus(''); setChannel(''); setDateMode(''); setFrom(''); setTo(''); setDay(todayStr()); };

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
        <OptionSelect value={status} onChange={setStatus} allLabel="All statuses" icon={CreditCard}
          options={['Paid', 'Pending', 'Part Payment'].map(v => ({ value: v }))} />
        <OptionSelect value={channel} onChange={setChannel} allLabel="All channels" icon={Megaphone}
          options={['WhatsApp', 'Walk-in', 'Instagram', 'Phone', 'Referral', 'Other'].map(v => ({ value: v }))} />
        <div className="date-filter">
          <OptionSelect value={dateMode} onChange={v => setDateMode(v as DateMode)} allLabel="All dates" icon={CalendarDays}
            options={DATE_MODES} />
          {dateMode === 'day' && (
            <input type="date" aria-label="Sale date" value={day} max={todayStr()} onChange={e => setDay(e.target.value)} />
          )}
          {dateMode === 'range' && <>
            <input type="date" aria-label="From date" value={from} max={to || undefined} onChange={e => setFrom(e.target.value)} />
            <span className="to">to</span>
            <input type="date" aria-label="To date" value={to} min={from || undefined} onChange={e => setTo(e.target.value)} />
          </>}
        </div>
      </div>
      {filtered && (
        <div className="filter-sum">
          <span><strong>{orders.length}</strong> order{orders.length === 1 ? '' : 's'}{rangeLabel ? ' ' + rangeLabel : ''}</span>
          <span>·</span>
          <span><strong>{money(shownTotal)}</strong> total</span>
          <button className="link-btn" onClick={clearFilters} style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
            <X style={{ width: 13, height: 13 }} />Clear filters
          </button>
        </div>
      )}
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
