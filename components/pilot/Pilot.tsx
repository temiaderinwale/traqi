'use client';
/* Traqi — the pilot page (route "/pilot").

   The landing page, with its front door replaced. Deliberately unlinked from
   the rest of the product: the URL is handed out by us, to people we want as
   early users. Two rules follow from that, and they are the only real
   differences from "/":

     · the hero is the carousel and the application form, and the usual
       headline block slides in underneath it, and
     · nothing on the page reaches the product. Every call to action that
       would normally open /auth or /dashboard — the nav, the plan cards, the
       closing banner, the footer — points at FORM_ANCHOR instead. We want to
       speak to each applicant before handing over a workspace.

   Everything below the hero is the landing page's own content, so the two
   pages keep telling the same story. */


import { ArrowRight, ArrowUp, BarChart3, BellRing, CheckCircle2, ChevronRight, Hourglass, Instagram, Linkedin, Package, Receipt, Star, Twitter, Users } from 'lucide-react';
import { Mark, Wordmark } from '@/components/Brand';
import Showcase from '@/components/landing/Showcase';
import Reveal from '@/components/landing/Reveal';
import Faq, { FaqItem } from '@/components/landing/Faq';
import { EduEdgeLogo, LinkedInMark, SmeBuddyLogo } from '@/components/landing/PartnerLogos';
import { FORM_ANCHOR } from '@/lib/pilot';
import PilotNav from './PilotNav';
import PilotCarousel from './PilotCarousel';
import PilotForm from './PilotForm';

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

/* The landing page's questions, plus the one every visitor to this page will
   actually have. */
const FAQS: FaqItem[] = [
  { q: 'What is the Traqi pilot?', a: 'It is the first group of businesses to run on Traqi. Places are limited and given out personally: you send us your details through the form on this page, we look at them ourselves, and we set you up over WhatsApp. That is why there is no sign-up button anywhere on this page.' },
  { q: 'What kind of businesses is Traqi for?', a: 'Traqi is built for product-based businesses such as Fashion, Wears & Accessories, Fabrics, Beauty & Personal Care, Fragrances, Electronics & Electricals, Wholesale & Distribution, Gadgets & Devices, Kitchen Utensils & Household Appliances, and many others. If you sell, restock and follow up with customers, Traqi fits.' },
  { q: 'Does it work on my phone?', a: 'Yes, Traqi works on all devices. So, you can record sales and check follow-ups from multiple devices.' },
  { q: 'Can my assistants use it without seeing my finances?', a: 'Absolutely. Assistants sign in with their own PIN and only see what you allow — you control permissions for sales, inventory, expenses and financial reports, with owner approval for sensitive actions.' },
  { q: 'How do smart follow-ups work?', a: "Each product has an expected usage duration. When a customer buys, Traqi calculates when they'll run out and reminds you 3 days before — with a one-tap WhatsApp message ready to send." },
  { q: 'Can I move my existing records into Traqi?', a: 'Yes, you can import your existing products and customer database into Traqi.' }
];

export default function Pilot({ images }: { images: string[] }) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <Reveal />
      <PilotNav />

      <main id="home">
        {/* ---------- Hero: the carousel and the one form ----------

            Both columns are sticky-capable grid items, so the picture holds
            its place while a long form scrolls beside it on a desktop — and
            underneath it on a phone, where the square parks below the nav and
            the form card rides up over it. Half the screen each, and the
            slides keep turning the whole time somebody is typing. */}
        <section className="relative mx-auto max-w-6xl px-4 pb-16 pt-8 md:pb-24 lg:pt-14">
          {/* Block flow on a phone, two columns from lg up. The block half
              matters: a sticky grid item is pinned inside its own grid area,
              which on one column is just the picture's own row — no travel at
              all. As plain blocks both children share this wrapper, so the
              square can ride down over the whole form and let go at the end
              of it. From lg the square needs no sticking: the card beside it
              is exactly as tall and scrolls its own contents instead. */}
          <div className="lg:grid lg:grid-cols-2 lg:gap-12">
            {/* The square sits above the form and stays there: on a phone it
                holds the top of the screen for the whole length of the form,
                which scrolls away underneath it, and lets go once the form
                ends so the rest of the page scrolls normally. It carries the
                page colour out to both gutters (-mx-4 px-4) so nothing shows
                through around its rounded corners on the way past. */}
            <div className="sticky top-[5.25rem] z-20 -mx-4 bg-slate-50 px-4 pb-4 dark:bg-slate-950 lg:static lg:z-auto lg:mx-0 lg:bg-transparent lg:px-0 lg:pb-0 dark:lg:bg-transparent">
              <div className="mx-auto w-full max-w-[min(100%,46vh)] lg:max-w-none">
                <PilotCarousel images={images} />
              </div>
            </div>

            <div className="relative z-0 mt-6 lg:z-auto lg:mt-0">
              <PilotForm />
            </div>
          </div>
        </section>

        {/* ---------- The landing headline, now beneath the fold ---------- */}
        <section className="relative z-10 border-y border-slate-200/70 bg-white dark:border-slate-800/70 dark:bg-slate-900/40">
          <div className="mx-auto max-w-4xl px-4 py-16 text-center md:py-20">
            <div className="rv">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600 dark:text-indigo-400">Business management, made easy</p>
              <h1 className="mt-4 font-display text-4xl font-extrabold leading-[1.05] text-balance sm:text-5xl lg:text-6xl">
                Run your whole business from <span className="text-indigo-600 dark:text-indigo-400">one place.</span>
              </h1>
              <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-slate-500 dark:text-slate-400">
                Sales, inventory, customer follow-ups and financial reports — Traqi keeps every part of your business moving, on any device. Track it. Grow it.
              </p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <a href={FORM_ANCHOR} className="group inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3.5 font-semibold text-white transition-colors hover:bg-indigo-700">
                  Apply for early access
                  <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </a>
                <a href={FORM_ANCHOR} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3.5 font-semibold text-slate-900 transition-colors hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800">
                  See the Dashboard
                </a>
              </div>
              <div className="mt-9 flex items-center justify-center gap-4">
                <div className="flex -space-x-2.5" aria-hidden="true">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-indigo-400 text-xs font-bold text-white ring-2 ring-white dark:ring-slate-900">AO</span>
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-amber-500 text-xs font-bold text-white ring-2 ring-white dark:ring-slate-900">FS</span>
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-teal-500 text-xs font-bold text-white ring-2 ring-white dark:ring-slate-900">CE</span>
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-indigo-950 text-[10px] font-bold text-white ring-2 ring-white dark:ring-slate-900">2k+</span>
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-1 text-amber-500" aria-label="Rated 4.9 out of 5">
                    {[0, 1, 2, 3, 4].map(i => <Star key={i} className="h-3.5 w-3.5 fill-current" />)}
                    <span className="tnum ml-1 text-sm font-bold text-slate-900 dark:text-slate-100">4.9/5</span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">from 2,000+ growing businesses</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ---------- Logo marquee ---------- */}
        <section className="relative z-10 border-b border-slate-200/70 bg-slate-50 py-10 dark:border-slate-800/70 dark:bg-slate-950">
          <p className="mb-7 text-center text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Trusted by growing businesses</p>
          <div className="marquee" aria-hidden="true">
            <div className="marquee-track items-center gap-16 pr-16 text-slate-400 dark:text-slate-600">
              {[0, 1].map(pass => LOGOS.map(l => {
                const Icon = l.icon, Logo = l.logo;
                /* Drawn marks keep their own colours; the rest take the
                   strip's muted tone. */
                if (Logo) return (
                  <Logo key={pass + l.name}
                    className={(l.name === 'SME Buddy' ? 'h-16' : 'h-12') + ' w-auto shrink-0'} />
                );
                return (
                  <span key={pass + l.name} className="flex items-center gap-2 whitespace-nowrap font-display text-xl font-bold">
                    {Icon && <Icon className="h-6 w-6" />}{l.name}
                  </span>
                );
              }))}
            </div>
          </div>
        </section>

        {/* ---------- Features ---------- */}
        <section id="features" className="relative z-10 mx-auto max-w-6xl px-4 py-20 md:py-28">
          <div className="rv mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-extrabold text-balance md:text-4xl">Everything your business needs</h2>
            <p className="mt-3 text-slate-500 dark:text-slate-400">One workspace for your daily operations — built from years of running real businesses.</p>
          </div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => {
              const Icon = f.icon;
              return (
                <article key={f.title} className={'rv card-hover rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 '
                  + ['', 'rv-d1', 'rv-d2'][i % 3]}>
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-indigo-50 dark:bg-indigo-500/10">
                    <Icon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  </span>
                  <h3 className="mt-4 font-bold">{f.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{f.desc}</p>
                </article>
              );
            })}
          </div>
        </section>

        {/* ---------- Tabbed showcase ---------- */}
        <section className="relative z-10 border-y border-slate-200/70 bg-white dark:border-slate-800/70 dark:bg-slate-900/40">
          <Showcase />
        </section>

        {/* ---------- Stats band ---------- */}
        <section className="relative z-10 mx-auto max-w-6xl px-4 py-20 md:py-24">
          <ul className="rv grid grid-cols-2 divide-x-2 divide-y-2 divide-slate-200 overflow-hidden dark:divide-slate-800 lg:grid-cols-4 lg:divide-y-0">
            {STATS.map(s => (
              <li key={s.value} className="-m-px p-6 sm:p-9">
                <p className="tnum flex items-center gap-1.5 font-display text-3xl font-extrabold sm:text-4xl">
                  {s.up && <ArrowUp className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />}{s.value}
                </p>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{s.label}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* ---------- Pricing ----------
            Plans are shown so applicants know what they are joining; the
            buttons apply for a place rather than opening an account. */}
        <section id="pricing" className="relative z-10 border-y border-slate-200/70 bg-white dark:border-slate-800/70 dark:bg-slate-900/40">
          <div className="mx-auto max-w-6xl px-4 py-20 md:py-28">
            <div className="rv mx-auto max-w-2xl text-center">
              <h2 className="font-display text-3xl font-extrabold md:text-4xl">Simple, transparent pricing</h2>
              <p className="mt-3 text-slate-500 dark:text-slate-400">Start free, upgrade when your business does.</p>
            </div>
            <div className="mx-auto mt-12 grid max-w-5xl items-stretch gap-6 lg:grid-cols-3">
              <div className="rv flex flex-col rounded-3xl border border-slate-200 bg-slate-50 p-8 dark:border-slate-800 dark:bg-slate-900">
                <h3 className="font-display text-2xl font-extrabold">Starter</h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">For solo sellers getting organised</p>
                <ul className="mt-6 flex-1 space-y-3 text-sm">
                  {STARTER.map(f => (
                    <li key={f} className="flex items-center gap-2.5"><CheckCircle2 className="h-5 w-5 shrink-0 text-indigo-600 dark:text-indigo-400" />{f}</li>
                  ))}
                </ul>
                <a href={FORM_ANCHOR} className="mt-8 block rounded-xl border border-slate-200 bg-white py-3 text-center font-semibold text-slate-900 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700">Request access</a>
              </div>

              <div className="rv rv-d1 flex flex-col rounded-3xl bg-gradient-to-tr from-amber-600 via-amber-500 to-orange-400 p-8 text-amber-950 shadow-xl">
                <h3 className="font-display text-2xl font-extrabold">Lite</h3>
                <p className="mt-1 text-sm text-amber-900/80">For growing sellers with regulars</p>
                <ul className="mt-6 flex-1 space-y-3 text-sm text-amber-950/90">
                  {LITE.map(f => (
                    <li key={f} className="flex items-center gap-2.5"><CheckCircle2 className="h-5 w-5 shrink-0 text-amber-950" />{f}</li>
                  ))}
                </ul>
                <a href={FORM_ANCHOR} className="mt-8 block rounded-xl bg-white py-3 text-center font-bold text-amber-700 transition-colors hover:bg-amber-50">Request access</a>
              </div>

              <div className="rv rv-d2 relative flex flex-col rounded-3xl bg-gradient-to-tr from-indigo-700 via-indigo-600 to-indigo-500 p-8 text-white shadow-xl">
                {/* Badge sits out of flow so the tagline keeps the full card width. */}
                <span className="absolute right-6 top-6 whitespace-nowrap rounded-full bg-amber-500/90 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-950">Best value</span>
                <h3 className="font-display text-2xl font-extrabold">Pro</h3>
                <p className="mt-1 whitespace-nowrap text-sm text-indigo-200">For teams that sell every day</p>
                <ul className="mt-6 flex-1 space-y-3 text-sm text-indigo-100">
                  {PRO.map(f => (
                    <li key={f} className="flex items-center gap-2.5"><CheckCircle2 className="h-5 w-5 shrink-0 text-amber-400" />{f}</li>
                  ))}
                </ul>
                <a href={FORM_ANCHOR} className="mt-8 block rounded-xl bg-white py-3 text-center font-bold text-indigo-700 transition-colors hover:bg-indigo-50">Request access</a>
              </div>
            </div>
          </div>
        </section>

        {/* ---------- FAQ ---------- */}
        <section id="faq" className="relative z-10 mx-auto grid max-w-6xl gap-10 px-4 py-20 md:grid-cols-5 md:py-28">
          <div className="rv md:col-span-2">
            <h2 className="font-display text-3xl font-extrabold leading-tight md:text-4xl">Frequently<br />asked questions</h2>
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Everything you&apos;d like to know before you start.</p>
          </div>
          <Faq items={FAQS} />
        </section>

        {/* ---------- Closing CTA ---------- */}
        <section className="relative z-10 mx-auto max-w-4xl px-4 pb-24 pt-6 text-center">
          <Package className="floaty absolute left-[6%] top-2 hidden h-10 w-10 text-indigo-400/70 sm:block" aria-hidden="true" />
          <Receipt className="floaty f2 absolute right-[8%] top-10 hidden h-9 w-9 text-amber-500/70 sm:block" aria-hidden="true" />
          <BellRing className="floaty f3 absolute bottom-8 left-[18%] hidden h-8 w-8 text-slate-400/60 sm:block" aria-hidden="true" />
          <div className="rv">
            <h2 className="font-display text-4xl font-extrabold tracking-tight text-balance md:text-6xl">Let&apos;s grow together.</h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-slate-500 dark:text-slate-400">
              Places in the Traqi pilot are limited. Send us your details and we will take it from there.
            </p>
            <a href={FORM_ANCHOR} className="mt-8 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-8 py-4 font-semibold text-white transition-all hover:bg-indigo-700 hover:shadow-xl hover:shadow-indigo-500/25">
              Apply for early access <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </section>
      </main>

      {/* ---------- Footer ---------- */}
      <footer className="relative z-10 bg-indigo-950 text-slate-300">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 md:grid-cols-4">
          <div className="md:col-span-1">
            <a href="#home" className="flex items-center gap-2" aria-label="Traqi">
              <Mark /><Wordmark className="text-xl text-white" />
            </a>
            <p className="mt-3 text-sm text-slate-400">Track it. Grow it.</p>
            <div className="mt-5 flex gap-2">
              <a href="#" aria-label="Traqi on X" className="grid h-9 w-9 place-items-center rounded-full bg-white/10 transition-colors hover:bg-indigo-600"><Twitter className="h-4 w-4" /></a>
              <a href="#" aria-label="Traqi on Instagram" className="grid h-9 w-9 place-items-center rounded-full bg-white/10 transition-colors hover:bg-indigo-600"><Instagram className="h-4 w-4" /></a>
              <a href="#" aria-label="Traqi on LinkedIn" className="grid h-9 w-9 place-items-center rounded-full bg-white/10 transition-colors hover:bg-indigo-600"><Linkedin className="h-4 w-4" /></a>
            </div>
          </div>
          <nav aria-label="Product">
            <h3 className="text-sm font-bold text-white">Product</h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li><a href={FORM_ANCHOR} className="transition-colors hover:text-white">Dashboard</a></li>
              <li><a href={FORM_ANCHOR} className="transition-colors hover:text-white">Financial Reports</a></li>
              <li><a href="#features" className="transition-colors hover:text-white">Features</a></li>
              <li><a href="#pricing" className="transition-colors hover:text-white">Pricing</a></li>
            </ul>
          </nav>
          <nav aria-label="Company">
            <h3 className="text-sm font-bold text-white">Company</h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li><a href="#" className="transition-colors hover:text-white">About</a></li>
              <li><a href="#" className="transition-colors hover:text-white">Careers</a></li>
              <li><a href="#" className="transition-colors hover:text-white">Contact</a></li>
            </ul>
          </nav>
          <div>
            <h3 className="text-sm font-bold text-white">Join the pilot</h3>
            <p className="mt-4 text-sm text-slate-400">
              We are onboarding early users one at a time. Tell us about your business and we will be in touch.
            </p>
            <a href={FORM_ANCHOR} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500">
              Apply for early access <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
        <div className="border-t border-white/10">
          <p className="mx-auto max-w-6xl px-4 py-5 text-xs text-slate-500">© 2026 Traqi — An Innovation by Ascendia. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
