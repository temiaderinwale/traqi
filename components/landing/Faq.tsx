'use client';
/* Traqi — landing page FAQ accordion */

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export type FaqItem = { q: string; a: string };

export default function Faq({ items }: { items: FaqItem[] }) {
  const [open, setOpen] = useState(0);
  return (
    <div className="md:col-span-3 divide-y divide-slate-200 dark:divide-slate-800 rv rv-d1">
      {items.map((item, i) => (
        <div key={item.q} className={'acc-item py-5' + (open === i ? ' open' : '')}>
          <button type="button" className="acc-toggle w-full flex items-center justify-between gap-4 text-left font-bold"
            aria-expanded={open === i} onClick={() => setOpen(open === i ? -1 : i)}>
            {item.q}
            <ChevronDown className="acc-chevron h-5 w-5 shrink-0 text-slate-400" />
          </button>
          <div className="acc-panel">
            <div><p className="pt-3 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{item.a}</p></div>
          </div>
        </div>
      ))}
    </div>
  );
}
