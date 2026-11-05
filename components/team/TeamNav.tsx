'use client';
/* Traqi — navigation for the Join the Traqi Team page.

   The pilot bar, pointed at volunteers: the links are to this page's own
   sections, and both calls to action lead to the application form. Nothing
   here opens the product. */

import { useEffect, useState } from 'react';
import { Menu, Moon, Sun, X } from 'lucide-react';
import { useTheme } from '@/lib/theme';
import { Mark, Wordmark } from '@/components/Brand';
import { DEADLINE_LABEL, FORM_ANCHOR } from '@/lib/team';

const LINKS = [
  { href: '#home', label: 'Home' },
  { href: '#roles', label: 'Open roles' },
  { href: '#about', label: 'About Traqi' },
  { href: '#faq', label: 'FAQ' }
];

export default function TeamNav() {
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
          Join the Traqi Team — volunteer roles, remote, work from anywhere. Applications close {DEADLINE_LABEL}.
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
            <a href={FORM_ANCHOR} className="inline-flex items-center gap-1.5 rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700">
              Apply now
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
              Join the Traqi Team
            </a>
          </div>
        </div>
      )}
    </>
  );
}
