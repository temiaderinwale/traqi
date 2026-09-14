'use client';
import React, { useState } from 'react';
import { Eye, MessageCircle, Pencil, Plus, Trash2, Upload, Users, Phone, X } from 'lucide-react';
import { useTraqi, useMoney } from '@/lib/store';
import { useFabAction } from '@/lib/fab';
import { lastSeenDays } from '@/lib/compute';
import { waLink, fmtDate } from '@/lib/format';
import { PageHead, TableWrap, EmptyState, Badge, Avatar } from '@/components/ui';
import { CustomerForm } from '@/components/forms';
import ImportModal from '@/components/ImportModal';
import type { Customer } from '@/lib/types';

export default function CustomersPage() {
  const { ws, isOwner, can, save, showToast } = useTraqi();
  const money = useMoney();
  const [q, setQ] = useState(''); const [type, setType] = useState('');
  const [form, setForm] = useState(false); const [editing, setEditing] = useState<Customer | null>(null);
  const [panel, setPanel] = useState<Customer | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  useFabAction(() => { setEditing(null); setForm(true); });

  const list = ws.customers.filter(c =>
    (!q || c.name.toLowerCase().includes(q.toLowerCase()) || (c.phone || '').includes(q)) &&
    (!type || c.type === type));
  const today = new Date();

  const remove = (id: string, name: string) => {
    const before = ws.customers;
    save('customers', ws.customers.filter(c => c.id !== id));
    showToast(`${name} deleted`, () => save('customers', before));
  };

  return (
    <>
      <PageHead title="Customers" sub={`${ws.customers.length} customer${ws.customers.length === 1 ? '' : 's'}`}
        actions={can('add_customers') ? <>
          <button className="btn btn-secondary" onClick={() => setImportOpen(true)}><Upload />Import CSV</button>
          <button className="btn btn-primary" onClick={() => { setEditing(null); setForm(true); }}><Plus />Add Customer</button>
        </> : null} />
      <div className="search-row">
        <input className="search-input" placeholder="Search by name or phone…" value={q} onChange={e => setQ(e.target.value)} />
        <select value={type} onChange={e => setType(e.target.value)}>
          <option value="">All types</option>{['VIP', 'Regular', 'Wholesale', 'One-time'].map(t => <option key={t}>{t}</option>)}
        </select>
      </div>
      {list.length ? (
        <TableWrap head={<tr><th>Name</th><th>Phone</th><th>Source</th><th>Type</th><th>Birthday</th><th className="num">Orders</th><th className="num">Spent</th><th>Last seen</th><th /></tr>}>
          {list.map(c => {
            const cs = ws.sales.filter(s => s.custId === c.id);
            const orders = new Set(cs.map(s => s.orderId || s.id)).size;
            const spent = cs.reduce((a, s) => a + s.qty * s.price, 0);
            const last = lastSeenDays(ws, c.id);
            const isB = c.bday && parseInt(c.bday.split('/')[0]) === today.getDate() && parseInt(c.bday.split('/')[1]) === today.getMonth() + 1;
            return (
              <tr key={c.id} style={isB ? { background: 'var(--amber-50)' } : undefined}>
                <td><div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => setPanel(c)}>
                  <Avatar name={c.name} size={32} /><strong>{c.name}{isB ? ' 🎂' : ''}</strong>
                </div></td>
                <td>{c.phone || '—'}</td>
                <td><Badge>{c.source || '—'}</Badge></td>
                <td><Badge tone={c.type === 'VIP' ? 'amber' : c.type === 'Wholesale' ? 'indigo' : 'green'}>{c.type}</Badge></td>
                <td>{c.bday || '—'}</td>
                <td className="num tnum">{orders}</td>
                <td className="num tnum"><strong>{money(spent)}</strong></td>
                <td>{last < 0 ? 'Never' : last === 0 ? 'Today' : last + 'd ago'}</td>
                <td><div className="row-actions">
                  <a className="btn btn-wa btn-icon" href={waLink(c.wa || c.phone)} target="_blank" rel="noreferrer" aria-label="WhatsApp"><MessageCircle /></a>
                  <button className="btn btn-secondary btn-icon" onClick={() => setPanel(c)} aria-label="View"><Eye /></button>
                  {can('edit_customers') && <button className="btn btn-secondary btn-icon" onClick={() => { setEditing(c); setForm(true); }} aria-label="Edit"><Pencil /></button>}
                  {isOwner && <button className="btn btn-danger btn-icon" onClick={() => remove(c.id, c.name)} aria-label="Delete"><Trash2 /></button>}
                </div></td>
              </tr>
            );
          })}
        </TableWrap>
      ) : (
        <EmptyState icon={Users} title={ws.customers.length ? 'No matches' : 'No customers yet'}
          text={ws.customers.length ? 'Try a different search.' : 'Add your first customer to start tracking follow-ups.'}
          action={can('add_customers') ? <button className="btn btn-primary" onClick={() => { setEditing(null); setForm(true); }}><Plus />Add Customer</button> : null} />
      )}

      {panel && (() => {
        const cs = ws.sales.filter(s => s.custId === panel.id).sort((a, b) => +new Date(b.date) - +new Date(a.date));
        const spent = cs.reduce((a, s) => a + s.qty * s.price, 0);
        const orderMap: Record<string, typeof cs> = {};
        cs.forEach(s => { const k = s.orderId || s.id; (orderMap[k] ||= []).push(s); });
        const orders = Object.values(orderMap);
        const prefs = (panel.scent || '').toLowerCase().split(',').map(s => s.trim()).filter(Boolean);
        const suggested = ws.products.filter(p =>
          prefs.some(pr => p.name.toLowerCase().includes(pr) || (p.cat || '').toLowerCase().includes(pr)) &&
          !cs.some(s => s.prodId === p.id)).slice(0, 4);
        const last = lastSeenDays(ws, panel.id);
        return (
          <div className="side-panel open">
            <button className="icon-btn panel-close" onClick={() => setPanel(null)} aria-label="Close"><X /></button>
            <Avatar name={panel.name} tone="indigo" size={56} />
            <h3 className="font-display" style={{ fontSize: '1.3rem', fontWeight: 800, margin: '12px 0 2px' }}>{panel.name}{panel.type === 'VIP' ? ' 👑' : ''}</h3>
            <p className="hint">{panel.phone} · {panel.city || '—'}</p>
            <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
              <a className="btn btn-wa btn-sm" href={waLink(panel.wa || panel.phone)} target="_blank" rel="noreferrer"><MessageCircle />Chat</a>
              <a className="btn btn-secondary btn-sm" href={'tel:' + panel.phone}><Phone />Call</a>
              {can('edit_customers') && <button className="btn btn-primary btn-sm" onClick={() => { setEditing(panel); setPanel(null); setForm(true); }}><Pencil />Edit</button>}
            </div>
            <div className="panel-sec">
              <div className="panel-sec-title">Stats</div>
              <div className="panel-stat"><span>Orders</span><strong>{orders.length}</strong></div>
              <div className="panel-stat"><span>Total spent</span><strong className="tnum">{money(spent)}</strong></div>
              <div className="panel-stat"><span>Last seen</span><strong>{last < 0 ? 'Never' : last === 0 ? 'Today' : last + ' days ago'}</strong></div>
              <div className="panel-stat"><span>Birthday</span><strong>{panel.bday || '—'}</strong></div>
              <div className="panel-stat" style={{ border: 'none' }}><span>Scent prefs</span><strong style={{ fontSize: '.8rem', textAlign: 'right' }}>{panel.scent || '—'}</strong></div>
            </div>
            {!!suggested.length && (
              <div className="panel-sec">
                <div className="panel-sec-title">Suggest next purchase</div>
                {suggested.map(p => <span className="chip" key={p.id}>{p.name} · {money(p.price)}</span>)}
              </div>
            )}
            <div className="panel-sec">
              <div className="panel-sec-title">Purchase history</div>
              {orders.length ? orders.slice(0, 8).map((lines, i) => (
                <div key={i} style={{ padding: '10px 0', borderBottom: '1px solid var(--divider)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                    <strong style={{ fontSize: '.82rem' }}>{lines.map(l => l.prodName).join(', ')}</strong>
                    <span className="tnum" style={{ fontWeight: 700 }}>{money(lines.reduce((a, l) => a + l.qty * l.price, 0))}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
                    <span className="hint">{fmtDate(lines[0].date)}</span>
                    <Badge tone={lines[0].status === 'Paid' ? 'green' : 'amber'}>{lines[0].status}</Badge>
                  </div>
                </div>
              )) : <p className="hint">No purchases yet</p>}
            </div>
          </div>
        );
      })()}

      <CustomerForm open={form} onClose={() => setForm(false)} editing={editing} />
      <ImportModal open={importOpen} onClose={() => setImportOpen(false)} kind="customers" />
    </>
  );
}
