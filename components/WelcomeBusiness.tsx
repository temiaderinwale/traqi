'use client';
/* Traqi — the welcome, shown once between choosing a plan and onboarding.

   Two beats. First the curtain: the mark draws itself in, the business is
   named, and the words land in sequence — a moment that says the account is
   real. Then the choice: what kind of business this is, which decides the
   product categories the workspace will speak in from here on.

   The motion is CSS keyframes with staggered delays, so it costs nothing and
   stands down entirely for anyone who has asked for reduced motion. */

import React, { useEffect, useState } from 'react';
import { ArrowRight, Check, Sparkles } from 'lucide-react';
import { useTraqi } from '@/lib/store';
import { INDUSTRIES, IndustryKey } from '@/lib/industries';
import IndustryArt from './IndustryArt';
import { Mark, Wordmark } from './Brand';

export default function WelcomeBusiness() {
  const { ws, chooseIndustry } = useTraqi();
  const [phase, setPhase] = useState<'curtain' | 'choose'>('curtain');
  const [picked, setPicked] = useState<IndustryKey | ''>('');
  const biz = ws.config.bizName || 'your business';

  useEffect(() => {
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const t = window.setTimeout(() => setPhase('choose'), reduced ? 0 : 2900);
    return () => window.clearTimeout(t);
  }, []);

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

  return (
    <div className="wl-choose">
      <div className="wl-choose-inner">
        <header className="wl-head">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, fontSize: '1.5rem' }}>
            <Mark dark={false} size={34} /><Wordmark className="" />
          </span>
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
        </div>

        <div className="wl-foot">
          <p className="hint" style={{ margin: 0, display: 'flex', gap: 8, alignItems: 'center' }}>
            <Sparkles style={{ width: 14, height: 14, flexShrink: 0 }} />
            {picked
              ? `${INDUSTRIES.find(i => i.key === picked)!.categories.length} categories will be ready to use.`
              : 'Choose one to continue.'}
          </p>
          <button className="btn btn-primary" disabled={!picked}
            onClick={() => picked && chooseIndustry(picked)}>
            Continue<ArrowRight />
          </button>
        </div>
      </div>
    </div>
  );
}
