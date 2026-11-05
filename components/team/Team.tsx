'use client';
/* Traqi — Join the Traqi Team (route "/team").

   The pilot page, turned around to face volunteers instead of business
   owners. Same front door — the carousel (the "Join Our Team" fliers) beside
   the one form — and the same rule that nothing on the page opens the
   product: every call to action leads to FORM_ANCHOR.

   Below the hero, the story is the roles rather than the plans: what each
   open role involves, what volunteering with us looks like, how an
   application is handled, and — for anyone who has not met Traqi yet — what
   the product they would be helping build actually does. */

import {
  ArrowRight, BarChart3, BellRing, Clapperboard, ClipboardList, Clock, Globe, HeartHandshake, Hourglass,
  Instagram, Linkedin, Megaphone, MessageCircle, Package, Receipt, Rocket, Share2, Twitter, UserCheck,
  Users, Wrench, Headset
} from 'lucide-react';
import { Mark, Wordmark } from '@/components/Brand';
import Showcase from '@/components/landing/Showcase';
import Reveal from '@/components/landing/Reveal';
import Faq, { FaqItem } from '@/components/landing/Faq';
import { EduEdgeLogo, LinkedInMark, SmeBuddyLogo } from '@/components/landing/PartnerLogos';
import PilotCarousel from '@/components/pilot/PilotCarousel';
import { DEADLINE_LABEL, FORM_ANCHOR, TEAM_ROLES } from '@/lib/team';
import TeamNav from './TeamNav';
import TeamForm from './TeamForm';

/* One mark per role, in the order the fliers list them. */
const ROLE_ICONS = [Headset, Wrench, Share2, Clapperboard, Megaphone];

const PERKS = [
  { icon: Globe, title: 'Work from anywhere', desc: 'Every role is fully remote. All you need is a phone or laptop and a good connection.' },
  { icon: Clock, title: 'Flexible hours', desc: 'Volunteer around school, work or your own business — you tell us how much time you can give.' },
  { icon: HeartHandshake, title: 'Meaningful work', desc: 'Everything you do helps small business owners run and grow their businesses.' },
  { icon: Rocket, title: 'Real experience', desc: 'Work on a live product with real users, alongside a team that is building it every day.' }
];

const STEPS = [
  { icon: ClipboardList, title: 'Choose a role and apply', desc: 'Pick the one role that fits you best and fill in the form on this page.' },
  { icon: UserCheck, title: 'We review it ourselves', desc: 'Every application is read by a person on the team, not filtered by a machine.' },
  { icon: MessageCircle, title: 'We talk on WhatsApp', desc: 'Message us once you have applied, and we will set up a short conversation.' },
  { icon: Users, title: 'You join the team', desc: 'If it is a fit, we onboard you and you start contributing — from wherever you are.' }
];

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

const FAQS: FaqItem[] = [
  { q: 'Are these paid roles?', a: 'No. These are volunteer roles. You give the time you can, and in return you get hands-on experience on a live product, a team to learn alongside, and work that makes a real difference to small businesses.' },
  { q: 'Do I need to be in a particular city?', a: 'No. Every role is remote — work from anywhere. We work together online and over WhatsApp.' },
  { q: 'Can I apply for more than one role?', a: 'Each application is for one role, so we can read it properly. If two roles genuinely interest you, choose the one you are strongest in; you can mention the other in your answers.' },
  { q: 'How much time do I need to give?', a: 'It depends on the role and on you. The form asks how many hours a week you can offer, and we plan around that.' },
  { q: 'When is the deadline?', a: `Applications close on ${DEADLINE_LABEL}. We review them as they arrive, so applying early does not hurt.` },
  { q: 'What happens after I apply?', a: 'You will be asked to message us on WhatsApp. We review every application ourselves, and if your skills fit the role we will arrange a short conversation before onboarding you.' },
  { q: 'What is Traqi?', a: 'Traqi is a business management app for small, product-based businesses — sales and receipts, inventory, customer follow-ups, debts and financial reports, all in one place, on any device.' }
];

/** Takes the visitor up to the form with this role already chosen. The form
    listens for the event; the link does the scrolling. */
const pickRole = (name: string) => window.dispatchEvent(new CustomEvent('team:pick-role', { detail: name }));

export default function Team({ images }: { images: string[] }) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <Reveal />
      <TeamNav />

      <main id="home">
        {/* ---------- Hero: the fliers and the one form ----------
            Laid out exactly as the pilot hero is; see Pilot.tsx for why the
            square is sticky on a phone and static from lg up. */}
        <section className="relative mx-auto max-w-6xl px-4 pb-16 pt-8 md:pb-24 lg:pt-14">
          <div className="lg:grid lg:grid-cols-2 lg:gap-12">
            <div className="sticky top-[5.25rem] z-20 -mx-4 bg-slate-50 px-4 pb-4 dark:bg-slate-950 lg:static lg:z-auto lg:mx-0 lg:bg-transparent lg:px-0 lg:pb-0 dark:lg:bg-transparent">
              <div className="mx-auto w-full max-w-[min(100%,46vh)] lg:max-w-none">
                <PilotCarousel images={images} label="Join the Traqi Team" />
              </div>
            </div>

            <div className="relative z-0 mt-6 lg:z-auto lg:mt-0">
              <TeamForm />
            </div>
          </div>
        </section>

        {/* ---------- The headline, beneath the fold ---------- */}
        <section className="relative z-10 border-y border-slate-200/70 bg-white dark:border-slate-800/70 dark:bg-slate-900/40">
          <div className="mx-auto max-w-4xl px-4 py-16 text-center md:py-20">
            <div className="rv">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600 dark:text-indigo-400">Volunteer roles · Remote</p>
              <h1 className="mt-4 font-display text-4xl font-extrabold leading-[1.05] text-balance sm:text-5xl lg:text-6xl">
                Join the <span className="text-indigo-600 dark:text-indigo-400">Traqi</span> <span className="text-amber-600 dark:text-amber-400">Team.</span>
              </h1>
              <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-slate-500 dark:text-slate-400">
                We&apos;re building tools that help small businesses thrive, and we need people who care about the details.
              </p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <a href={FORM_ANCHOR} className="group inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3.5 font-semibold text-white transition-colors hover:bg-indigo-700">
                  Apply now
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </a>
                <a href="#roles" className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3.5 font-semibold text-slate-900 transition-colors hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800">
                  See the open roles
                </a>
              </div>
              <p className="mt-7 text-sm font-semibold uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">Work from anywhere</p>
            </div>
          </div>
        </section>

        {/* ---------- Open roles ---------- */}
        <section id="roles" className="relative z-10 mx-auto max-w-6xl scroll-mt-28 px-4 py-20 md:py-28">
          <div className="rv mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-extrabold text-balance md:text-4xl">Open roles</h2>
            <p className="mt-3 text-slate-500 dark:text-slate-400">Five volunteer roles, all remote. Choose the one that fits you best — one role per application.</p>
          </div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {TEAM_ROLES.map((r, i) => {
              const Icon = ROLE_ICONS[i] || Users;
              const gold = i % 2 === 1;
              return (
                <article key={r.name} className={'rv card-hover flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 '
                  + ['', 'rv-d1', 'rv-d2'][i % 3]}>
                  <span className={'grid h-11 w-11 place-items-center rounded-xl '
                    + (gold ? 'bg-amber-50 dark:bg-amber-500/10' : 'bg-indigo-50 dark:bg-indigo-500/10')}>
                    <Icon className={'h-5 w-5 ' + (gold ? 'text-amber-600 dark:text-amber-400' : 'text-indigo-600 dark:text-indigo-400')} />
                  </span>
                  <h3 className="mt-4 font-bold">{r.name}</h3>
                  <p className="mt-1.5 flex-1 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{r.desc}</p>
                  <div className="mt-5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-500 dark:bg-slate-800 dark:text-slate-400">Volunteer</span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-500 dark:bg-slate-800 dark:text-slate-400">Remote</span>
                  </div>
                  <a href={FORM_ANCHOR} onClick={() => pickRole(r.name)}
                    className="group mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 transition-colors hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300">
                    Apply for this role <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </a>
                </article>
              );
            })}
          </div>
        </section>

        {/* ---------- Why volunteer with us ---------- */}
        <section className="relative z-10 border-y border-slate-200/70 bg-white dark:border-slate-800/70 dark:bg-slate-900/40">
          <div className="mx-auto max-w-6xl px-4 py-20 md:py-24">
            <div className="rv mx-auto max-w-2xl text-center">
              <h2 className="font-display text-3xl font-extrabold text-balance md:text-4xl">Why join the Traqi Team</h2>
              <p className="mt-3 text-slate-500 dark:text-slate-400">If you have the skill, the drive and the heart for meaningful work, we want you on our team.</p>
            </div>
            <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {PERKS.map((p, i) => {
                const Icon = p.icon;
                return (
                  <li key={p.title} className={'rv rounded-2xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-900 ' + ['', 'rv-d1', 'rv-d2', 'rv-d1'][i]}>
                    <Icon className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                    <h3 className="mt-4 font-bold">{p.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{p.desc}</p>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        {/* ---------- How it works ---------- */}
        <section className="relative z-10 mx-auto max-w-6xl px-4 py-20 md:py-24">
          <div className="rv mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-extrabold text-balance md:text-4xl">How it works</h2>
            <p className="mt-3 text-slate-500 dark:text-slate-400">From application to your first task, in four steps.</p>
          </div>
          <ol className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              return (
                <li key={s.title} className={'rv relative rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 ' + ['', 'rv-d1', 'rv-d2', 'rv-d1'][i]}>
                  <span className="tnum absolute right-5 top-5 font-display text-3xl font-extrabold text-slate-100 dark:text-slate-800">{i + 1}</span>
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-indigo-600 text-white">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 font-bold">{s.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{s.desc}</p>
                </li>
              );
            })}
          </ol>
        </section>

        {/* ---------- About Traqi: what you would be helping build ---------- */}
        <section id="about" className="relative z-10 scroll-mt-28 border-y border-slate-200/70 bg-white dark:border-slate-800/70 dark:bg-slate-900/40">
          <div className="mx-auto max-w-6xl px-4 py-20 md:py-28">
            <div className="rv mx-auto max-w-2xl text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600 dark:text-indigo-400">About Traqi</p>
              <h2 className="mt-3 font-display text-3xl font-extrabold text-balance md:text-4xl">What you would be helping build</h2>
              <p className="mt-3 text-slate-500 dark:text-slate-400">One workspace for a small business&apos;s daily operations — built from years of running real businesses.</p>
            </div>
            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f, i) => {
                const Icon = f.icon;
                return (
                  <article key={f.title} className={'rv card-hover rounded-2xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-900 '
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
          </div>
        </section>

        {/* ---------- Tabbed showcase ---------- */}
        <section className="relative z-10">
          <Showcase />
        </section>

        {/* ---------- Logo marquee ---------- */}
        <section className="relative z-10 border-y border-slate-200/70 bg-white py-10 dark:border-slate-800/70 dark:bg-slate-900/40">
          <p className="mb-7 text-center text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Trusted by growing businesses</p>
          <div className="marquee" aria-hidden="true">
            <div className="marquee-track items-center gap-16 pr-16 text-slate-400 dark:text-slate-600">
              {[0, 1].map(pass => LOGOS.map(l => {
                const Icon = l.icon, Logo = l.logo;
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

        {/* ---------- FAQ ---------- */}
        <section id="faq" className="relative z-10 mx-auto grid max-w-6xl scroll-mt-28 gap-10 px-4 py-20 md:grid-cols-5 md:py-28">
          <div className="rv md:col-span-2">
            <h2 className="font-display text-3xl font-extrabold leading-tight md:text-4xl">Frequently<br />asked questions</h2>
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Everything you&apos;d like to know before you apply.</p>
          </div>
          <Faq items={FAQS} />
        </section>

        {/* ---------- Closing CTA ---------- */}
        <section className="relative z-10 mx-auto max-w-4xl px-4 pb-24 pt-6 text-center">
          <Megaphone className="floaty absolute left-[6%] top-2 hidden h-10 w-10 text-indigo-400/70 sm:block" aria-hidden="true" />
          <Headset className="floaty f2 absolute right-[8%] top-10 hidden h-9 w-9 text-amber-500/70 sm:block" aria-hidden="true" />
          <Clapperboard className="floaty f3 absolute bottom-8 left-[18%] hidden h-8 w-8 text-slate-400/60 sm:block" aria-hidden="true" />
          <div className="rv">
            <h2 className="font-display text-4xl font-extrabold tracking-tight text-balance md:text-6xl">Join the Traqi Team.</h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-slate-500 dark:text-slate-400">
              If you have the skill, the drive and the heart for meaningful work, we want you on our team. Applications close {DEADLINE_LABEL}.
            </p>
            <a href={FORM_ANCHOR} className="mt-8 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-8 py-4 font-semibold text-white transition-all hover:bg-indigo-700 hover:shadow-xl hover:shadow-indigo-500/25">
              Apply now <ArrowRight className="h-4 w-4" />
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
          <nav aria-label="Open roles">
            <h3 className="text-sm font-bold text-white">Open roles</h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              {TEAM_ROLES.map(r => (
                <li key={r.name}><a href={FORM_ANCHOR} onClick={() => pickRole(r.name)} className="transition-colors hover:text-white">{r.name}</a></li>
              ))}
            </ul>
          </nav>
          <nav aria-label="This page">
            <h3 className="text-sm font-bold text-white">This page</h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li><a href="#roles" className="transition-colors hover:text-white">Open roles</a></li>
              <li><a href="#about" className="transition-colors hover:text-white">About Traqi</a></li>
              <li><a href="#faq" className="transition-colors hover:text-white">FAQ</a></li>
            </ul>
          </nav>
          <div>
            <h3 className="text-sm font-bold text-white">Join the Traqi Team</h3>
            <p className="mt-4 text-sm text-slate-400">
              Volunteer roles, remote. Applications close {DEADLINE_LABEL}.
            </p>
            <a href={FORM_ANCHOR} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500">
              Apply now <ArrowRight className="h-4 w-4" />
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
