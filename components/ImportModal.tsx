'use client';
/* Traqi — CSV bulk import (products / customers) */

import React, { useMemo, useRef, useState } from 'react';
import { FileSpreadsheet, Upload } from 'lucide-react';
import { useTraqi } from '@/lib/store';
import { nextId } from '@/lib/format';
import { Modal } from './ui';

function parseCSVLine(line: string): string[] {
  const out: string[] = [];
  let cell = '', quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else {
      if (ch === '"') quoted = true;
      else if (ch === ',') { out.push(cell.trim()); cell = ''; }
      else cell += ch;
    }
  }
  out.push(cell.trim());
  return out;
}

export default function ImportModal({ open, onClose, kind }: {
  open: boolean; onClose: () => void; kind: 'products' | 'customers';
}) {
  const { ws, save, log, showToast } = useTraqi();
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const templateUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    const csv = kind === 'products'
      ? 'Name,Category,Size,Cost,Price,UsageDays,Stock,Reorder\nRose Elixir,Eau de Parfum,50ml,3500,8500,30,20,5\nMidnight Oud,Oud,30ml,5000,14500,45,12,3'
      : 'Name,Phone,WhatsApp,City,Type,Birthday,Scent\nAmaka Obi,08012345678,08012345678,Lagos,VIP,14/02,"Oud, rose"\nFatima Suleiman,08098765432,08098765432,Abuja,Regular,03/07,"Citrus, fresh"';
    return URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  }, [kind]);

  const readFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const lines = String(ev.target?.result).replace(/\r\n|\r/g, '\n').split('\n').map(parseCSVLine).filter(r => r.length > 1 && r[0]);
      if (lines.length < 2) { showToast('File needs a header row plus at least one record'); return; }
      const headers = lines[0].map(h => h.toLowerCase().replace(/\s/g, ''));
      setRows(lines.slice(1).map(r => {
        const o: Record<string, string> = {};
        headers.forEach((h, i) => { o[h] = r[i] || ''; });
        return o;
      }));
    };
    reader.readAsText(file);
  };

  const confirm = () => {
    if (!rows.length) return;
    let count = 0, skipped = 0;
    if (kind === 'customers') {
      const phones = ws.customers.map(c => (c.phone || '').replace(/\s/g, ''));
      const added = [...ws.customers];
      rows.forEach(d => {
        const name = d.name || d.fullname || '';
        if (!name) return;
        const phone = (d.phone || '').replace(/\s/g, '');
        if (phone && phones.includes(phone)) { skipped++; return; }
        added.push({
          id: nextId('CUS', added), name, phone: d.phone || '', wa: d.whatsapp || d.phone || '',
          insta: d.instagram || '', city: d.city || d.location || '', source: d.source || '', refby: '',
          type: d.type || 'Regular', bday: d.birthday || d.bday || '', scent: d.scent || d.scentpreferences || '', notes: d.notes || ''
        });
        if (phone) phones.push(phone);
        count++;
      });
      save('customers', added);
    } else {
      const names = ws.products.map(p => p.name.toLowerCase());
      const added = [...ws.products];
      rows.forEach(d => {
        const name = d.name || d.productname || '';
        if (!name || names.includes(name.toLowerCase())) { if (name) skipped++; return; }
        added.push({
          id: nextId('PRF', added), name, cat: d.category || d.cat || 'Other', size: d.size || '',
          cost: parseFloat(d.cost || d.costprice) || 0, price: parseFloat(d.price || d.sellingprice) || 0,
          stock: parseInt(d.stock || d.openingstock) || 0, reorder: parseInt(d.reorder || d.reorderlevel) || 3,
          usageDays: parseInt(d.usagedays || d.usage) || 30, restocked: 0, supplier: '', notes: d.notes || ''
        });
        names.push(name.toLowerCase());
        count++;
      });
      save('products', added);
    }
    log('Bulk import', `${count} ${kind}`);
    showToast(`Imported ${count} ${kind}${skipped ? ` · ${skipped} duplicate(s) skipped` : ''}`);
    setRows([]);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={'Import ' + (kind === 'products' ? 'Products' : 'Customers')} icon={Upload} wide
      actions={<>
        <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        {!!rows.length && <button className="btn btn-primary" onClick={confirm}>Import All</button>}
      </>}>
      <div className="drop-zone" onClick={() => fileRef.current?.click()}>
        <FileSpreadsheet style={{ width: 34, height: 34, color: 'var(--indigo-600)', marginBottom: 8 }} />
        <div style={{ fontSize: '.86rem', fontWeight: 600 }}>Click to select a CSV file</div>
        <div className="hint" style={{ marginTop: 6 }}>
          {kind === 'products'
            ? 'Columns: Name, Category, Size, Cost, Price, UsageDays, Stock, Reorder'
            : 'Columns: Name, Phone, WhatsApp, City, Type, Birthday, Scent'}
          <br />
          <a href={templateUrl} download={kind + '_template.csv'} onClick={e => e.stopPropagation()}
            style={{ color: 'var(--indigo-600)', fontWeight: 700, textDecoration: 'underline' }}>
            Download sample template
          </a>
        </div>
      </div>
      <input ref={fileRef} type="file" accept=".csv,.tsv,.txt" className="hide" onChange={readFile} />
      {!!rows.length && (
        <div style={{ marginTop: 14 }}>
          <p className="hint" style={{ marginBottom: 8 }}><strong>{rows.length}</strong> records found. First few:</p>
          <div style={{ background: 'var(--surface-2)', borderRadius: '.7rem', padding: 12, fontSize: '.8rem', maxHeight: 140, overflowY: 'auto' }}>
            {rows.slice(0, 5).map((r, i) => <div key={i}>{r.name || r.productname || Object.values(r)[0]}</div>)}
          </div>
        </div>
      )}
    </Modal>
  );
}
