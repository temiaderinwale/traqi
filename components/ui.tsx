'use client';
/* Traqi — shared UI primitives */

import React from 'react';
import { LucideIcon, X } from 'lucide-react';

/* The module's name is already the topbar heading, and every entry in NAV
   carries the same wording this used to print — so a title here said it twice
   on every page. What is left is the line that actually adds something (the
   subtitle) and the page's actions. The dashboard is the exception and keeps
   its own header, because "Good morning, …" is not the topbar's "Daily
   Briefing" repeated. */
export function PageHead({ sub, actions }: { sub?: string; actions?: React.ReactNode }) {
  return (
    <div className="sec-head" style={{ marginBottom: 18 }}>
      {sub ? <div className="page-lede">{sub}</div> : <span />}
      {actions && <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{actions}</div>}
    </div>
  );
}

export function SectionHead({ title, icon: Icon, right }: { title: string; icon?: LucideIcon; right?: React.ReactNode }) {
  return (
    <div className="sec-head">
      <h2 className="sec-title">{Icon && <Icon />}{title}</h2>
      {right && <div style={{ display: 'flex', gap: 8 }}>{right}</div>}
    </div>
  );
}

export function Kpi({ icon: Icon, tone, label, value, sub, accent }: {
  icon: LucideIcon; tone?: 'green' | 'red' | 'amber'; label: string;
  value: React.ReactNode; sub?: React.ReactNode; accent?: 'green';
}) {
  return (
    <article className={'kpi' + (accent ? ' accent-' + accent : '')}>
      <div className="kpi-head">
        <span className={'kpi-ico ' + (tone || '')}><Icon /></span>
        <span className="kpi-label">{label}</span>
      </div>
      <div className="kpi-value">{value}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </article>
  );
}

export const KpiGrid = ({ children }: { children: React.ReactNode }) => (
  <div className="kpi-grid" style={{ marginBottom: 18 }}>{children}</div>
);

export function Badge({ tone = 'slate', children }: { tone?: 'green' | 'amber' | 'red' | 'indigo' | 'blue' | 'slate'; children: React.ReactNode }) {
  return <span className={'badge badge-' + tone}>{children}</span>;
}

export function Card({ children, pad = true, style, className = '' }: {
  children: React.ReactNode; pad?: boolean; style?: React.CSSProperties; className?: string;
}) {
  return <div className={`card ${pad ? 'card-p' : ''} ${className}`} style={style}>{children}</div>;
}

export function EmptyState({ icon: Icon, title, text, action }: {
  icon: LucideIcon; title: string; text?: string; action?: React.ReactNode;
}) {
  return (
    <div className="card">
      <div className="empty">
        <Icon />
        <h3>{title}</h3>
        {text && <p>{text}</p>}
        {action}
      </div>
    </div>
  );
}

export function TableWrap({ head, children, foot, minWidth = 640 }: {
  head: React.ReactNode; children: React.ReactNode; foot?: React.ReactNode; minWidth?: number;
}) {
  return (
    <div className="table-wrap"><div className="table-scroll">
      <table className="t" style={{ minWidth }}>
        <thead>{head}</thead>
        <tbody>{children}</tbody>
        {foot && <tfoot>{foot}</tfoot>}
      </table>
    </div></div>
  );
}

export function Modal({ open, onClose, title, icon: Icon, wide, xwide, narrow, children, actions }: {
  open: boolean; onClose: () => void; title: string; icon?: LucideIcon;
  wide?: boolean; xwide?: boolean; narrow?: boolean; children: React.ReactNode; actions?: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="modal-overlay open" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={'modal' + (xwide ? ' xwide' : wide ? ' wide' : '') + (narrow ? ' narrow' : '')}>
        <div className="modal-title">{Icon && <Icon />}{title}</div>
        {children}
        {actions && <div className="modal-actions">{actions}</div>}
      </div>
    </div>
  );
}

export function Field({ label, full, children, hint }: {
  label: string; full?: boolean; children: React.ReactNode; hint?: string;
}) {
  return (
    <div className={'field' + (full ? ' full' : '')}>
      <label className="label">{label}</label>
      {children}
      {hint && <span className="hint">{hint}</span>}
    </div>
  );
}

/* ---------- Charts ---------- */
export function BarChart({ data, height = 150 }: {
  data: { label: string; value: number; active?: boolean; display?: string }[]; height?: number;
}) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="chart" style={{ height }}>
      {data.map((d, i) => (
        <div className={'col' + (d.active ? ' on' : '')} key={i}>
          <span className="val">{d.display ?? (d.value ? Math.round(d.value / 1000) + 'k' : '')}</span>
          <div className={'bar' + (d.active ? '' : ' muted')} style={{ height: Math.max(d.value ? 3 : 0, (d.value / max) * 100) + '%' }} />
          <span className="lbl">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

export function HBar({ pct, color }: { pct: number; color?: string }) {
  return <div className="hbar"><span style={{ width: Math.max(0, Math.min(100, pct)) + '%', background: color || 'var(--indigo-600)' }} /></div>;
}

export function Progress({ pct }: { pct: number }) {
  return <div className="progress"><span style={{ width: Math.max(0, Math.min(100, pct)) + '%' }} /></div>;
}

export function Avatar({ name, tone, size = 38 }: { name: string; tone?: 'gold' | 'indigo'; size?: number }) {
  const initials = (name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  return <span className={'avatar ' + (tone || '')} style={{ width: size, height: size }}>{initials}</span>;
}

export function RowCard({ tone, children }: { tone?: 'ok' | 'warn' | 'bad' | 'info'; children: React.ReactNode }) {
  return <div className={'row-card ' + (tone || '')}>{children}</div>;
}

export function CloseButton({ onClick }: { onClick: () => void }) {
  return <button className="icon-btn" onClick={onClick} aria-label="Close"><X /></button>;
}
