'use client';
/* Traqi — choosing a product category, or a customer type.

   These lists run to forty entries, so opening the picker puts a search box
   first rather than leaving the person at the top of a long scroll. Directly
   under it sits "Add category", because the list can never quite cover what a
   particular shop sells — a new one is created and selected in the same click.

   Customer types are a far shorter list, but the same holds: the four that
   ship are never quite the ones a business thinks in, so the picker is shared.
   The list itself drops down through Dropdown.tsx, like every other one. */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Megaphone, Plus, Search, Tag, Users } from 'lucide-react';
import { useTraqi } from '@/lib/store';
import { smartFilter } from '@/lib/search';
import { FloatingPanel, useDismiss } from './Dropdown';

export { OptionSelect } from './Dropdown';

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
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(open, close, [trigger as React.RefObject<HTMLElement>, panel as React.RefObject<HTMLElement>]);

  useEffect(() => {
    if (!open) { setQ(''); return; }
    /* On a phone the keyboard would cover the list being opened — the search
       box is a tap away there instead. */
    const touch = window.matchMedia?.('(pointer: coarse)').matches;
    if (!touch) setTimeout(() => input.current?.focus(), 0);
  }, [open]);

  const needle = q.trim().toLowerCase();
  const shown = useMemo(() => smartFilter(options, q, c => c), [options, q]);
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
    <div className="ss-wrap">
      <button type="button" ref={trigger} className="cat-trigger" onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox" aria-expanded={open}>
        <span className={value ? 'cat-value' : 'cat-value cat-placeholder'}>{value || placeholder}</span>
        <ChevronDown className={'cat-caret' + (open ? ' up' : '')} />
      </button>

      <FloatingPanel anchor={trigger} open={open} panelRef={panel} role="listbox" className="cat-drop">
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
          <button type="button" className="ss-opt cat-add" onClick={create}>
            <Plus />
            <span>
              <span className="ss-name">Add “{q.trim()}”</span>
              <span className="ss-sub">{hint}</span>
            </span>
          </button>
        )}
        {!needle && (
          <button type="button" className="ss-opt cat-add" onClick={() => input.current?.focus()}>
            <Plus />
            <span>
              <span className="ss-name">Add {noun}</span>
              <span className="ss-sub">Type a name above to create your own</span>
            </span>
          </button>
        )}

        {shown.length ? shown.map(c => (
          <div className={'ss-opt cat-opt' + (c === value ? ' on' : '')} key={c} role="option"
            aria-selected={c === value} onClick={() => pick(c)}>
            <Icon />
            <span className="cat-opt-text"><span className="ss-name">{c}</span></span>
            {c === value && <Check className="cat-check" />}
          </div>
        )) : (
          <div className="ss-opt ss-none">No {noun} matches “{q.trim()}”</div>
        )}
      </FloatingPanel>
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
