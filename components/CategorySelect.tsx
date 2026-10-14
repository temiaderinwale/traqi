'use client';
/* Traqi — choosing a product category, or a customer type.

   These lists run to forty entries, so opening the picker puts the cursor in
   a search box rather than at the top of a long scroll. Directly under it sits
   "Add category", because the list can never quite cover what a particular
   shop sells — a new one is created and selected in the same click.

   Customer types are a far shorter list, but the same holds: the four that
   ship are never quite the ones a business thinks in, so the picker is shared. */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Megaphone, Plus, Search, Tag, Users } from 'lucide-react';
import { useTraqi } from '@/lib/store';

type SelectProps = {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
};

function CreatableSelect({ value, onChange, placeholder, options, onCreate, noun, plural, hint, icon: Icon }: SelectProps & {
  options: string[];
  /** Stores the new entry and returns the name it was kept under. */
  onCreate: (name: string) => string;
  noun: string;
  plural: string;
  hint: string;
  icon: React.ComponentType;
}) {
  const { showToast } = useTraqi();
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
    () => (needle ? options.filter(c => c.toLowerCase().includes(needle)) : options),
    [options, needle]
  );
  /* Only offer to create what isn't already there. */
  const exact = options.some(c => c.toLowerCase() === needle);

  const pick = (c: string) => { onChange(c); setOpen(false); };
  const create = () => {
    const name = onCreate(q);
    if (!name) return;
    onChange(name);
    setOpen(false);
    showToast(`“${name}” added to your ${plural}`);
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
              placeholder={`Search ${plural}…`}
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
                <span className="ss-sub">{hint}</span>
              </span>
            </button>
          )}
          {!needle && (
            <button type="button" className="ss-opt cat-add" onMouseDown={() => input.current?.focus()}>
              <Plus />
              <span>
                <span className="ss-name">Add {noun}</span>
                <span className="ss-sub">Type a name above to create your own</span>
              </span>
            </button>
          )}

          {shown.length ? shown.map(c => (
            <div className={'ss-opt cat-opt' + (c === value ? ' on' : '')} key={c} onMouseDown={() => pick(c)}>
              <Icon />
              <span className="ss-name">{c}</span>
            </div>
          )) : (
            <div className="ss-opt ss-none">No {noun} matches “{q.trim()}”</div>
          )}
        </div>
      )}
    </div>
  );
}

/* The same look for a short, fixed list — filters mostly — where there is
   nothing to search and nothing to add. An empty value reads as `allLabel`. */
export function OptionSelect({ value, onChange, options, allLabel, icon: Icon }: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label?: string; sub?: string }[];
  allLabel: string;
  icon?: React.ComponentType;
}) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', away);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', away); document.removeEventListener('keydown', esc); };
  }, [open]);

  const pick = (v: string) => { onChange(v); setOpen(false); };
  const current = options.find(o => o.value === value);
  const rows = [{ value: '', label: allLabel, sub: undefined as string | undefined }, ...options];

  return (
    <div className="ss-wrap" ref={wrap}>
      <button type="button" className="cat-trigger" onClick={() => setOpen(o => !o)} aria-expanded={open}>
        <span>{current ? current.label || current.value : allLabel}</span>
        <ChevronDown className={'cat-caret' + (open ? ' up' : '')} />
      </button>
      {open && (
        <div className="ss-drop open cat-drop">
          {rows.map(o => (
            <div className={'ss-opt cat-opt' + (o.value === value ? ' on' : '')} key={o.value || '__all'} onMouseDown={() => pick(o.value)}>
              {Icon && <Icon />}
              <span>
                <span className="ss-name" style={{ display: 'block' }}>{o.label || o.value}</span>
                {o.sub && <span className="ss-sub" style={{ display: 'block' }}>{o.sub}</span>}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CategorySelect({ value, onChange, placeholder = 'Select a category…' }: SelectProps) {
  const { categories, addCategory } = useTraqi();
  return (
    <CreatableSelect value={value} onChange={onChange} placeholder={placeholder}
      options={categories} onCreate={addCategory} noun="category" plural="categories"
      hint="Creates a new category for your business" icon={Tag} />
  );
}

export function CustomerTypeSelect({ value, onChange, placeholder = 'Select a type…' }: SelectProps) {
  const { customerTypes, addCustomerType } = useTraqi();
  return (
    <CreatableSelect value={value} onChange={onChange} placeholder={placeholder}
      options={customerTypes} onCreate={addCustomerType} noun="type" plural="customer types"
      hint="Creates a new customer type for your business" icon={Users} />
  );
}

export function CustomerSourceSelect({ value, onChange, placeholder = 'Select a source…' }: SelectProps) {
  const { customerSources, addCustomerSource } = useTraqi();
  return (
    <CreatableSelect value={value} onChange={onChange} placeholder={placeholder}
      options={customerSources} onCreate={addCustomerSource} noun="source" plural="customer sources"
      hint="Creates a new customer source for your business" icon={Megaphone} />
  );
}
