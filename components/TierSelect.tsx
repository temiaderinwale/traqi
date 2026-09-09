'use client';
/* Traqi — account tier picker.

   Shown once between registration and onboarding, and again inside Settings
   whenever the owner wants to move tier. The same cards serve both, so the
   plan a workspace bought into always looks the way it did when it chose. */

import React, { useState } from 'react';
import { Check, Lock } from 'lucide-react';
import { useTraqi } from '@/lib/store';
import { Mark, Wordmark } from './Brand';
import { Tier, TIER_LIST, TierKey } from '@/lib/tiers';

/* Each card wears its plan's colour from the marketing page: Starter neutral,
   Lite amber/orange, Pro indigo. The two coloured tiers carry the colour as
   their whole surface, so the text on them is tinted rather than themed. */
const SKIN: Record<Tier['key'], { bg: string; fg: string; sub: string; tick: string; mark: string; pill: string }> = {
  starter: {
    bg: 'var(--surface)', fg: 'var(--text)', sub: 'var(--text-2)',
    tick: 'var(--indigo-600)', mark: 'var(--indigo-600)', pill: 'rgba(100,116,139,.16)'
  },
  lite: {
    bg: 'linear-gradient(135deg,#D97706,#F59E0B 55%,#FB923C)', fg: '#451A03', sub: 'rgba(69,26,3,.72)',
    tick: '#451A03', mark: '#451A03', pill: 'rgba(69,26,3,.14)'
  },
  pro: {
    bg: 'linear-gradient(135deg,#4338CA,#4F46E5 55%,#6366F1)', fg: '#FFFFFF', sub: '#C7D2FE',
    tick: '#FBBF24', mark: '#FFFFFF', pill: 'rgba(255,255,255,.16)'
  }
};

export function TierCard({ tier, selected, current, onSelect }: {
  tier: Tier; selected: boolean; current?: boolean; onSelect: () => void;
}) {
  const s = SKIN[tier.key];
  const plain = tier.key === 'starter';
  return (
    <button type="button" onClick={onSelect}
      className={'tier-card' + (selected ? ' on' : '')}
      style={{
        background: s.bg, color: s.fg, borderRadius: '1rem', padding: 20, width: '100%',
        textAlign: 'left', font: 'inherit', cursor: 'pointer',
        border: '1px solid ' + (plain ? 'var(--border)' : 'transparent'),
        outline: selected ? '2px solid ' + (plain ? 'var(--indigo-600)' : s.mark) : 'none',
        outlineOffset: plain ? 0 : -6,
        boxShadow: plain ? '0 1px 2px rgba(15,23,42,.04)' : '0 10px 26px -14px rgba(15,23,42,.5)'
      }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
        <span className="font-display" style={{ fontSize: '1.15rem', fontWeight: 800 }}>{tier.name}</span>
        {tier.key === 'pro' && (
          <span style={{ fontSize: '.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', background: '#F59E0B', color: '#451A03', borderRadius: 99, padding: '2px 8px' }}>
            Best value
          </span>
        )}
        {current && (
          <span style={{ fontSize: '.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', background: s.pill, color: s.fg, borderRadius: 99, padding: '2px 8px' }}>
            Current
          </span>
        )}
        <span style={{ marginLeft: 'auto', width: 20, height: 20, borderRadius: 99, display: 'grid', placeItems: 'center', flexShrink: 0, border: '2px solid ' + (selected ? s.mark : plain ? 'var(--border)' : s.pill), background: selected ? s.mark : 'transparent' }}>
          {selected && <Check style={{ width: 12, height: 12, color: plain ? '#fff' : s.bg.startsWith('linear') ? (tier.key === 'pro' ? '#4F46E5' : '#F59E0B') : '#fff' }} />}
        </span>
      </div>
      <p style={{ margin: '0 0 10px', fontSize: '.78rem', color: s.sub }}>{tier.tagline}</p>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
        <span className="font-display" style={{ fontSize: '1.5rem', fontWeight: 800 }}>{tier.price}</span>
        <span style={{ fontSize: '.7rem', color: s.sub }}>{tier.priceNote}</span>
      </div>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 7 }}>
        {tier.includes.map(f => (
          <li key={f} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: '.8rem' }}>
            <Check style={{ width: 14, height: 14, flexShrink: 0, marginTop: 2, color: s.tick }} />{f}
          </li>
        ))}
      </ul>
    </button>
  );
}

/** The three cards, wired to a value. Used by the sign-up gate and Settings. */
export function TierCards({ value, onChange }: { value: TierKey | ''; onChange: (t: TierKey) => void }) {
  const { plan } = useTraqi();
  return (
    <div className="three-col" style={{ gap: 14 }}>
      {TIER_LIST.map(t => (
        <TierCard key={t.key} tier={t} selected={value === t.key} current={plan === t.key} onSelect={() => onChange(t.key)} />
      ))}
    </div>
  );
}

/** Full-screen gate shown at stage 'plan' — after sign-up, before onboarding. */
export default function TierSelect() {
  const { choosePlan, logout } = useTraqi();
  const [picked, setPicked] = useState<TierKey>('starter');

  return (
    <div className="full-overlay open">
      <div className="modal wide" style={{ maxWidth: 940 }}>
        <div style={{ textAlign: 'center', marginBottom: 22 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 16, fontSize: '1.7rem' }}>
            <Mark dark={false} size={40} />
            <Wordmark className="" />
          </span>
          <h3 className="font-display" style={{ fontSize: '1.45rem', fontWeight: 800, margin: '0 0 6px' }}>Choose your plan</h3>
          <p className="hint" style={{ maxWidth: '32rem', margin: '0 auto', lineHeight: 1.6 }}>
            Select the plan that matches how you work, and you can upgrade your account type any time in Settings.
          </p>
        </div>

        <TierCards value={picked} onChange={setPicked} />

        <p className="hint" style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginTop: 16, lineHeight: 1.6 }}>
          <Lock style={{ width: 14, height: 14, flexShrink: 0, marginTop: 2 }} />
          Features outside your plan stay locked until you upgrade — nothing you record is ever deleted when you move between plans.
        </p>

        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={logout}>Sign out</button>
          <button className="btn btn-primary" onClick={() => choosePlan(picked)}>
            Continue on {TIER_LIST.find(t => t.key === picked)?.name}
          </button>
        </div>
      </div>
    </div>
  );
}
