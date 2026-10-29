'use client';
import React, { useState } from 'react';
import { Clipboard, MessageCircle } from 'lucide-react';
import { useTraqi, useMoney } from '@/lib/store';
import { PageHead, Card, Badge } from '@/components/ui';
import { OptionSelect } from '@/components/Dropdown';

const TEMPLATES = [
  { tag: 'Follow-Up', text: "Hi [Name]!\n\nIt's been about [X] days since you got your *[Product]* from us.\n\nAre you running low? Reply to reorder!\n\n— [Business Name]" },
  { tag: 'Birthday', text: "Happy Birthday [Name]! 🎉\n\nEnjoy [X]% OFF your next order this week.\n\nCode: *BDAY[Name]*\n\n— [Business Name]" },
  { tag: 'Payment Reminder', text: "Hi [Name],\n\nGentle reminder — outstanding balance of *[Amount]* for your [Product] order.\n\nThank you!\n— [Business Name]" },
  { tag: 'VIP Appreciation', text: "Hi [Name],\n\nThank you for being amazing!\n\nAs a VIP you get early access to new arrivals.\n\nReply to order first!\n— [Business Name]" },
  { tag: 'New Arrival', text: "Hey [Name]!\n\nOur new *[Product]* just arrived.\n\nReply \"I WANT\" to order. Limited stock!\n\n— [Business Name]" },
  { tag: 'Order Confirmed', text: "Hi [Name]!\n\nYour order is confirmed:\n[Product] x [Qty]\nTotal: [Amount]\n\nThank you!\n— [Business Name]" },
  { tag: 'Promo / Sale', text: "SALE ALERT!\n\nHi [Name]!\n\n[X]% OFF selected fragrances this week only.\n\n— [Business Name]" }
];

export default function TemplatesPage() {
  const { ws, showToast } = useTraqi();
  const money = useMoney();
  const [filled, setFilled] = useState<Record<number, string>>({});

  const fill = (i: number, custId: string) => {
    if (!custId) return;
    const c = ws.customers.find(x => x.id === custId);
    if (!c) return;
    const sales = ws.sales.filter(s => s.custId === custId).sort((a, b) => +new Date(b.date) - +new Date(a.date));
    const last = sales[0];
    const text = TEMPLATES[i].text
      .replace(/\[Name\]/g, (c.name || '').split(' ')[0] || '[Name]')
      .replace(/\[Product\]/g, last ? last.prodName : '[Product]')
      .replace(/\[Amount\]/g, last ? money(last.qty * last.price) : '[Amount]')
      .replace(/\[Qty\]/g, last ? String(last.qty) : '[Qty]')
      .replace(/\[Business Name\]/g, ws.config.bizName || 'Traqi');
    setFilled(f => ({ ...f, [i]: text }));
    showToast('Filled for ' + c.name);
  };
  const copy = async (i: number) => {
    try { await navigator.clipboard.writeText(filled[i] || TEMPLATES[i].text); showToast('Copied to clipboard'); } catch { showToast('Copy failed'); }
  };

  return (
    <>
      <PageHead sub="Fill in a customer and send in two taps" />
      <div className="two-col">
        {TEMPLATES.map((t, i) => (
          <Card key={t.tag}>
            <Badge tone="indigo">{t.tag}</Badge>
            <div className="tpl-box" style={{ marginTop: 10 }}>{filled[i] || t.text}</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <button className="btn btn-primary btn-sm" onClick={() => copy(i)}><Clipboard />Copy</button>
              <a className="btn btn-wa btn-sm" target="_blank" rel="noreferrer"
                href={'https://wa.me/?text=' + encodeURIComponent(filled[i] || t.text)}><MessageCircle />WhatsApp</a>
              <div style={{ minWidth: 170 }}>
                <OptionSelect size="sm" value="" onChange={id => fill(i, id)} placeholder="Fill for customer…"
                  search searchPlaceholder="Search any part of a name…" emptyText="No customer matches"
                  options={ws.customers.map(c => ({ value: c.id, label: c.name, sub: c.phone || undefined, keywords: c.city }))} />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
