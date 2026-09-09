'use client';
/* Traqi — choosing a product category.

   These lists run to forty entries, so opening the picker puts the cursor in
   a search box rather than at the top of a long scroll. Directly under it sits
   "Add category", because the list can never quite cover what a particular
   shop sells — a new one is created and selected in the same click. */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Plus, Search, Tag } from 'lucide-react';
import { useTraqi } from '@/lib/store';

export default function CategorySelect({ value, onChange, placeholder = 'Select a category…' }: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const { categories, addCategory, showToast } = useTraqi();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const wrap = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) { setQ(''); return; }
    input.current?.focus();
    const away = (e: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', away);
    return () => document.removeEventListener('mousedown', away);
  }, [open]);

  const needle = q.trim().toLowerCase();
  const shown = useMemo(
    () => (needle ? categories.filter(c => c.toLowerCase().includes(needle)) : categories),
    [categories, needle]
  );
  /* Only offer to create what isn't already there. */
  const exact = categories.some(c => c.toLowerCase() === needle);

  const pick = (c: string) => { onChange(c); setOpen(false); };
  const create = () => {
    const name = addCategory(q);
    if (!name) return;
    onChange(name);
    setOpen(false);
    showToast(`“${name}” added to your categories`);
  };

  return (
    <div className="ss-wrap" ref={wrap}>
      <button type="button" className="cat-trigger" onClick={() => setOpen(o => !o)} aria-expanded={open}>
        <span className={value ? '' : 'cat-placeholder'}>{value || placeholder}</span>
        <ChevronDown className={'cat-caret' + (open ? ' up' : '')} />
      </button>

      {open && (
        <div className="ss-drop open cat-drop">
          <div className="cat-search">
            <Search />
            <input ref={input} value={q} onChange={e => setQ(e.target.value)}
              placeholder="Search categories…"
              onKeyDown={e => {
                if (e.key === 'Escape') setOpen(false);
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (shown.length) pick(shown[0]);
                  else if (needle && !exact) create();
                }
              }} />
          </div>

          {!!needle && !exact && (
            <button type="button" className="ss-opt cat-add" onMouseDown={create}>
              <Plus />
              <span>
                <span className="ss-name">Add “{q.trim()}”</span>
                <span className="ss-sub">Creates a new category for your business</span>
              </span>
            </button>
          )}
          {!needle && (
            <button type="button" className="ss-opt cat-add" onMouseDown={() => input.current?.focus()}>
              <Plus />
              <span>
                <span className="ss-name">Add category</span>
                <span className="ss-sub">Type a name above to create your own</span>
              </span>
            </button>
          )}

          {shown.length ? shown.map(c => (
            <div className={'ss-opt cat-opt' + (c === value ? ' on' : '')} key={c} onMouseDown={() => pick(c)}>
              <Tag />
              <span className="ss-name">{c}</span>
            </div>
          )) : (
            <div className="ss-opt ss-none">No category matches “{q.trim()}”</div>
          )}
        </div>
      )}
    </div>
  );
}
