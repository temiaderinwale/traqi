'use client';
/* Traqi — landing page navigation: sticky pill bar, theme toggle, mobile sheet.
   The call to action follows the session: signed-in owners go straight to the app. */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Menu, Moon, Sun, X } from 'lucide-react';
import { useTraqi } from '@/lib/store';
import { useTheme } from '@/lib/theme';
import { Mark, Wordmark } from '@/components/Brand';

const LINKS = [
  { href: '#home', label: 'Home' },
  { href: '#features', label: 'Features' },
  { href: '#pricing', label: 'Pricing' },
  { href: '#faq', label: 'FAQ' }
];

/** 'ready' and 'pin' mean a workspace is open; every other stage belongs to /auth.
    `href` is for sign-up calls to action, so it opens /auth on the Register tab;
    plain "Log in" links use '/auth', which lands on Sign In. */
export function useAppEntry() {
  const { stage } = useTraqi();
  const inApp = stage === 'ready' || stage === 'pin';
  return { inApp, href: inApp ? '/dashboard' : '/auth?tab=register' };
}

export default function LandingNav() {
  const { dark, toggle } = useTheme();
  const { inApp, href } = useAppEntry();
  const [menu, setMenu] = useState(false);

  /* Lock the page behind the mobile sheet, and let Escape close it. */
  useEffect(() => {
    if (!menu) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenu(false); };
    document.addEventListener('keydown', esc);
    return () => { document.body.style.overflow = prev; document.removeEventListener('keydown', esc); };
  }, [menu]);

  return (
    <>
      <header className="sticky top-4 z-50 px-4">
        <nav aria-label="Main" className="mx-auto max-w-6xl flex items-center justify-between rounded-full border border-slate-200/70 bg-white/70 backdrop-blur-md px-5 py-3 shadow-sm dark:bg-slate-900/70 dark:border-slate-800">
          <Link href="/" className="flex items-center gap-2" aria-label="Traqi home">
            <Mark dark={false} /><Wordmark className="text-xl text-slate-900 dark:text-white" />
          </Link>

          <div className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-500 dark:text-slate-400">
            {LINKS.map(l => (
              <a key={l.href} href={l.href} className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">{l.label}</a>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button type="button" onClick={toggle} aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
              className="h-9 w-9 rounded-full grid place-items-center text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors">
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            {!inApp && (
              <Link href="/auth" className="hidden sm:inline-flex text-sm font-semibold text-indigo-600 dark:text-indigo-400 px-3 py-2 rounded-full hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors">Log in</Link>
            )}
            <Link href={href} className="inline-flex items-center gap-1.5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 transition-colors">
              {inApp ? 'Go to Dashboard' : 'Get Started'}
            </Link>
            <button type="button" onClick={() => setMenu(true)} aria-label="Open menu" aria-expanded={menu}
              className="md:hidden h-9 w-9 rounded-full grid place-items-center bg-slate-900 text-white dark:bg-white dark:text-slate-900">
              <Menu className="h-4 w-4" />
            </button>
          </div>
        </nav>
      </header>

      {menu && (
        <div className="fixed inset-0 z-[60] bg-indigo-950 text-white flex flex-col p-6">
          <div className="flex items-center justify-between">
            <Wordmark className="text-2xl" />
            <button type="button" onClick={() => setMenu(false)} aria-label="Close menu"
              className="h-10 w-10 rounded-full grid place-items-center bg-white/10 hover:bg-white/20 transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>
          <nav aria-label="Mobile" className="mt-12 flex flex-col gap-2 text-2xl font-display font-bold">
            {LINKS.map(l => (
              <a key={l.href} href={l.href} onClick={() => setMenu(false)} className="py-3 border-b border-white/10">{l.label}</a>
            ))}
          </nav>
          <div className="mt-auto flex flex-col gap-3">
            <Link href={href} onClick={() => setMenu(false)} className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-center font-semibold py-3.5 transition-colors">
              {inApp ? 'Go to Dashboard' : 'Get Started Free'}
            </Link>
            {!inApp && (
              <Link href="/auth" onClick={() => setMenu(false)} className="rounded-xl border border-white/20 text-center font-semibold py-3.5 hover:bg-white/5 transition-colors">Log in</Link>
            )}
          </div>
        </div>
      )}
    </>
  );
}
