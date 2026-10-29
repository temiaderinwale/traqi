'use client';
/* Traqi — dropdowns.

   Every list that drops down in the app comes from here, so they all behave
   the same way on a phone and on a desktop:

   · The list is drawn in a layer of its own above the page (a portal), never
     inside the form it belongs to — a modal's scroll box or a table's
     sideways scroll can't cut it off or bury it below the fold.
   · It opens downward when there is room for at least three rows, upward when
     there is more room above, and if neither side has that much the field is
     first scrolled towards the middle of the screen so there is.
   · It follows its field while anything scrolls and when a phone keyboard
     opens or closes.

   OptionSelect is the plain picker (with a search box once the list is long),
   MultiSelect picks several, and ComboBox is a typed search field whose
   results drop down under it. */

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Search } from 'lucide-react';
import { smartFilter } from '@/lib/search';

/* Roughly three rows — the least a list should ever show when it opens. */
const ROOM = 172;
const GAP = 4;
const EDGE = 8;

/* Layout effects only mean something in the browser. */
const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/** The nearest box that actually scrolls — a modal body, usually. */
function scrollParent(el: HTMLElement): HTMLElement | null {
  let p = el.parentElement;
  while (p && p !== document.body) {
    const oy = getComputedStyle(p).overflowY;
    if ((oy === 'auto' || oy === 'scroll') && p.scrollHeight > p.clientHeight + 1) return p;
    p = p.parentElement;
  }
  return null;
}

/** Scrolls the field up into the top part of the visible area, leaving the
    room under it for the list that is about to open. */
function bringIntoRoom(el: HTMLElement, viewTop: number, viewBottom: number) {
  const r = el.getBoundingClientRect();
  const delta = r.top - (viewTop + (viewBottom - viewTop) * 0.28);
  if (Math.abs(delta) < 4) return;
  const sp = scrollParent(el);
  if (sp) sp.scrollBy({ top: delta, behavior: 'smooth' });
  else window.scrollBy({ top: delta, behavior: 'smooth' });
}

const isTouch = () => typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: coarse)').matches;

/** Where a dropdown sits against its anchor, in viewport coordinates. */
export function useFloatingPanel(anchor: React.RefObject<HTMLElement>, open: boolean, want = 300, minWidth = 0) {
  const [style, setStyle] = useState<React.CSSProperties | null>(null);

  const place = useCallback(() => {
    const el = anchor.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const vv = window.visualViewport;
    /* The visible strip — on a phone with the keyboard up, much less than innerHeight. */
    const viewTop = vv ? vv.offsetTop : 0;
    const viewBottom = vv ? vv.offsetTop + vv.height : window.innerHeight;
    const below = viewBottom - r.bottom - GAP - EDGE;
    const above = r.top - viewTop - GAP - EDGE;
    const up = below < Math.min(want, ROOM) && above > below;
    const room = up ? above : below;
    const vw = document.documentElement.clientWidth || window.innerWidth;
    const width = Math.min(Math.max(r.width, minWidth), vw - EDGE * 2);
    const left = Math.max(EDGE, Math.min(r.left, vw - width - EDGE));
    setStyle({
      left, width,
      maxHeight: Math.max(120, Math.min(want, room)),
      ...(up
        ? { top: 'auto', bottom: window.innerHeight - r.top + GAP }
        : { top: r.bottom + GAP, bottom: 'auto' })
    });
  }, [anchor, want, minWidth]);

  useIsoLayoutEffect(() => {
    if (!open) { setStyle(null); return; }
    const el = anchor.current;
    if (el) {
      /* Too little room under the field: scroll the form so the list opens
         downward with rows to see. Only when there is plenty of room above
         as well does it simply open upward instead. */
      const r = el.getBoundingClientRect();
      const vv = window.visualViewport;
      const viewTop = vv ? vv.offsetTop : 0;
      const viewBottom = vv ? vv.offsetTop + vv.height : window.innerHeight;
      if (viewBottom - r.bottom < ROOM && r.top - viewTop < Math.min(want, 280)) bringIntoRoom(el, viewTop, viewBottom);
    }
    place();
    const vv = window.visualViewport;
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    vv?.addEventListener('resize', place);
    vv?.addEventListener('scroll', place);
    return () => {
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
      vv?.removeEventListener('resize', place);
      vv?.removeEventListener('scroll', place);
    };
  }, [open, place, anchor, want]);

  return style;
}

/** The list layer itself. Pressing inside it never steals focus from the
    field it belongs to — so a typed search keeps its keyboard — except on an
    input inside the panel, which has to be able to take focus. */
export function FloatingPanel({ anchor, open, children, className = '', want, minWidth, panelRef, role, id }: {
  anchor: React.RefObject<HTMLElement>;
  open: boolean;
  children: React.ReactNode;
  className?: string;
  want?: number;
  minWidth?: number;
  panelRef?: React.Ref<HTMLDivElement>;
  role?: string;
  id?: string;
}) {
  const style = useFloatingPanel(anchor, open, want, minWidth);
  if (!open || typeof document === 'undefined') return null;
  return createPortal(
    <div ref={panelRef} id={id} role={role} className={'ss-drop open float-drop ' + className}
      style={style || { visibility: 'hidden' }}
      onMouseDown={e => { if (!(e.target as HTMLElement).closest('input,textarea')) e.preventDefault(); }}>
      {children}
    </div>,
    document.body
  );
}

/** Closes on a press outside both the trigger and the list, or on Escape. */
export function useDismiss(open: boolean, close: () => void, refs: React.RefObject<HTMLElement>[]) {
  const refsRef = useRef(refs);
  refsRef.current = refs;
  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent | TouchEvent) => {
      const t = e.target as Node;
      if (refsRef.current.some(r => r.current && r.current.contains(t))) return;
      close();
    };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    document.addEventListener('mousedown', away);
    document.addEventListener('touchstart', away, { passive: true });
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', away);
      document.removeEventListener('touchstart', away);
      document.removeEventListener('keydown', esc);
    };
  }, [open, close]);
}

/* Keeps the highlighted row in sight while arrowing through a long list. */
function useActiveScroll(panel: React.RefObject<HTMLDivElement>, active: number) {
  useEffect(() => {
    const row = panel.current?.querySelector<HTMLElement>(`[data-row="${active}"]`);
    row?.scrollIntoView({ block: 'nearest' });
  }, [panel, active]);
}

export type Option = {
  value: string;
  label?: string;
  sub?: string;
  /** Extra words the search should find this option by (a phone number, say). */
  keywords?: string;
  /** Something small drawn after the name — a badge or a mark. */
  mark?: React.ReactNode;
};

/** A single choice from a list. `allLabel` adds a first row meaning "no
    filter" (value ''); otherwise `placeholder` shows until something is
    picked. The list grows a search box once it is long enough to need one. */
export function OptionSelect({
  value, onChange, options, allLabel, placeholder = 'Select…', icon: Icon, search,
  searchPlaceholder = 'Search…', id, invalid, size, disabled, emptyText = 'Nothing matches', triggerClassName
}: {
  value: string;
  onChange: (v: string) => void;
  options: Option[];
  allLabel?: string;
  placeholder?: string;
  icon?: React.ComponentType;
  search?: boolean;
  searchPlaceholder?: string;
  id?: string;
  invalid?: boolean;
  size?: 'sm';
  disabled?: boolean;
  emptyText?: string;
  /** Replaces the app's own field look — for pages with styling of their own. */
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(open, close, [trigger as React.RefObject<HTMLElement>, panel as React.RefObject<HTMLElement>]);

  const searchable = search ?? options.length > 8;
  const rows = useMemo(() => {
    const all = allLabel !== undefined ? [{ value: '', label: allLabel } as Option] : [];
    const list = searchable && q.trim()
      ? smartFilter(options, q, o => `${o.label || o.value} ${o.sub || ''} ${o.keywords || ''}`)
      : options;
    return q.trim() ? list : [...all, ...list];
  }, [options, allLabel, searchable, q]);

  useEffect(() => {
    if (!open) { setQ(''); return; }
    const at = rows.findIndex(o => o.value === value);
    setActive(at < 0 ? 0 : at);
    /* On a phone the keyboard would cover the very list being opened — the
       search box is a tap away instead. */
    if (searchable && !isTouch()) setTimeout(() => input.current?.focus(), 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  useEffect(() => { if (q) setActive(0); }, [q]);
  useActiveScroll(panel, active);

  const pick = (v: string) => { onChange(v); setOpen(false); trigger.current?.focus(); };
  const current = options.find(o => o.value === value);
  const shown = current ? current.label || current.value : value && allLabel === undefined ? value : allLabel ?? '';

  const keys = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); if (!open) setOpen(true); else setActive(a => Math.min(rows.length - 1, a + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(0, a - 1)); }
    else if (e.key === 'Enter' && open) { e.preventDefault(); if (rows[active]) pick(rows[active].value); }
    else if (e.key === 'Escape' && open) { e.preventDefault(); setOpen(false); }
  };

  return (
    <div className="ss-wrap">
      <button type="button" ref={trigger} id={id} disabled={disabled}
        className={triggerClassName
          ? 'cat-trigger-bare ' + triggerClassName
          : 'cat-trigger' + (size === 'sm' ? ' sm' : '') + (invalid ? ' invalid' : '')}
        aria-invalid={invalid || undefined} data-invalid={invalid ? 'true' : undefined}
        aria-haspopup="listbox" aria-expanded={open}
        onClick={() => setOpen(o => !o)} onKeyDown={keys}>
        <span className={shown ? 'cat-value' : 'cat-value cat-placeholder'}>{shown || placeholder}</span>
        <ChevronDown className={'cat-caret' + (open ? ' up' : '')} />
      </button>
      <FloatingPanel anchor={trigger} open={open} panelRef={panel} role="listbox" className="cat-drop" minWidth={size === 'sm' ? 180 : 0}>
        {searchable && (
          <div className="cat-search">
            <Search />
            <input ref={input} value={q} onChange={e => setQ(e.target.value)} placeholder={searchPlaceholder} onKeyDown={keys} />
          </div>
        )}
        {rows.length ? rows.map((o, i) => (
          <div key={o.value || '__all'} data-row={i} role="option" aria-selected={o.value === value}
            className={'ss-opt cat-opt' + (o.value === value ? ' on' : '') + (i === active ? ' hl' : '')}
            onMouseEnter={() => setActive(i)} onClick={() => pick(o.value)}>
            {Icon && <Icon />}
            <span className="cat-opt-text">
              <span className="ss-name">{o.label || o.value}{o.mark}</span>
              {o.sub && <span className="ss-sub">{o.sub}</span>}
            </span>
            {o.value === value && <Check className="cat-check" />}
          </div>
        )) : <div className="ss-opt ss-none">{emptyText} “{q.trim()}”</div>}
      </FloatingPanel>
    </div>
  );
}

/** Several choices from one list — ticks stay open until the person is done. */
export function MultiSelect({ values, onChange, options, placeholder = 'Select…', icon: Icon, searchPlaceholder = 'Search…' }: {
  values: string[];
  onChange: (v: string[]) => void;
  options: Option[];
  placeholder?: string;
  icon?: React.ComponentType;
  searchPlaceholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(open, close, [trigger as React.RefObject<HTMLElement>, panel as React.RefObject<HTMLElement>]);
  useEffect(() => { if (!open) setQ(''); }, [open]);

  const searchable = options.length > 8;
  const rows = searchable ? smartFilter(options, q, o => `${o.label || o.value} ${o.sub || ''}`) : options;
  const toggle = (v: string) => onChange(values.includes(v) ? values.filter(x => x !== v) : [...values, v]);
  const names = options.filter(o => values.includes(o.value)).map(o => o.label || o.value);
  const allOn = options.length > 0 && options.every(o => values.includes(o.value));

  return (
    <div className="ss-wrap">
      <button type="button" ref={trigger} className="cat-trigger" aria-haspopup="listbox" aria-expanded={open}
        onClick={() => setOpen(o => !o)}>
        <span className={names.length ? 'cat-value' : 'cat-value cat-placeholder'}>
          {names.length ? (names.length > 2 ? `${names.slice(0, 2).join(', ')} +${names.length - 2}` : names.join(', ')) : placeholder}
        </span>
        <ChevronDown className={'cat-caret' + (open ? ' up' : '')} />
      </button>
      <FloatingPanel anchor={trigger} open={open} panelRef={panel} role="listbox" className="cat-drop">
        {searchable && (
          <div className="cat-search">
            <Search />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder={searchPlaceholder} />
          </div>
        )}
        {options.length > 1 && !q && (
          <div className="ss-opt cat-opt multi-all" onClick={() => onChange(allOn ? [] : options.map(o => o.value))}>
            <span className={'tick' + (allOn ? ' on' : '')}>{allOn && <Check />}</span>
            <span className="ss-name">{allOn ? 'Clear all' : 'Select all'}</span>
          </div>
        )}
        {rows.length ? rows.map(o => {
          const on = values.includes(o.value);
          return (
            <div key={o.value} role="option" aria-selected={on} className={'ss-opt cat-opt' + (on ? ' on' : '')} onClick={() => toggle(o.value)}>
              <span className={'tick' + (on ? ' on' : '')}>{on && <Check />}</span>
              {Icon && <Icon />}
              <span className="cat-opt-text">
                <span className="ss-name">{o.label || o.value}</span>
                {o.sub && <span className="ss-sub">{o.sub}</span>}
              </span>
            </div>
          );
        }) : <div className="ss-opt ss-none">{options.length ? `Nothing matches “${q.trim()}”` : 'Nothing to choose from yet'}</div>}
        <div className="multi-done"><button type="button" className="btn btn-primary btn-sm" onClick={() => setOpen(false)}>Done</button></div>
      </FloatingPanel>
    </div>
  );
}

export type ComboRow = { key: string; pick: () => void; content: React.ReactNode; className?: string };

/** A search field whose results drop down under it — for long lists, like
    customers and products, where typing is the fastest way in. */
export function ComboBox({ text, onText, rows, placeholder, empty, header, want = 320, minWidth = 260, onOpen }: {
  text: string;
  onText: (v: string) => void;
  rows: ComboRow[];
  placeholder?: string;
  empty?: React.ReactNode;
  /** Drawn above the results — a note on what is shown first, say. */
  header?: React.ReactNode;
  want?: number;
  minWidth?: number;
  onOpen?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const wrap = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(open, close, [wrap as React.RefObject<HTMLElement>, panel as React.RefObject<HTMLElement>]);
  useEffect(() => { setActive(0); }, [text]);
  useActiveScroll(panel, active);

  const show = () => { if (!open) { setOpen(true); onOpen?.(); } };
  const pick = (r: ComboRow) => { r.pick(); setOpen(false); };

  return (
    <div className="ss-wrap" ref={wrap}>
      <div className="combo-field">
        <Search />
        <input value={text} placeholder={placeholder} autoComplete="off"
          onChange={e => { onText(e.target.value); show(); }}
          onFocus={show} onClick={show}
          onBlur={() => setTimeout(() => {
            if (!panel.current?.contains(document.activeElement)) setOpen(false);
          }, 150)}
          onKeyDown={e => {
            if (e.key === 'ArrowDown') { e.preventDefault(); show(); setActive(a => Math.min(rows.length - 1, a + 1)); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(0, a - 1)); }
            else if (e.key === 'Enter' && open && rows[active]) { e.preventDefault(); pick(rows[active]); }
            else if (e.key === 'Escape') setOpen(false);
          }} />
      </div>
      <FloatingPanel anchor={wrap} open={open} panelRef={panel} role="listbox" want={want} minWidth={minWidth}>
        {header}
        {rows.length ? rows.map((r, i) => (
          <div key={r.key} data-row={i} role="option" aria-selected={i === active}
            className={'ss-opt' + (i === active ? ' hl' : '') + (r.className ? ' ' + r.className : '')}
            onMouseEnter={() => setActive(i)} onMouseDown={e => { e.preventDefault(); pick(r); }}>
            {r.content}
          </div>
        )) : <div className="ss-opt ss-none">{empty || 'No results found'}</div>}
      </FloatingPanel>
    </div>
  );
}
