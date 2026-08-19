'use client';
/* Traqi — theme toggle shared by the marketing site and the app shell */

import { useEffect, useState } from 'react';

/** Reads the class the inline script in the root layout already applied. */
export function useTheme() {
  const [dark, setDark] = useState(false);
  useEffect(() => { setDark(document.documentElement.classList.contains('dark')); }, []);
  const toggle = () => {
    const next = !document.documentElement.classList.contains('dark');
    document.documentElement.classList.toggle('dark', next);
    try { localStorage.setItem('traqi_theme', next ? 'dark' : 'light'); } catch {}
    setDark(next);
  };
  return { dark, toggle };
}
