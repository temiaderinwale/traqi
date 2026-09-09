'use client';
/* Traqi — the hero showpiece: three slides on a slow auto-advance.

   The order tells the story a landing page needs to tell: someone selling
   with it, the product itself, someone running the business on it. The
   dashboard slide sits in normal flow so it sets the frame's height; the two
   photographs lie over it, so the frame never jumps as slides change.

   Photographs are dropped in at the paths below. Until a file is there, the
   slide falls back to a brand panel that carries the same message — so the
   hero always looks finished, never broken. */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Banknote, Check, Laptop, Smartphone, ShoppingBag } from 'lucide-react';

const SPARK = 'rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm';

type PhotoSlide = {
  src: string;
  alt: string;
  eyebrow: string;
  caption: string;
  icon: typeof Smartphone;
};

const PHOTOS: Record<'mobile' | 'laptop', PhotoSlide> = {
  mobile: {
    src: '/assets/hero-selling.jpg',
    alt: 'A business owner recording a sale on Traqi from her phone in her shop',
    eyebrow: 'Sell from anywhere',
    caption: 'Record the sale and send the receipt before your customer leaves the counter.',
    icon: Smartphone
  },
  laptop: {
    src: '/assets/hero-owner.jpg',
    alt: 'A business owner reviewing his Traqi financial report on a laptop',
    eyebrow: 'Know your numbers',
    caption: 'Revenue, stock and follow-ups in one view — no spreadsheets, no guessing.',
    icon: Laptop
  }
};

/** A photograph over a brand panel.

   The panel is what renders by default and the photograph fades in over it
   once it has actually decoded — rather than the other way round. A missing
   file then costs nothing: no broken-image frame, no flash, and no dependence
   on an error event firing. Drop a file in at the path and it simply appears. */
function Photo({ slide }: { slide: PhotoSlide }) {
  const [loaded, setLoaded] = useState(false);
  const img = useRef<HTMLImageElement>(null);
  const Icon = slide.icon;

  /* A cached or already-decoded image finishes before React attaches onLoad,
     and that event never fires — the photo would sit at opacity 0 forever.
     Ask the element directly on mount, and keep onLoad for the slow path. */
  useEffect(() => {
    const el = img.current;
    if (el?.complete && el.naturalWidth > 0) setLoaded(true);
  }, []);
  return (
    <div className="absolute inset-0">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-700 via-indigo-600 to-indigo-500">
        <div className="mark-pattern" />
        <div className="relative h-full w-full grid place-items-center">
          <Icon className="h-16 w-16 text-white/25" aria-hidden="true" />
        </div>
      </div>
      <img ref={img} src={slide.src} alt={loaded ? slide.alt : ''}
        onLoad={() => setLoaded(true)} onError={() => setLoaded(false)}
        className={'absolute inset-0 h-full w-full object-cover transition-opacity duration-500 '
          + (loaded ? 'opacity-100' : 'opacity-0')}
        decoding="async" />
      {/* Scrim keeps the words readable over any photograph — it has to hold
          up over a bright desk as well as a dark one, so it runs deep. */}
      <div className="absolute inset-x-0 bottom-0 p-5 pt-24 bg-gradient-to-t from-slate-950 via-slate-950/75 to-transparent">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-indigo-200">{slide.eyebrow}</p>
        <p className="text-white font-display font-bold text-lg leading-snug mt-1 text-balance">{slide.caption}</p>
      </div>
    </div>
  );
}

/** The product itself — this slide also sets the height of the frame. */
function DashboardSlide() {
  return (
    <>
      <div className="flex items-center gap-1.5 px-4 py-3 border-b border-slate-100 dark:border-slate-800">
        <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
        <span className="ml-3 text-[11px] text-slate-400 truncate">app.traqi.co/dashboard</span>
      </div>
      <div className="p-5 bg-slate-50 dark:bg-slate-950">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Good morning, Amaka 👋</p>
            <p className="font-display font-bold text-sm mt-0.5">Daily Briefing</p>
          </div>
          <span className="text-[10px] font-semibold bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400 rounded-full px-2.5 py-1">₦ NGN</span>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className={SPARK + ' p-3.5'}>
            <div className="flex items-center gap-2">
              <span className="h-7 w-7 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 grid place-items-center"><Banknote className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" /></span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">Today&apos;s Revenue</span>
            </div>
            <p className="tnum font-display font-extrabold text-lg mt-2">₦128,500</p>
            <p className="text-[10px] text-green-600 font-semibold mt-0.5">▲ 12% from last week</p>
          </div>
          <div className={SPARK + ' p-3.5'}>
            <div className="flex items-center gap-2">
              <span className="h-7 w-7 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 grid place-items-center"><ShoppingBag className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" /></span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">Orders</span>
            </div>
            <p className="tnum font-display font-extrabold text-lg mt-2">24</p>
            <p className="text-[10px] text-green-600 font-semibold mt-0.5">▲ 8% from last week</p>
          </div>
        </div>
        <div className={SPARK + ' p-4 mt-3'}>
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold">Sales this week</p>
            <span className="text-[10px] text-slate-400 tnum">₦742k total</span>
          </div>
          <div className="chart mt-3" style={{ height: 64 }} aria-hidden="true">
            {['38%', '55%', '42%', '70%', '58%', '92%', '47%'].map((h, i) => (
              <div key={i} className="col"><div className={'bar' + (i === 5 ? '' : ' muted')} style={{ height: h }} /></div>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className="text-[10px] text-slate-500 dark:text-slate-400">Follow-ups done</span>
            <div className="flex-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden"><span className="block h-full w-[78%] rounded-full bg-indigo-500" /></div>
            <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 tnum">78%</span>
          </div>
        </div>
      </div>
    </>
  );
}

const LABELS = ['Selling with Traqi', 'The Traqi dashboard', 'Running the business on Traqi'];
const INTERVAL = 5200;

export default function HeroCarousel() {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchX = useRef<number | null>(null);

  const go = useCallback((n: number) => setI(((n % 3) + 3) % 3), []);

  useEffect(() => {
    if (paused) return;
    /* Anyone who has asked for less motion gets a still hero. */
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const t = window.setInterval(() => setI(p => (p + 1) % 3), INTERVAL);
    return () => window.clearInterval(t);
  }, [paused]);

  /* A carousel animating in a background tab is wasted work. */
  useEffect(() => {
    const onVis = () => setPaused(document.hidden);
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  const slideClass = (n: number) =>
    'transition-all duration-700 ease-out ' +
    (i === n ? 'opacity-100 translate-x-0' : 'opacity-0 pointer-events-none ' + (n < i ? '-translate-x-3' : 'translate-x-3'));

  return (
    <div className="rv">
      <div className="relative"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocusCapture={() => setPaused(true)}
        onBlurCapture={() => setPaused(false)}
        onTouchStart={e => { touchX.current = e.touches[0].clientX; }}
        onTouchEnd={e => {
          if (touchX.current === null) return;
          const dx = e.changedTouches[0].clientX - touchX.current;
          if (Math.abs(dx) > 45) go(i + (dx < 0 ? 1 : -1));
          touchX.current = null;
        }}>
        <div className="absolute -inset-6 bg-indigo-100/60 dark:bg-indigo-500/10 rounded-[2.5rem] rotate-2" aria-hidden="true" />

        <div className="relative rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl overflow-hidden"
          role="group" aria-roledescription="carousel" aria-label="Traqi in use">
          {/* In flow, so it sets the height every slide shares. */}
          <div className={slideClass(1)} aria-hidden={i !== 1}>
            <DashboardSlide />
          </div>
          <div className={'absolute inset-0 ' + slideClass(0)} aria-hidden={i !== 0}><Photo slide={PHOTOS.mobile} /></div>
          <div className={'absolute inset-0 ' + slideClass(2)} aria-hidden={i !== 2}><Photo slide={PHOTOS.laptop} /></div>
        </div>

        {/* Decoration, and on a phone that corner belongs to the slide caption
            — so it only appears once there is room for both. */}
        <div className="absolute -right-3 -bottom-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg px-4 py-3 hidden sm:flex items-center gap-3 floaty">
          <span className="h-8 w-8 rounded-full bg-green-50 dark:bg-green-500/10 grid place-items-center"><Check className="h-4 w-4 text-green-600" /></span>
          <div>
            <p className="text-xs font-semibold">Payment received</p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 tnum">₦18,500 · Rose Elixir ×2</p>
          </div>
        </div>
      </div>

      <div className="mt-8 flex items-center gap-2" role="tablist" aria-label="Choose a slide">
        {LABELS.map((label, n) => (
          <button key={label} role="tab" aria-selected={i === n} aria-label={label}
            onClick={() => go(n)}
            className={'h-1.5 rounded-full transition-all duration-500 ' +
              (i === n ? 'w-8 bg-indigo-600 dark:bg-indigo-400' : 'w-3 bg-slate-300 dark:bg-slate-700 hover:bg-slate-400')} />
        ))}
        <span className="sr-only" aria-live="polite">{LABELS[i]}</span>
      </div>
    </div>
  );
}
