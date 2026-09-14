'use client';
/* Traqi — the pilot page showpiece.

   A different animal from the landing hero: that one is a product tour, this
   one has a single job, which is to hold someone's eye while they fill in the
   form beside it. So it is a full-bleed square that never changes height, the
   picture drifts as it sits (a slow Ken Burns), and each slide hands over
   with a different move — chosen at random, so the eye keeps coming back to
   see what it does next.

   Nothing is laid over the photograph itself: the pictures carry their own
   artwork and words, so they are shown whole. The only thing on top is the
   row of dots, in a chip of its own at the foot of the frame.

   The slides are whatever public/assets holds: pilot-image1.jpg,
   pilot-image2.jpg and so on, counted on the server. Drop in a sixth file and
   the carousel is six slides long; nothing here needs touching. */

import { useCallback, useEffect, useRef, useState } from 'react';

const INTERVAL = 4600;

/** How one slide arrives. Each is a CSS animation in globals.css; the next is
    drawn at random from the ones we are not already showing. */
const KINDS = ['fade', 'slide', 'rise', 'zoom', 'wipe', 'iris', 'blur', 'swing'] as const;
type Kind = typeof KINDS[number];

/* Never the same move twice running — partly because repetition is what the
   eye stops noticing, and partly because a changed class is what restarts the
   animation at all. */
const nextKind = (current: Kind): Kind => {
  const rest = KINDS.filter(k => k !== current);
  return rest[Math.floor(Math.random() * rest.length)];
};

type View = { i: number; prev: number; kind: Kind };
type Role = 'in' | 'under' | 'out';

/** One slide: the photograph over a brand panel.

   The panel renders first and the photograph fades in over it once it has
   decoded, so a file that is missing or slow costs nothing — no broken frame,
   no flash of an empty box. */
function Slide({ src, role, kind }: { src: string; role: Role; kind: Kind }) {
  const [loaded, setLoaded] = useState(false);
  const img = useRef<HTMLImageElement>(null);

  /* A cached image finishes decoding before React attaches onLoad and that
     event never fires — ask the element itself on mount. */
  useEffect(() => {
    const el = img.current;
    if (el?.complete && el.naturalWidth > 0) setLoaded(true);
  }, []);

  /* The outgoing slide stays put underneath until the incoming one has
     finished covering it, so a wipe or an iris has something to reveal over
     rather than opening onto an empty frame. */
  const layer = role === 'in' ? 'z-20 pilot-in pilot-in-' + kind
    : role === 'under' ? 'z-10'
      : 'z-0 opacity-0';

  return (
    <div className={'absolute inset-0 ' + layer} aria-hidden={role !== 'in'}>
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-700 via-indigo-600 to-indigo-500">
        <div className="mark-pattern" />
      </div>
      <img ref={img} src={src} alt="" aria-hidden="true"
        onLoad={() => setLoaded(true)} onError={() => setLoaded(false)}
        /* Every slide is inside the frame from the first paint, so none of
           them is worth deferring — a lazy one would show the brand panel for
           a beat the first time its turn came round. */
        decoding="async"
        className={'absolute inset-0 h-full w-full object-cover transition-opacity duration-500 '
          + (loaded ? 'opacity-100 ' : 'opacity-0 ') + (role === 'in' ? 'kenburns' : '')} />
    </div>
  );
}

export default function PilotCarousel({ images }: { images: string[] }) {
  const n = images.length;
  const [view, setView] = useState<View>({ i: 0, prev: -1, kind: 'fade' });
  const [paused, setPaused] = useState(false);
  const [still, setStill] = useState(false);
  const touchX = useRef<number | null>(null);

  const go = useCallback((next: number) => {
    setView(v => {
      if (n < 2) return v;
      const to = ((next % n) + n) % n;
      return to === v.i ? v : { i: to, prev: v.i, kind: nextKind(v.kind) };
    });
  }, [n]);

  /* Anyone who has asked for less motion still gets the slides, but they
     simply appear — nothing drifts, wipes or swings. */
  useEffect(() => {
    setStill(!!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  }, []);

  useEffect(() => {
    if (paused || n < 2) return;
    const t = window.setInterval(
      () => setView(v => ({ i: (v.i + 1) % n, prev: v.i, kind: nextKind(v.kind) })),
      INTERVAL
    );
    return () => window.clearInterval(t);
  }, [paused, n]);

  /* Animating in a background tab is wasted work. */
  useEffect(() => {
    const onVis = () => setPaused(document.hidden);
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  if (!n) return null;

  return (
    <div className="relative">
      {/* Colour bleeding out from behind the frame — what makes the square
          read as a designed object rather than a pasted photograph. */}
      <div aria-hidden="true" className="pointer-events-none absolute -inset-4 sm:-inset-6 rounded-[2.75rem] bg-gradient-to-tr from-indigo-500/25 via-indigo-400/10 to-amber-400/25 blur-2xl" />

      <div
        className="relative aspect-square w-full overflow-hidden rounded-[2rem] border border-white/15 bg-indigo-950 shadow-2xl shadow-indigo-900/25"
        role="group" aria-roledescription="carousel" aria-label="Traqi in use"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onTouchStart={e => { touchX.current = e.touches[0].clientX; }}
        onTouchEnd={e => {
          if (touchX.current === null) return;
          const dx = e.changedTouches[0].clientX - touchX.current;
          if (Math.abs(dx) > 45) go(view.i + (dx < 0 ? 1 : -1));
          touchX.current = null;
        }}>

        {images.map((src, k) => (
          <Slide key={src} src={src}
            role={k === view.i ? 'in' : k === view.prev ? 'under' : 'out'}
            kind={still ? 'fade' : view.kind} />
        ))}

        {/* Taps to choose a slide. They sit in a small chip of their own
            rather than on a band across the picture — enough to stay visible
            over a pale photograph without covering any of it. */}
        <div className="absolute inset-x-0 bottom-4 z-30 flex justify-center" role="tablist" aria-label="Choose a slide">
          <span className="flex items-center gap-2 rounded-full bg-slate-950/35 px-2.5 py-1.5 backdrop-blur-sm">
            {images.map((src, k) => (
              <button key={src} type="button" role="tab" aria-selected={k === view.i} aria-label={`Slide ${k + 1} of ${n}`}
                onClick={() => go(k)}
                className={'h-1.5 rounded-full transition-all duration-500 ' + (k === view.i ? 'w-6 bg-white' : 'w-1.5 bg-white/50 hover:bg-white/80')} />
            ))}
          </span>
        </div>
      </div>
    </div>
  );
}
