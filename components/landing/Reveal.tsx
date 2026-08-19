'use client';
/* Traqi — reveals every .rv element on the landing page as it scrolls into view.
   The .rv-on flag is added from here, so the page stays fully visible without JS. */

import { useEffect } from 'react';

export default function Reveal() {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add('rv-on');
    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        e.target.classList.add('in');
        obs.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.08 });
    document.querySelectorAll('.rv').forEach(el => io.observe(el));
    return () => { io.disconnect(); root.classList.remove('rv-on'); };
  }, []);
  return null;
}
