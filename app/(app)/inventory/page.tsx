'use client';
import React, { useState } from 'react';
import { AlertTriangle, Boxes, MessageCircle, Package, Plus } from 'lucide-react';
import { useTraqi, useMoney } from '@/lib/store';
import { getInventory } from '@/lib/compute';
import { waLink } from '@/lib/format';
import { PageHead, TableWrap, EmptyState, Badge, Kpi, KpiGrid, HBar } from '@/components/ui';
import { RestockForm } from '@/components/forms';

export default function InventoryPage() {
  const { ws, can } = useTraqi();
  const money = useMoney();
  const [form, setForm] = useState(false);
  const inv = getInventory(ws);
  const value = inv.reduce((a, i) => a + i.value, 0);
  const low = inv.filter(i => i.status !== 'OK').length;
  return (
    <>
      <PageHead title="Inventory" sub="Live stock across your catalog"
        actions={can('restock') ? <button className="btn btn-primary" onClick={() => setForm(true)}><Plus />Restock</button> : null} />
      <KpiGrid>
        <Kpi icon={Boxes} label="Stock value" value={money(value)} />
        <Kpi icon={Package} label="Products" value={inv.length} />
        <Kpi icon={AlertTriangle} tone={low ? 'amber' : 'green'} label="Need attention" value={low} />
      </KpiGrid>
      {inv.length ? (
        <TableWrap minWidth={860} head={<tr><th>Product</th><th>Category</th><th className="num">Opening</th><th className="num">Sold</th><th className="num">Returned</th><th className="num">Restocked</th><th className="num">Current</th><th>Level</th><th>Status</th><th className="num">Value</th><th /></tr>}>
          {inv.map(i => {
            const pct = Math.max(0, Math.min(100, i.current / Math.max(i.stock || 1, 1) * 100));
            const color = i.status === 'OK' ? 'var(--green-600)' : i.status === 'REORDER NOW' ? 'var(--amber-500)' : 'var(--red-600)';
            const sup = i.supplier ? ws.suppliers.find(s => s.id === i.supplier) : null;
            const msg = sup ? `Hi ${sup.name}, I need to restock ${i.name}. Current stock: ${i.current}. Please advise on availability and pricing. Thank you!` : '';
            return (
              <tr key={i.id}>
                <td><strong>{i.name}</strong></td><td><Badge tone="indigo">{i.cat || '—'}</Badge></td>
                <td className="num tnum">{i.stock || 0}</td><td className="num tnum">{i.sold}</td>
                <td className="num tnum">{i.retQty}</td><td className="num tnum">{i.restocked || 0}</td>
                <td className="num tnum"><strong>{i.current}</strong></td>
                <td style={{ minWidth: 90 }}><HBar pct={pct} color={color} /></td>
                <td><Badge tone={i.status === 'OK' ? 'green' : i.status === 'REORDER NOW' ? 'amber' : 'red'}>
                  {i.status === 'OK' ? 'OK' : i.status === 'REORDER NOW' ? 'Reorder' : 'Out'}</Badge></td>
                <td className="num tnum">{money(i.value)}</td>
                <td><div className="row-actions">
                  {i.status !== 'OK' && sup && (
                    <a className="btn btn-wa btn-sm" target="_blank" rel="noreferrer" href={waLink(sup.wa || sup.phone) + '?text=' + encodeURIComponent(msg)}>
                      <MessageCircle />Reorder
                    </a>
                  )}
                </div></td>
              </tr>
            );
          })}
        </TableWrap>
      ) : <EmptyState icon={Boxes} title="Nothing in stock yet" text="Add products first and their stock appears here." />}
      <RestockForm open={form} onClose={() => setForm(false)} />
    </>
  );
}
