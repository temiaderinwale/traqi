'use client';
/* Traqi — public marketing landing page (route "/") */

import Link from 'next/link';
import {
  ArrowRight, ArrowUp, Banknote, BarChart3, BellRing, Check, CheckCircle2, ChevronRight,
  Hourglass, Instagram, Linkedin, Package, Receipt, ShoppingBag, Star, Twitter, Users
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Mark, Wordmark } from '@/components/Brand';
import LandingNav, { useAppEntry } from './LandingNav';
import Showcase from './Showcase';
import Reveal from './Reveal';
import Faq, { FaqItem } from './Faq';
import { EduEdgeLogo, LinkedInMark, SmeBuddyLogo } from './PartnerLogos';
import HeroCarousel from './HeroCarousel';

const FEATURES = [
  { icon: Receipt, title: 'Sales & Receipts', desc: 'Record multi-product sales in seconds and send professional receipts by WhatsApp, print or image.' },
  { icon: Package, title: 'Inventory Tracking', desc: 'Live stock levels with reorder alerts, so you restock before you run out.' },
  { icon: BellRing, title: 'Smart Follow-ups', desc: 'Traqi predicts when each customer will finish their product and reminds you to reach out.' },
  { icon: Users, title: 'Team & Permissions', desc: 'Add assistants, manage your team and track all activities.' },
  { icon: Hourglass, title: 'Debts & Credit', desc: 'Track part-payments and outstanding balances, with overdue flags and gentle reminder templates.' },
  { icon: BarChart3, title: 'Financial Reports', desc: 'Revenue, expenses, margins and monthly targets in one clear report.' }
];

/* A partner is either a wordmark we set in type, or its own drawn logo. */
const LOGOS: { name: string; icon?: React.ComponentType<{ className?: string }>; logo?: React.ComponentType<{ className?: string }> }[] = [
  { name: 'Ascendia' },
  { name: 'EduEdge Institute', logo: EduEdgeLogo },
  { name: 'TheAbiodunBabs Consulting' },
  { name: 'LinkedInLocal Abeokuta', icon: LinkedInMark },
  { name: 'SME Buddy', logo: SmeBuddyLogo },
  { name: 'Securing The Future Ltd' }
];

const STATS = [
  { value: '70k+', label: 'sales recorded by businesses running on Traqi' },
  { value: '35%', label: 'faster customer follow-ups with automated reminders', up: true },
  { value: '99.9%', label: 'uptime — your records safe and synced everywhere' },
  { value: '2×', label: 'quicker end-of-day closing with auto receipts' }
];

const STARTER = ['Sales log & receipts', 'Up to 50 customers', 'Basic inventory tracking', 'Standard support'];
const LITE = [
  'Everything in Starter', 'Up to 100 customers', 'Smart follow-ups & birthday alerts',
  'Financial reports & monthly targets', 'Priority support'
];
const PRO = [
  'Everything in Starter, unlimited', 'Smart follow-ups & birthday alerts',
  'Financial reports & monthly targets', 'Team roles, approvals & activity log',
  'Task management', 'Priority support'
];

const FAQS: FaqItem[] = [
  { q: 'What kind of businesses is Traqi for?', a: 'Traqi is built for product-based businesses such as Fashion, Wears & Accessories, Fabrics, Beauty & Personal Care, Fragrances, Electronics & Electricals, Wholesale & Distribution, Gadgets & Devices, Kitchen Utensils & Household Appliances, and many others. If you sell, restock and follow up with customers, Traqi fits.' },
  { q: 'Does it work on my phone?', a: 'Yes, Traqi works on all devices. So, you can record sales and check follow-ups from multi devices.' },
  { q: 'Can my assistants use it without seeing my finances?', a: 'Absolutely. Assistants sign in with their own PIN and only see what you allow — you control permissions for sales, inventory, expenses and financial reports, with owner approval for sensitive actions.' },
  { q: 'How do smart follow-ups work?', a: "Each product has an expected usage duration. When a customer buys, Traqi calculates when they'll run out and reminds you 3 days before — with a one-tap WhatsApp message ready to send." },
  { q: 'Can I move my existing records into Traqi?', a: "Yes, you can import your existing products and customer database into Traqi." }
];

const SPARK = 'rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm';

export default function Landing() {
  const { inApp, href } = useAppEntry();

  return (
    <div className="bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 min-h-screen">
      <Reveal />
      <LandingNav />

      <main id="home">
        {/* ---------- Hero ---------- */}
        <section className="mx-auto max-w-6xl px-4 pt-14 pb-16 md:pt-20 md:pb-24 grid md:grid-cols-2 gap-12 md:items-center">
          <div className="seq">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600 dark:text-indigo-400">Business management, made easy</p>
            <h1 className="font-display font-extrabold text-4xl sm:text-5xl lg:text-6xl leading-[1.05] mt-4 text-balance">
              Run your whole business from <span className="text-indigo-600 dark:text-indigo-400">one place.</span>
            </h1>
            <p className="mt-5 text-lg text-slate-500 dark:text-slate-400 max-w-md leading-relaxed">
              Sales, inventory, customer follow-ups and financial reports — Traqi keeps every part of your business moving, on any device. Track it. Grow it.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link href={href} className="group inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-3.5 transition-colors">
                {inApp ? 'Go to Dashboard' : 'Get Started Free'}
                <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link href={inApp ? '/dashboard' : '/auth'} className="inline-flex items-center justify-center gap-2 rounded-xl bg-white border border-slate-200 text-slate-900 font-semibold px-6 py-3.5 hover:bg-slate-100 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100 dark:hover:bg-slate-800 transition-colors">
                See the Dashboard
              </Link>
            </div>
            <div className="mt-9 flex items-center gap-4">
              <div className="flex -space-x-2.5" aria-hidden="true">
                <span className="h-9 w-9 rounded-full ring-2 ring-slate-50 dark:ring-slate-950 bg-indigo-400 grid place-items-center text-white text-xs font-bold">AO</span>
                <span className="h-9 w-9 rounded-full ring-2 ring-slate-50 dark:ring-slate-950 bg-amber-500 grid place-items-center text-white text-xs font-bold">FS</span>
                <span className="h-9 w-9 rounded-full ring-2 ring-slate-50 dark:ring-slate-950 bg-teal-500 grid place-items-center text-white text-xs font-bold">CE</span>
                <span className="h-9 w-9 rounded-full ring-2 ring-slate-50 dark:ring-slate-950 bg-indigo-950 grid place-items-center text-white text-[10px] font-bold">2k+</span>
              </div>
              <div>
                <div className="flex items-center gap-1 text-amber-500" aria-label="Rated 4.9 out of 5">
                  {[0, 1, 2, 3, 4].map(i => <Star key={i} className="h-3.5 w-3.5 fill-current" />)}
                  <span className="ml-1 text-sm font-bold text-slate-900 dark:text-slate-100 tnum">4.9/5</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">from 2,000+ growing businesses</p>
              </div>
            </div>
          </div>

          {/* Traqi in use — auto-advancing hero */}
          <HeroCarousel />
        </section>

        {/* ---------- Logo marquee ---------- */}
        <section className="py-10 border-y border-slate-200/70 dark:border-slate-800/70 bg-white dark:bg-slate-900/40">
          <p className="text-center text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400 mb-7">Trusted by growing businesses</p>
          <div className="marquee" aria-hidden="true">
            <div className="marquee-track items-center gap-16 pr-16 text-slate-400 dark:text-slate-600">
              {[0, 1].map(pass => LOGOS.map(l => {
                const Icon = l.icon, Logo = l.logo;
                /* Drawn marks keep their own colours; the rest take the strip's
                   muted tone. */
                if (Logo) return (
                  <Logo key={pass + l.name}
                    className={(l.name === 'SME Buddy' ? 'h-16' : 'h-12') + ' w-auto shrink-0'} />
                );
                return (
                  <span key={pass + l.name} className="font-display font-bold text-xl whitespace-nowrap flex items-center gap-2">
                    {Icon && <Icon className="h-6 w-6" />}{l.name}
                  </span>
                );
              }))}
            </div>
          </div>
        </section>

        {/* ---------- Features ---------- */}
        <section id="features" className="mx-auto max-w-6xl px-4 py-20 md:py-28">
          <div className="max-w-2xl mx-auto text-center rv">
            <h2 className="font-display font-extrabold text-3xl md:text-4xl text-balance">Everything your business needs</h2>
            <p className="mt-3 text-slate-500 dark:text-slate-400">One workspace for your daily operations — built from years of running real businesses.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-12">
            {FEATURES.map((f, i) => {
              const Icon = f.icon;
              return (
                <article key={f.title} className={'rv rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-sm card-hover '
                  + ['', 'rv-d1', 'rv-d2'][i % 3]}>
                  <span className="h-11 w-11 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 grid place-items-center">
                    <Icon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  </span>
                  <h3 className="font-bold mt-4">{f.title}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">{f.desc}</p>
                </article>
              );
            })}
          </div>
        </section>

        {/* ---------- Tabbed showcase ---------- */}
        <section className="bg-white dark:bg-slate-900/40 border-y border-slate-200/70 dark:border-slate-800/70">
          <Showcase />
        </section>

        {/* ---------- Stats band ---------- */}
        <section className="mx-auto max-w-6xl px-4 py-20 md:py-24">
          <ul className="grid grid-cols-2 lg:grid-cols-4 divide-x-2 divide-y-2 lg:divide-y-0 divide-slate-200 dark:divide-slate-800 overflow-hidden rv">
            {STATS.map(s => (
              <li key={s.value} className="-m-px p-6 sm:p-9">
                <p className="tnum font-display font-extrabold text-3xl sm:text-4xl flex items-center gap-1.5">
                  {s.up && <ArrowUp className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />}{s.value}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">{s.label}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* ---------- Pricing ---------- */}
        <section id="pricing" className="bg-white dark:bg-slate-900/40 border-y border-slate-200/70 dark:border-slate-800/70">
          <div className="mx-auto max-w-6xl px-4 py-20 md:py-28">
            <div className="max-w-2xl mx-auto text-center rv">
              <h2 className="font-display font-extrabold text-3xl md:text-4xl">Simple, transparent pricing</h2>
              <p className="mt-3 text-slate-500 dark:text-slate-400">Start free, upgrade when your business does.</p>
            </div>
            <div className="mt-12 grid gap-6 lg:grid-cols-3 items-stretch max-w-5xl mx-auto">
              <div className="rv flex flex-col rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8">
                <h3 className="font-display font-extrabold text-2xl">Starter</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">For solo sellers getting organised</p>
                <ul className="mt-6 flex-1 space-y-3 text-sm">
                  {STARTER.map(f => (
                    <li key={f} className="flex items-center gap-2.5"><CheckCircle2 className="h-5 w-5 shrink-0 text-indigo-600 dark:text-indigo-400" />{f}</li>
                  ))}
                </ul>
                <Link href={href} className="mt-8 block text-center rounded-xl bg-white border border-slate-200 text-slate-900 font-semibold py-3 hover:bg-slate-100 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-700 transition-colors">Start free</Link>
              </div>

              <div className="rv rv-d1 flex flex-col rounded-3xl bg-gradient-to-tr from-amber-600 via-amber-500 to-orange-400 text-amber-950 p-8 shadow-xl">
                <h3 className="font-display font-extrabold text-2xl">Lite</h3>
                <p className="text-sm text-amber-900/80 mt-1">For growing sellers with regulars</p>
                <ul className="mt-6 flex-1 space-y-3 text-sm text-amber-950/90">
                  {LITE.map(f => (
                    <li key={f} className="flex items-center gap-2.5"><CheckCircle2 className="h-5 w-5 shrink-0 text-amber-950" />{f}</li>
                  ))}
                </ul>
                <Link href={href} className="mt-8 block text-center rounded-xl bg-white text-amber-700 font-bold py-3 hover:bg-amber-50 transition-colors">Start free</Link>
              </div>

              <div className="rv rv-d2 flex flex-col relative rounded-3xl bg-gradient-to-tr from-indigo-700 via-indigo-600 to-indigo-500 text-white p-8 shadow-xl">
                {/* Badge sits out of flow so the tagline keeps the full card width. */}
                <span className="absolute right-6 top-6 text-[10px] font-bold uppercase tracking-wider bg-amber-500/90 text-amber-950 rounded-full px-3 py-1 whitespace-nowrap">Best value</span>
                <h3 className="font-display font-extrabold text-2xl">Pro</h3>
                <p className="text-sm text-indigo-200 mt-1 whitespace-nowrap">For teams that sell every day</p>
                <ul className="mt-6 flex-1 space-y-3 text-sm text-indigo-100">
                  {PRO.map(f => (
                    <li key={f} className="flex items-center gap-2.5"><CheckCircle2 className="h-5 w-5 shrink-0 text-amber-400" />{f}</li>
                  ))}
                </ul>
                <Link href={href} className="mt-8 block text-center rounded-xl bg-white text-indigo-700 font-bold py-3 hover:bg-indigo-50 transition-colors">Start free</Link>
              </div>
            </div>
          </div>
        </section>

        {/* ---------- FAQ ---------- */}
        <section id="faq" className="mx-auto max-w-6xl px-4 py-20 md:py-28 grid md:grid-cols-5 gap-10">
          <div className="md:col-span-2 rv">
            <h2 className="font-display font-extrabold text-3xl md:text-4xl leading-tight">Frequently<br />asked questions</h2>
            <p className="mt-3 text-slate-500 dark:text-slate-400 text-sm">Everything you&apos;d like to know before you start.</p>
          </div>
          <Faq items={FAQS} />
        </section>

        {/* ---------- Closing CTA ---------- */}
        <section className="relative mx-auto max-w-4xl px-4 pb-24 pt-6 text-center">
          <Package className="floaty absolute left-[6%] top-2 h-10 w-10 text-indigo-400/70 hidden sm:block" aria-hidden="true" />
          <Receipt className="floaty f2 absolute right-[8%] top-10 h-9 w-9 text-amber-500/70 hidden sm:block" aria-hidden="true" />
          <BellRing className="floaty f3 absolute left-[18%] bottom-8 h-8 w-8 text-slate-400/60 hidden sm:block" aria-hidden="true" />
          <div className="rv">
            <h2 className="font-display font-extrabold text-4xl md:text-6xl tracking-tight text-balance">Let&apos;s grow together.</h2>
            <p className="mt-4 text-lg text-slate-500 dark:text-slate-400 max-w-xl mx-auto">Join thousands of business owners who track it and grow it with Traqi.</p>
            <Link href={href} className="mt-8 inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-8 py-4 transition-all hover:shadow-xl hover:shadow-indigo-500/25">
              {inApp ? 'Go to Dashboard' : 'Get Started Free'} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>

      {/* ---------- Footer ---------- */}
      <footer className="bg-indigo-950 text-slate-300">
        <div className="mx-auto max-w-6xl px-4 py-14 grid gap-10 md:grid-cols-4">
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center gap-2" aria-label="Traqi home">
              <Mark /><Wordmark className="text-xl text-white" />
            </Link>
            <p className="mt-3 text-sm text-slate-400">Track it. Grow it.</p>
            <div className="mt-5 flex gap-2">
              <a href="#" aria-label="Traqi on X" className="h-9 w-9 rounded-full bg-white/10 grid place-items-center hover:bg-indigo-600 transition-colors"><Twitter className="h-4 w-4" /></a>
              <a href="#" aria-label="Traqi on Instagram" className="h-9 w-9 rounded-full bg-white/10 grid place-items-center hover:bg-indigo-600 transition-colors"><Instagram className="h-4 w-4" /></a>
              <a href="#" aria-label="Traqi on LinkedIn" className="h-9 w-9 rounded-full bg-white/10 grid place-items-center hover:bg-indigo-600 transition-colors"><Linkedin className="h-4 w-4" /></a>
            </div>
          </div>
          <nav aria-label="Product">
            <h3 className="font-bold text-white text-sm">Product</h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li><Link href={inApp ? '/dashboard' : '/auth'} className="hover:text-white transition-colors">Dashboard</Link></li>
              <li><Link href={inApp ? '/financials' : '/auth'} className="hover:text-white transition-colors">Financial Reports</Link></li>
              <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
              <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
            </ul>
          </nav>
          <nav aria-label="Company">
            <h3 className="font-bold text-white text-sm">Company</h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li><a href="#" className="hover:text-white transition-colors">About</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
            </ul>
          </nav>
          <div>
            <h3 className="font-bold text-white text-sm">Stay up to date</h3>
            <form className="mt-4 flex gap-2" aria-label="Newsletter" onSubmit={e => e.preventDefault()}>
              <label htmlFor="newsletter" className="sr-only">Email address</label>
              <input id="newsletter" type="email" placeholder="Enter your email"
                className="min-w-0 flex-1 rounded-xl bg-white/10 border border-white/10 px-4 py-2.5 text-sm placeholder:text-slate-500 focus:border-indigo-400" />
              <button type="submit" className="rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-4 py-2.5 transition-colors">Subscribe</button>
            </form>
            <p className="mt-3 text-xs text-slate-500">Product tips, no spam.</p>
          </div>
        </div>
        <div className="border-t border-white/10">
          <p className="mx-auto max-w-6xl px-4 py-5 text-xs text-slate-500">© 2026 Traqi — An Innovation by Ascendia. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
