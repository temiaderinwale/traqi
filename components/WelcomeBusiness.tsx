'use client';
/* Traqi — the welcome, shown once between choosing a plan and onboarding.

   Three beats. First the curtain: the mark draws itself in, the business is
   named, and the words land in sequence — a moment that says the account is
   real. Then the choice: what kind of business this is, which decides the
   product categories the workspace will speak in from here on. And if none of
   the nine fits, a third beat where the owner names the trade themselves and
   types its categories — those become the workspace's own, so Add Product
   offers something useful from the first product onwards rather than an
   empty list.

   The motion is CSS keyframes with staggered delays, so it costs nothing and
   stands down entirely for anyone who has asked for reduced motion. */

import React, { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Plus, X } from 'lucide-react';
import { useTraqi } from '@/lib/store';
import { INDUSTRIES, IndustryChoice, OTHER_INDUSTRY } from '@/lib/industries';
import IndustryArt from './IndustryArt';
import { Mark, Wordmark } from './Brand';

export default function WelcomeBusiness() {
  const { ws, chooseIndustry } = useTraqi();
  const [phase, setPhase] = useState<'curtain' | 'choose' | 'custom'>('curtain');
  const [picked, setPicked] = useState<IndustryChoice | ''>('');
  const [trade, setTrade] = useState('');
  const [cats, setCats] = useState<string[]>([]);
  const [draft, setDraft] = useState('');
  const biz = ws.config.bizName || 'your business';

  useEffect(() => {
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const t = window.setTimeout(() => setPhase('choose'), reduced ? 0 : 2900);
    return () => window.clearTimeout(t);
  }, []);

  const addCat = () => {
    const clean = draft.trim().replace(/\s+/g, ' ');
    if (!clean) return;
    /* Silently swallow a repeat rather than warning about it — the entry is
       already in the list right below, which says it better than a message. */
    if (!cats.some(c => c.toLowerCase() === clean.toLowerCase())) setCats(prev => [...prev, clean]);
    setDraft('');
  };

  const Brand = () => (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, fontSize: '1.5rem' }}>
      <Mark dark={false} size={34} /><Wordmark className="" />
    </span>
  );

  if (phase === 'curtain') {
    return (
      <div className="wl-curtain" onClick={() => setPhase('choose')}>
        <div className="mark-pattern" />
        <div className="wl-rays" aria-hidden="true" />
        <div className="wl-curtain-inner">
          <span className="wl-mark"><Mark dark size={64} /></span>
          <p className="wl-kicker">Your workspace is ready</p>
          <h1 className="wl-title font-display">
            Welcome to Traqi,<br /><span className="wl-biz">{biz}</span>
          </h1>
          <p className="wl-sub">Track it. Grow it.</p>
          <span className="wl-hint">Setting things up…</span>
        </div>
      </div>
    );
  }

  /* ---------- Naming your own trade ---------- */
  if (phase === 'custom') {
    const ready = !!trade.trim() && cats.length > 0;
    return (
      <div className="wl-choose">
        <div className="wl-choose-inner">
          <header className="wl-head">
            <Brand />
            <h2 className="font-display wl-h2">Tell us about {biz}</h2>
            <p className="hint wl-lede">
              Name the trade in your own words, then list the main kinds of product you sell.
              Those become the categories Traqi offers you when you add a product — and you can
              add more at any time.
            </p>
          </header>

          <div className="wl-form">
            <div className="field">
              {/* .label already uppercases, so this renders as
                  "YOUR TYPE OF BUSINESS". */}
              <label className="label" htmlFor="wl-trade">Your type of business</label>
              <input id="wl-trade" value={trade} maxLength={60} autoFocus
                onChange={e => setTrade(e.target.value)}
                placeholder="e.g. Bakery &amp; Confectionery" />
            </div>

            <div className="field">
              <label className="label" htmlFor="wl-cat">Main product categories</label>
              <div className="wl-catrow">
                <input id="wl-cat" value={draft} maxLength={60}
                  onChange={e => setDraft(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCat(); } }}
                  placeholder="e.g. Bread &amp; Loaves" />
                <button type="button" className="btn btn-secondary" onClick={addCat} disabled={!draft.trim()}>
                  <Plus />Add
                </button>
              </div>
              <span className="hint">Press Enter after each one. Add at least one to continue.</span>

              {!!cats.length && (
                <ul className="wl-chips">
                  {cats.map(c => (
                    <li key={c} className="wl-chip">
                      <span>{c}</span>
                      <button type="button" aria-label={`Remove ${c}`} onClick={() => setCats(prev => prev.filter(x => x !== c))}>
                        <X />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="wl-foot">
            <button className="btn btn-secondary" onClick={() => setPhase('choose')}>
              <ArrowLeft />Back
            </button>
            <p className="hint" style={{ margin: 0 }}>
              {cats.length
                ? `${cats.length} ${cats.length === 1 ? 'category' : 'categories'} will be ready to use.`
                : 'Add your first category to continue.'}
            </p>
            <button className="btn btn-primary" disabled={!ready}
              onClick={() => ready && chooseIndustry(OTHER_INDUSTRY, { name: trade, categories: cats })}>
              Continue<ArrowRight />
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ---------- Choosing the kind of business ---------- */
  const chosen = INDUSTRIES.find(i => i.key === picked);
  return (
    <div className="wl-choose">
      <div className="wl-choose-inner">
        <header className="wl-head">
          <Brand />
          <h2 className="font-display wl-h2">What kind of business is {biz}?</h2>
          <p className="hint wl-lede">
            Pick the one that fits best. Traqi uses it to fill your product categories with the
            things you actually sell — you can always add your own later.
          </p>
        </header>

        <div className="wl-grid">
          {INDUSTRIES.map((ind, n) => (
            <button key={ind.key} type="button"
              className={'wl-card' + (picked === ind.key ? ' on' : '')}
              style={{ animationDelay: 40 * n + 'ms' }}
              onClick={() => setPicked(ind.key)}
              aria-pressed={picked === ind.key}>
              <span className="wl-art"><IndustryArt industry={ind.key} className="h-full w-full" /></span>
              <span className="wl-card-body">
                <span className="wl-card-name">{ind.name}</span>
                <span className="wl-card-tag">{ind.tagline}</span>
              </span>
              <span className="wl-tick" aria-hidden="true"><Check /></span>
            </button>
          ))}

          {/* Last on purpose: the way out for a trade the eight do not cover. */}
          <button type="button"
            className={'wl-card' + (picked === OTHER_INDUSTRY ? ' on' : '')}
            style={{ animationDelay: 40 * INDUSTRIES.length + 'ms' }}
            onClick={() => setPicked(OTHER_INDUSTRY)}
            aria-pressed={picked === OTHER_INDUSTRY}>
            <span className="wl-art"><IndustryArt industry={OTHER_INDUSTRY} className="h-full w-full" /></span>
            <span className="wl-card-body">
              <span className="wl-card-name">Other</span>
              <span className="wl-card-tag">Something else — name your trade and its categories</span>
            </span>
            <span className="wl-tick" aria-hidden="true"><Check /></span>
          </button>
        </div>

        <div className="wl-foot">
          <p className="hint" style={{ margin: 0 }}>
            {picked === OTHER_INDUSTRY
              ? 'Next, name your trade and its categories.'
              : chosen
                ? `${chosen.categories.length} categories will be ready to use.`
                : 'Choose one to continue.'}
          </p>
          <button className="btn btn-primary" disabled={!picked}
            onClick={() => {
              if (picked === OTHER_INDUSTRY) setPhase('custom');
              else if (picked) chooseIndustry(picked);
            }}>
            Continue<ArrowRight />
          </button>
        </div>
      </div>
    </div>
  );
}
