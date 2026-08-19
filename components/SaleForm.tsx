'use client';
/* Traqi — sale builder + receipt */

import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Receipt, ShoppingCart, X, Printer, ImageDown, MessageCircle, Clipboard } from 'lucide-react';
import { useTraqi, useMoney } from '@/lib/store';
import { nextId, todayStr, fmtDate, waLink } from '@/lib/format';
import { getOrders } from '@/lib/compute';
import { Modal, Field } from './ui';
import type { Sale } from '@/lib/types';

type Line = { key: string; prodId: string; search: string; qty: string; price: string; open: boolean };
const newLine = (): Line => ({ key: Math.random().toString(36).slice(2), prodId: '', search: '', qty: '1', price: '', open: false });

export function SaleForm({ open, onClose, editOrderId, onSaved }: {
  open: boolean; onClose: () => void; editOrderId?: string | null;
  onSaved?: (orderId: string) => void;
}) {
  const { ws, user, save, saveConfig, log, showToast } = useTraqi();
  const money = useMoney();
  const [date, setDate] = useState(todayStr());
  const [custId, setCustId] = useState('');
  const [custSearch, setCustSearch] = useState('');
  const [custOpen, setCustOpen] = useState(false);
  const [status, setStatus] = useState('Paid');
  const [channel, setChannel] = useState('WhatsApp');
  const [notes, setNotes] = useState('');
  const [receiptNote, setReceiptNote] = useState('');
  const [discVal, setDiscVal] = useState('');
  const [discType, setDiscType] = useState<'fixed' | 'percent'>('fixed');
  const [lines, setLines] = useState<Line[]>([newLine()]);
  const [inlineCust, setInlineCust] = useState(false);
  const [icName, setIcName] = useState('');
  const [icPhone, setIcPhone] = useState('');

  useEffect(() => {
    if (!open) return;
    if (editOrderId) {
      const items = ws.sales.filter(s => (s.orderId || s.id) === editOrderId);
      const f = items[0];
      if (f) {
        setDate(f.date); setCustId(f.custId); setCustSearch(f.custName);
        setStatus(f.status); setChannel(f.channel); setNotes(f.notes || '');
        setReceiptNote(f.receiptNote || '');
        setDiscVal(String(items.reduce((a, i) => a + (i.discount || 0), 0) || ''));
        setDiscType('fixed');
        setLines(items.map(i => ({ key: i.id, prodId: i.prodId, search: i.prodName, qty: String(i.qty), price: String(i.price), open: false })));
      }
    } else {
      setDate(todayStr()); setCustId(''); setCustSearch(''); setStatus('Paid'); setChannel('WhatsApp');
      setNotes(''); setReceiptNote(''); setDiscVal(''); setDiscType('fixed'); setLines([newLine()]);
      setInlineCust(false); setIcName(''); setIcPhone('');
    }
  }, [open, editOrderId, ws.sales]);

  const owed = useMemo(() => ws.debts.filter(d => d.custId === custId && d.status !== 'Cleared')
    .reduce((a, d) => a + (d.total - d.paid), 0), [ws.debts, custId]);

  const subtotal = lines.reduce((a, l) => a + (parseFloat(l.qty) || 0) * (parseFloat(l.price) || 0), 0);
  const discount = Math.min(subtotal, discType === 'percent' ? Math.round(subtotal * (parseFloat(discVal) || 0) / 100) : (parseFloat(discVal) || 0));

  const setLine = (key: string, patch: Partial<Line>) => setLines(ls => ls.map(l => (l.key === key ? { ...l, ...patch } : l)));
  const removeLine = (key: string) => setLines(ls => (ls.length > 1 ? ls.filter(l => l.key !== key) : [newLine()]));

  const addInlineCustomer = () => {
    if (!icName.trim() || !icPhone.trim()) { showToast('Name and phone are required'); return; }
    const c = {
      id: nextId('CUS', ws.customers), name: icName.trim(), phone: icPhone.trim(), wa: icPhone.trim(),
      insta: '', city: '', source: '', refby: '', type: 'Regular', bday: '', scent: '', notes: ''
    };
    save('customers', [...ws.customers, c]);
    setCustId(c.id); setCustSearch(c.name); setInlineCust(false); setIcName(''); setIcPhone('');
    showToast('Customer added: ' + c.name);
  };

  const submit = () => {
    if (!date || !custId) { showToast('Select a date and customer'); return; }
    const valid = lines
      .map(l => {
        const p = ws.products.find(x => x.id === l.prodId);
        const qty = parseInt(l.qty) || 0, price = parseFloat(l.price) || 0;
        return p && qty > 0 && price > 0 ? { p, qty, price } : null;
      })
      .filter(Boolean) as { p: typeof ws.products[0]; qty: number; price: number }[];
    if (!valid.length) { showToast('Add at least one product'); return; }

    const cust = ws.customers.find(c => c.id === custId);
    let orderId: string, recNum: string, rest: Sale[];
    if (editOrderId) {
      const existing = ws.sales.filter(s => (s.orderId || s.id) === editOrderId);
      orderId = editOrderId;
      recNum = existing[0]?.recNum || '';
      rest = ws.sales.filter(s => (s.orderId || s.id) !== editOrderId);
    } else {
      orderId = 'ORD-' + Date.now();
      const n = (ws.config.receiptCounter || 0) + 1;
      recNum = 'REC-' + (n < 10 ? '00' + n : n < 100 ? '0' + n : n);
      saveConfig({ receiptCounter: n });
      rest = ws.sales;
    }
    const per = valid.length > 1 ? Math.round(discount / valid.length) : discount;
    const rows: Sale[] = valid.map((v, i) => ({
      id: nextId('SL', [...rest, ...Array(i).fill({ id: 'SL-000' })]) + (i ? '-' + i : ''),
      orderId, date, custId, custName: cust?.name || '',
      prodId: v.p.id, prodName: v.p.name, cat: v.p.cat, qty: v.qty, price: v.price, cost: v.p.cost,
      status, channel, notes, recNum,
      discount: i === 0 ? discount - per * (valid.length - 1) : per,
      receiptNote, recordedBy: user.id || 'owner', recordedByName: user.name
    }));
    save('sales', [...rest, ...rows]);
    log('Sale recorded', `${valid.length} product(s) to ${cust?.name} for ${money(subtotal - discount)}`);
    showToast('Sale recorded · ' + money(subtotal - discount));
    onClose();
    onSaved?.(orderId);
  };

  if (!open) return null;
  const custMatches = ws.customers.filter(c =>
    !custSearch || c.name.toLowerCase().includes(custSearch.toLowerCase()));

  return (
    <Modal open={open} onClose={onClose} title={editOrderId ? 'Edit Sale' : 'Record Sale'} icon={ShoppingCart} wide
      actions={<><button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={submit}><Receipt />Save &amp; generate receipt</button></>}>
      <div className="form-grid" style={{ marginBottom: 16 }}>
        <Field label="Sale date *"><input type="date" value={date} onChange={e => setDate(e.target.value)} /></Field>
        <Field label="Payment status"><select value={status} onChange={e => setStatus(e.target.value)}>
          {['Paid', 'Pending', 'Part Payment'].map(s => <option key={s}>{s}</option>)}
        </select></Field>
        <div className="field full">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label className="label">Customer *</label>
            <button className="link-btn" onClick={() => setInlineCust(v => !v)}>+ New customer</button>
          </div>
          <div className="ss-wrap">
            <input value={custSearch} placeholder="Type to search customer…"
              onChange={e => { setCustSearch(e.target.value); setCustId(''); setCustOpen(true); }}
              onFocus={() => setCustOpen(true)} onBlur={() => setTimeout(() => setCustOpen(false), 200)} />
            {custOpen && (
              <div className="ss-drop open">
                {custMatches.length ? custMatches.slice(0, 50).map(c => {
                  const debt = ws.debts.filter(d => d.custId === c.id && d.status !== 'Cleared').reduce((a, d) => a + (d.total - d.paid), 0);
                  return (
                    <div className="ss-opt" key={c.id} onMouseDown={() => { setCustId(c.id); setCustSearch(c.name); setCustOpen(false); }}>
                      <div className="ss-name">{c.name}</div>
                      <div className="ss-sub">{c.city || c.type}{debt > 0 ? ' · owes ' + money(debt) : ''}</div>
                    </div>
                  );
                }) : <div className="ss-opt ss-none">No results found</div>}
              </div>
            )}
          </div>
          {owed > 0 && <div className="debt-warn show">Heads up — this customer still owes {money(owed)}.</div>}
        </div>
        {inlineCust && (
          <div className="field full">
            <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '.85rem', padding: 14 }}>
              <p className="label" style={{ marginBottom: 10 }}>Quick add customer</p>
              <div className="form-grid">
                <Field label="Name *"><input value={icName} onChange={e => setIcName(e.target.value)} placeholder="Full name" /></Field>
                <Field label="Phone *"><input value={icPhone} onChange={e => setIcPhone(e.target.value)} placeholder="0801…" /></Field>
              </div>
              <button className="btn btn-primary btn-sm" style={{ marginTop: 10 }} onClick={addInlineCustomer}>Add &amp; select</button>
            </div>
          </div>
        )}
        <Field label="Sales channel"><select value={channel} onChange={e => setChannel(e.target.value)}>
          {['WhatsApp', 'Walk-in', 'Instagram', 'Phone', 'Referral', 'Other'].map(c => <option key={c}>{c}</option>)}
        </select></Field>
        <Field label="Notes"><input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Order notes…" /></Field>
      </div>

      <p className="label" style={{ marginBottom: 8 }}>Products purchased</p>
      <div style={{ overflowX: 'auto' }}>
        <table className="lines">
          <thead><tr>
            <th style={{ minWidth: 190 }}>Product</th><th style={{ width: 70 }}>Qty</th>
            <th style={{ width: 120 }}>Unit price</th><th style={{ width: 110, textAlign: 'right' }}>Total</th><th style={{ width: 36 }} />
          </tr></thead>
          <tbody>
            {lines.map(l => {
              const matches = ws.products.filter(p => !l.search || p.name.toLowerCase().includes(l.search.toLowerCase()));
              return (
                <tr key={l.key}>
                  <td>
                    <div className="ss-wrap">
                      <input value={l.search} placeholder="Type to search product…"
                        onChange={e => setLine(l.key, { search: e.target.value, prodId: '', open: true })}
                        onFocus={() => setLine(l.key, { open: true })}
                        onBlur={() => setTimeout(() => setLine(l.key, { open: false }), 200)} />
                      {l.open && (
                        <div className="ss-drop open">
                          {matches.length ? matches.slice(0, 50).map(p => (
                            <div className="ss-opt" key={p.id}
                              onMouseDown={() => setLine(l.key, { prodId: p.id, search: p.name, price: String(p.price), open: false })}>
                              <div className="ss-name">{p.name}</div>
                              <div className="ss-sub">{p.cat} · {money(p.price)}</div>
                            </div>
                          )) : <div className="ss-opt ss-none">No products found</div>}
                        </div>
                      )}
                    </div>
                  </td>
                  <td><input type="number" min={1} value={l.qty} onChange={e => setLine(l.key, { qty: e.target.value })} /></td>
                  <td><input type="number" value={l.price} onChange={e => setLine(l.key, { price: e.target.value })} /></td>
                  <td className="line-total">{money((parseFloat(l.qty) || 0) * (parseFloat(l.price) || 0))}</td>
                  <td><button className="line-x" onClick={() => removeLine(l.key)} aria-label="Remove"><X /></button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <button className="btn btn-secondary btn-sm" style={{ marginTop: 10 }} onClick={() => setLines(ls => [...ls, newLine()])}>
        <Plus />Add product
      </button>

      <div className="disc-row" style={{ marginTop: 12 }}>
        <label>Discount</label>
        <input type="number" min={0} value={discVal} onChange={e => setDiscVal(e.target.value)} placeholder="0" />
        <select value={discType} onChange={e => setDiscType(e.target.value as any)}>
          <option value="fixed">₦ Fixed</option><option value="percent">% Percent</option>
        </select>
        {discount > 0 && <span className="pos" style={{ fontSize: '.84rem' }}>-{money(discount)}</span>}
      </div>
      <Field label="Receipt note (optional)"><input value={receiptNote} onChange={e => setReceiptNote(e.target.value)} placeholder="e.g. Thank you for your patronage!" /></Field>
      <div className="total-bar">
        <div><span className="tl">Order total</span>
          {discount > 0 && <span style={{ display: 'block', fontSize: '.65rem', color: 'var(--indigo-200)' }}>Discount −{money(discount)}</span>}
        </div>
        <span className="tv">{money(subtotal - discount)}</span>
      </div>
    </Modal>
  );
}

/* ---------------- Receipt ---------------- */
export function ReceiptModal({ orderId, onClose }: { orderId: string | null; onClose: () => void }) {
  const { ws } = useTraqi();
  const money = useMoney();
  if (!orderId) return null;
  const items = ws.sales.filter(s => (s.orderId || s.id) === orderId);
  if (!items.length) return null;
  const f = items[0];
  const gross = items.reduce((a, i) => a + i.qty * i.price, 0);
  const disc = items.reduce((a, i) => a + (i.discount || 0), 0);
  const isInvoice = f.status !== 'Paid';

  const receiptText = () => {
    const div = '--------------------------------';
    return `${ws.config.bizName || 'Traqi'} — ${isInvoice ? 'INVOICE' : 'RECEIPT'}\n${f.recNum}\n${div}\nDate: ${fmtDate(f.date)}\nCustomer: ${f.custName}\n${div}\n` +
      items.map(i => `  ${i.prodName} x${i.qty} = ${money(i.qty * i.price)}`).join('\n') +
      (disc > 0 ? `\n\nDiscount: -${money(disc)}` : '') +
      `\n${div}\nTOTAL: ${money(gross - disc)}\nStatus: ${f.status}\n${div}\nThank you! — ${ws.config.ownerName}`;
  };
  const copy = async () => { try { await navigator.clipboard.writeText(receiptText()); } catch {} };
  const wa = () => {
    const cust = ws.customers.find(c => c.id === f.custId);
    const msg = `*${ws.config.bizName || 'Traqi'} — ${isInvoice ? 'Invoice' : 'Receipt'}*\n${f.recNum}\n\nHi ${f.custName}!\n\n` +
      items.map(i => `  • ${i.prodName} ×${i.qty} = ${money(i.qty * i.price)}`).join('\n') +
      (disc > 0 ? `\n\nDiscount: -${money(disc)}` : '') +
      `\n\nTOTAL: *${money(gross - disc)}*\nDate: ${fmtDate(f.date)}\nStatus: ${f.status}\n\nThank you!\n— ${ws.config.ownerName}`;
    const phone = cust?.wa || cust?.phone;
    window.open(phone ? waLink(phone) + '?text=' + encodeURIComponent(msg) : 'https://wa.me/?text=' + encodeURIComponent(msg), '_blank');
  };
  const download = async () => {
    const el = document.getElementById('receipt-area');
    if (!el) return;
    const html2canvas = (await import('html2canvas')).default;
    const canvas = await html2canvas(el, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
    const a = document.createElement('a');
    a.download = `${(ws.config.bizName || 'Traqi').replace(/\s+/g, '_')}_Receipt_${f.custName.replace(/\s+/g, '_')}.png`;
    a.href = canvas.toDataURL('image/png');
    a.click();
  };

  return (
    <Modal open onClose={onClose} title={isInvoice ? 'Invoice' : 'Receipt'} icon={Receipt} narrow>
      <div className="receipt-area" id="receipt-area">
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <div className="font-display" style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0F172A' }}>{ws.config.bizName || 'Traqi'}</div>
          <div style={{ fontSize: '.7rem', color: '#94A3B8', marginTop: 2 }}>Powered by Traqi</div>
        </div>
        <div style={{ borderTop: '2px solid #4F46E5', borderBottom: '1px dashed #E2E8F0', padding: '10px 0', marginBottom: 14 }}>
          {[['Receipt No.', f.recNum], ['Date', fmtDate(f.date)], ['Customer', f.custName]].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.78rem', marginBottom: 4 }}>
              <span style={{ color: '#94A3B8' }}>{k}</span><strong>{v}</strong>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', fontSize: '.66rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', paddingBottom: 6, borderBottom: '1px solid #E2E8F0' }}>
          <span style={{ flex: 2 }}>Product</span><span style={{ width: 38, textAlign: 'center' }}>Qty</span>
          <span style={{ width: 80, textAlign: 'right' }}>Price</span><span style={{ width: 84, textAlign: 'right' }}>Total</span>
        </div>
        {items.map(i => (
          <div key={i.id} style={{ display: 'flex', fontSize: '.8rem', padding: '6px 0', borderBottom: '1px solid #F1F5F9' }}>
            <span style={{ flex: 2, fontWeight: 500 }}>{i.prodName}</span>
            <span style={{ width: 38, textAlign: 'center', color: '#64748B' }}>{i.qty}</span>
            <span style={{ width: 80, textAlign: 'right', color: '#64748B' }}>{money(i.price)}</span>
            <span style={{ width: 84, textAlign: 'right', fontWeight: 700 }}>{money(i.qty * i.price)}</span>
          </div>
        ))}
        {disc > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.8rem', color: '#16A34A', marginTop: 8 }}>
            <span>Discount</span><strong>-{money(disc)}</strong>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#1E1B4B', color: '#fff', padding: '12px 16px', borderRadius: 10, margin: '12px 0' }}>
          <span style={{ fontSize: '.72rem', fontWeight: 700, textTransform: 'uppercase' }}>{items.length} item{items.length > 1 ? 's' : ''} · Total</span>
          <span className="font-display" style={{ fontSize: '1.4rem', fontWeight: 800 }}>{money(gross - disc)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.78rem' }}>
          <span style={{ color: '#94A3B8' }}>Payment</span>
          <span style={{ fontWeight: 700, color: f.status === 'Paid' ? '#16A34A' : '#B45309' }}>{f.status}</span>
        </div>
        {f.receiptNote && (
          <div style={{ background: '#EEF2FF', borderRadius: 8, padding: '9px 12px', fontSize: '.74rem', color: '#4338CA', textAlign: 'center', marginTop: 8, fontStyle: 'italic' }}>{f.receiptNote}</div>
        )}
        <div style={{ textAlign: 'center', marginTop: 16, paddingTop: 12, borderTop: '1px dashed #E2E8F0', fontSize: '.7rem', color: '#94A3B8' }}>
          Thank you for your business!<br />{ws.config.ownerName} · {ws.config.bizName}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 16 }}>
        <button className="btn btn-primary" onClick={() => window.print()}><Printer />Print / PDF</button>
        <button className="btn btn-secondary" onClick={download}><ImageDown />Download</button>
        <button className="btn btn-wa" onClick={wa}><MessageCircle />WhatsApp</button>
        <button className="btn btn-secondary" onClick={copy}><Clipboard />Copy text</button>
      </div>
      <div style={{ textAlign: 'center', marginTop: 12 }}><button className="link-btn" onClick={onClose}>Close</button></div>
    </Modal>
  );
}
