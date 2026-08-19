'use client';
import React, { useState } from 'react';
import { MessageCircle, Pencil, Plus, Trash2, Truck } from 'lucide-react';
import { useTraqi } from '@/lib/store';
import { waLink } from '@/lib/format';
import { PageHead, TableWrap, EmptyState } from '@/components/ui';
import { SupplierForm } from '@/components/forms';
import type { Supplier } from '@/lib/types';

export default function SuppliersPage() {
  const { ws, isOwner, save, showToast } = useTraqi();
  const [form, setForm] = useState(false); const [editing, setEditing] = useState<Supplier | null>(null);
  const remove = (id: string, name: string) => {
    const before = ws.suppliers;
    save('suppliers', ws.suppliers.filter(s => s.id !== id));
    showToast(`${name} deleted`, () => save('suppliers', before));
  };
  return (
    <>
      <PageHead title="Suppliers" sub={`${ws.suppliers.length} vendor${ws.suppliers.length === 1 ? '' : 's'}`}
        actions={<button className="btn btn-primary" onClick={() => { setEditing(null); setForm(true); }}><Plus />Add Supplier</button>} />
      {ws.suppliers.length ? (
        <TableWrap minWidth={560} head={<tr><th>Name</th><th>Phone</th><th>Products</th><th>Lead time</th><th /></tr>}>
          {ws.suppliers.map(s => (
            <tr key={s.id}>
              <td><strong>{s.name}</strong></td><td>{s.phone}</td><td>{s.products || '—'}</td><td>{s.leadDays || '—'} days</td>
              <td><div className="row-actions">
                <a className="btn btn-wa btn-sm" href={waLink(s.wa || s.phone)} target="_blank" rel="noreferrer"><MessageCircle />Chat</a>
                <button className="btn btn-secondary btn-icon" onClick={() => { setEditing(s); setForm(true); }} aria-label="Edit"><Pencil /></button>
                {isOwner && <button className="btn btn-danger btn-icon" onClick={() => remove(s.id, s.name)} aria-label="Delete"><Trash2 /></button>}
              </div></td>
            </tr>
          ))}
        </TableWrap>
      ) : (
        <EmptyState icon={Truck} title="No suppliers yet" text="Add vendors to reorder stock with one tap."
          action={<button className="btn btn-primary" onClick={() => { setEditing(null); setForm(true); }}><Plus />Add Supplier</button>} />
      )}
      <SupplierForm open={form} onClose={() => setForm(false)} editing={editing} />
    </>
  );
}
