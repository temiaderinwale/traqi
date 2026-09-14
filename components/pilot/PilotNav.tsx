'use client';
/* Traqi — navigation for the pilot page.

   The landing bar, with one difference that matters: nothing here opens the
   product. "Log in" and "Get Started" both lead to the application form,
   because during the pilot we let people in by hand. The ribbon above it is
   the invitation to read the rest of the page first. */

import { useEffect, useState } from 'react';
import { Menu, Moon, Sun, X } from 'lucide-react';
import { useTheme } from '@/lib/theme';
import { Mark, Wordmark } from '@/components/Brand';
import { FORM_ANCHOR } from '@/lib/pilot';

const LINKS = [
  { href: '#home', label: 'Home' },
  { href: '#features', label: 'Features' },
  { href: '#pricing', label: 'Pricing' },
  { href: '#faq', label: 'FAQ' }
];

export default function PilotNav() {
  const { dark, toggle } = useTheme();
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
      <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-indigo-700 px-4 py-2.5 text-center">
        <p className="mx-auto max-w-4xl text-[12px] font-medium leading-relaxed text-indigo-50 sm:text-[13px]">
          Feel free to look around and see the amazing things Traqi Business Management App can do for your business.
        </p>
      </div>

      <header className="sticky top-4 z-50 px-4 pt-4">
        <nav aria-label="Main" className="mx-auto flex max-w-6xl items-center justify-between rounded-full border border-slate-200/70 bg-white/70 px-5 py-3 shadow-sm backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/70">
          <a href="#home" className="flex items-center gap-2" aria-label="Traqi">
            <Mark dark={false} /><Wordmark className="text-xl text-slate-900 dark:text-white" />
          </a>

          <div className="hidden items-center gap-7 text-sm font-medium text-slate-500 dark:text-slate-400 md:flex">
            {LINKS.map(l => (
              <a key={l.href} href={l.href} className="transition-colors hover:text-indigo-600 dark:hover:text-indigo-400">{l.label}</a>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button type="button" onClick={toggle} aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
              className="grid h-9 w-9 place-items-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800">
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <a href={FORM_ANCHOR} className="hidden rounded-full px-3 py-2 text-sm font-semibold text-indigo-600 transition-colors hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-500/10 sm:inline-flex">Log in</a>
            <a href={FORM_ANCHOR} className="inline-flex items-center gap-1.5 rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700">
              Get Started
            </a>
            <button type="button" onClick={() => setMenu(true)} aria-label="Open menu" aria-expanded={menu}
              className="grid h-9 w-9 place-items-center rounded-full bg-slate-900 text-white dark:bg-white dark:text-slate-900 md:hidden">
              <Menu className="h-4 w-4" />
            </button>
          </div>
        </nav>
      </header>

      {menu && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-indigo-950 p-6 text-white">
          <div className="flex items-center justify-between">
            <Wordmark className="text-2xl" />
            <button type="button" onClick={() => setMenu(false)} aria-label="Close menu"
              className="grid h-10 w-10 place-items-center rounded-full bg-white/10 transition-colors hover:bg-white/20">
              <X className="h-5 w-5" />
            </button>
          </div>
          <nav aria-label="Mobile" className="mt-12 flex flex-col gap-2 font-display text-2xl font-bold">
            {LINKS.map(l => (
              <a key={l.href} href={l.href} onClick={() => setMenu(false)} className="border-b border-white/10 py-3">{l.label}</a>
            ))}
          </nav>
          <div className="mt-auto flex flex-col gap-3">
            <a href={FORM_ANCHOR} onClick={() => setMenu(false)} className="rounded-xl bg-indigo-600 py-3.5 text-center font-semibold transition-colors hover:bg-indigo-700">
              Apply for early access
            </a>
            <a href={FORM_ANCHOR} onClick={() => setMenu(false)} className="rounded-xl border border-white/20 py-3.5 text-center font-semibold transition-colors hover:bg-white/5">Log in</a>
          </div>
        </div>
      )}
    </>
  );
}
