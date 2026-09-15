'use client';
import React from 'react';
import { Check, ShieldCheck, X } from 'lucide-react';
import { useTraqi, useMoney } from '@/lib/store';
import { fmtDate } from '@/lib/format';
import { PageHead, EmptyState, Card, Badge } from '@/components/ui';

export default function ApprovalsPage() {
  const { ws, save, log, showToast } = useTraqi();
  const money = useMoney();
  const pending = ws.pending.filter(p => p.status === 'pending');
  const history = ws.pending.filter(p => p.status !== 'pending').slice(-10).reverse();

  const approve = (id: string) => {
    const item = ws.pending.find(p => p.id === id);
    if (!item) return;
    if (item.type === 'add_product') save('products', [...ws.products, item.data]);
    else if (item.type === 'restock') save('products', ws.products.map(p => p.id === item.data.prodId ? { ...p, restocked: (p.restocked || 0) + item.data.qty } : p));
    else if (item.type === 'edit_product') save('products', ws.products.map(p => p.id === item.data.id ? { ...item.data, restocked: p.restocked || 0 } : p));
    save('pending', ws.pending.map(p => (p.id === id ? { ...p, status: 'approved' as const } : p)));
    log('Approved', `${item.label} (by ${item.submitterName})`);
    showToast('Approved: ' + item.label);
  };
  const reject = (id: string) => {
    const item = ws.pending.find(p => p.id === id);
    save('pending', ws.pending.map(p => (p.id === id ? { ...p, status: 'rejected' as const } : p)));
    if (item) { log('Rejected', `${item.label} (by ${item.submitterName})`); showToast('Rejected: ' + item.label); }
  };

  return (
    <>
      <PageHead sub="Sensitive actions waiting on your say-so" />
      {!pending.length && !history.length ? (
        <EmptyState icon={ShieldCheck} title="Nothing to approve" text="When assistants add products or restock, requests appear here." />
      ) : (
        <>
          {!!pending.length && (
            <>
              <h3 className="sec-title" style={{ fontSize: '1rem', marginBottom: 10 }}>Pending <Badge tone="amber">{pending.length}</Badge></h3>
              {pending.map(p => {
                const details: string[] = [];
                if (p.data?.name) details.push('Product: ' + p.data.name);
                if (p.data?.price) details.push('Price: ' + money(p.data.price));
                if (p.data?.qty) details.push('Qty: ' + p.data.qty);
                if (p.data?.prodName) details.push('Item: ' + p.data.prodName);
                return (
                  <Card key={p.id} style={{ borderLeft: '4px solid var(--amber-500)', marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ fontWeight: 700 }}>{p.label}</div>
                        <div className="hint" style={{ marginTop: 3 }}>By {p.submitterName} · {fmtDate(p.ts.slice(0, 10))}</div>
                        {!!details.length && (
                          <div style={{ background: 'var(--surface-2)', borderRadius: '.6rem', padding: '8px 12px', marginTop: 8, fontSize: '.78rem' }}>
                            {details.join(' · ')}
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                        <button className="btn btn-success btn-sm" onClick={() => approve(p.id)}><Check />Approve</button>
                        <button className="btn btn-danger btn-sm" onClick={() => reject(p.id)}><X />Reject</button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </>
          )}
          {!!history.length && (
            <>
              <h3 className="sec-title" style={{ fontSize: '.95rem', margin: '20px 0 10px' }}>Recent history</h3>
              {history.map(p => (
                <Card key={p.id} style={{ borderLeft: `4px solid var(--${p.status === 'approved' ? 'green-600' : 'red-600'})`, marginBottom: 8, opacity: .75, padding: '12px 18px' }}>
                  <div style={{ fontWeight: 600, fontSize: '.85rem' }}>{p.label}</div>
                  <div className="hint" style={{ marginTop: 2 }}>
                    {p.submitterName} · <Badge tone={p.status === 'approved' ? 'green' : 'red'}>{p.status.toUpperCase()}</Badge>
                  </div>
                </Card>
              ))}
            </>
          )}
        </>
      )}
    </>
  );
}
