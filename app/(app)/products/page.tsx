'use client';
import React, { useState } from 'react';
import { Package, Pencil, Plus, Trash2, Upload } from 'lucide-react';
import { useTraqi, useMoney } from '@/lib/store';
import { useFabAction } from '@/lib/fab';
import { getInventory, productPerformance } from '@/lib/compute';
import { marginClass } from '@/lib/format';
import { PageHead, TableWrap, EmptyState, Badge } from '@/components/ui';
import { ProductForm } from '@/components/forms';
import ImportModal from '@/components/ImportModal';
import type { Product } from '@/lib/types';

export default function ProductsPage() {
  const { ws, isOwner, can, save, showToast } = useTraqi();
  const money = useMoney();
  const [q, setQ] = useState('');
  const [form, setForm] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  useFabAction(() => { setEditing(null); setForm(true); });

  const inv = getInventory(ws).filter(p =>
    !q || p.name.toLowerCase().includes(q.toLowerCase()) || (p.cat || '').toLowerCase().includes(q.toLowerCase()));

  const remove = (id: string, name: string) => {
    const before = ws.products;
    save('products', ws.products.filter(p => p.id !== id));
    showToast(`${name} deleted`, () => save('products', before));
  };

  return (
    <>
      <PageHead title="Products" sub={`${ws.products.length} product${ws.products.length === 1 ? '' : 's'} in your catalog`}
        actions={can('add_products') ? <>
          <button className="btn btn-secondary" onClick={() => setImportOpen(true)}><Upload />Import CSV</button>
          <button className="btn btn-primary" onClick={() => { setEditing(null); setForm(true); }}><Plus />Add Product</button>
        </> : null} />
      <div className="search-row">
        <input className="search-input" placeholder="Search products…" value={q} onChange={e => setQ(e.target.value)} />
      </div>
      {inv.length ? (
        <TableWrap head={
          <tr>
            <th>Product</th><th>Category</th><th>Size</th>
            {isOwner && <th className="num">Cost</th>}<th className="num">Price</th>
            {isOwner && <th className="num">Margin</th>}<th className="num">Stock</th>
            <th>Usage</th><th>Performance</th><th>Status</th><th />
          </tr>}>
          {inv.map(p => {
            const margin = p.price ? Math.round((p.price - p.cost) / p.price * 100) : 0;
            const perf = productPerformance(ws, p.id);
            return (
              <tr key={p.id}>
                <td><strong>{p.name}</strong></td>
                <td><Badge tone="indigo">{p.cat || '—'}</Badge></td>
                <td>{p.size || '—'}</td>
                {isOwner && <td className="num tnum">{money(p.cost)}</td>}
                <td className="num tnum">{money(p.price)}</td>
                {isOwner && <td className={'num tnum ' + marginClass(margin)}>{margin}%</td>}
                <td className="num tnum"><strong>{p.current}</strong></td>
                <td>{p.usageDays || 0}d</td>
                <td><Badge tone={perf === 'best' ? 'green' : perf === 'slow' ? 'amber' : perf === 'new' ? 'blue' : 'slate'}>
                  {perf === 'best' ? 'Best seller' : perf === 'slow' ? 'Slow' : perf === 'new' ? 'New' : 'Steady'}
                </Badge></td>
                <td><Badge tone={p.status === 'OK' ? 'green' : p.status === 'REORDER NOW' ? 'amber' : 'red'}>
                  {p.status === 'OK' ? 'OK' : p.status === 'REORDER NOW' ? 'Reorder' : 'Out'}
                </Badge></td>
                <td><div className="row-actions">
                  {can('edit_products') && <button className="btn btn-secondary btn-icon" onClick={() => { setEditing(p); setForm(true); }} aria-label="Edit"><Pencil /></button>}
                  {isOwner && <button className="btn btn-danger btn-icon" onClick={() => remove(p.id, p.name)} aria-label="Delete"><Trash2 /></button>}
                </div></td>
              </tr>
            );
          })}
        </TableWrap>
      ) : (
        <EmptyState icon={Package} title={ws.products.length ? 'No matches' : 'No products yet'}
          text={ws.products.length ? 'Try a different search term.' : 'Add your first product to get started.'}
          action={can('add_products') ? <button className="btn btn-primary" onClick={() => { setEditing(null); setForm(true); }}><Plus />Add Product</button> : null} />
      )}
      <ProductForm open={form} onClose={() => setForm(false)} editing={editing} />
      <ImportModal open={importOpen} onClose={() => setImportOpen(false)} kind="products" />
    </>
  );
}
