'use client';
/* Traqi — the Join the Traqi Team application form.

   The pilot form's twin, asking about a person rather than a business. Each
   application lands in Firestore under `teamApplications` (and, when the
   sheet is wired up, in the team Google Sheet too), and the moment one does
   the card turns into the invitation to open a WhatsApp conversation. One
   role per application: the roles are a radio group, not a checklist. */

import { useEffect, useRef, useState } from 'react';
import { AlertCircle, Check, CheckCircle2, Loader2, PartyPopper, Send } from 'lucide-react';
import { OptionSelect } from '@/components/Dropdown';
import { WHATSAPP_DISPLAY, isEmail, isPhone } from '@/lib/pilot';
import {
  AVAILABILITY, BLANK_APPLICATION, LIMITS, OCCUPATIONS, TEAM_ROLES,
  applicationMessage, isUrl, submitTeamApplication, whatsappLink, type TeamApplication
} from '@/lib/team';

type Errors = Partial<Record<keyof TeamApplication, string>>;

const FIELD = 'w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-900 transition-colors placeholder:text-slate-400 '
  + 'dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-600';
const OK = ' border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700';
const BAD = ' border-red-400 dark:border-red-500/70';

function Label({ htmlFor, children, optional }: { htmlFor: string; children: React.ReactNode; optional?: boolean }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-[13px] font-semibold text-slate-700 dark:text-slate-300">
      {children}
      {optional && <span className="ml-1.5 font-normal text-slate-400">(optional)</span>}
    </label>
  );
}

function Err({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-red-600 dark:text-red-400">
      <AlertCircle className="h-3.5 w-3.5 shrink-0" />{msg}
    </p>
  );
}

function validate(f: TeamApplication): Errors {
  const e: Errors = {};
  if (!f.firstName.trim()) e.firstName = 'Please enter your first name.';
  if (!f.surname.trim()) e.surname = 'Please enter your surname.';
  if (!f.email.trim()) e.email = 'Please enter your email address.';
  else if (!isEmail(f.email)) e.email = 'Please enter a valid email address.';
  if (!f.whatsapp.trim()) e.whatsapp = 'Please enter your WhatsApp number.';
  else if (!isPhone(f.whatsapp)) e.whatsapp = 'Please enter a valid phone number.';
  if (!f.location.trim()) e.location = 'Please enter your location.';
  if (!f.role) e.role = 'Please choose the role you are applying for.';
  if (!f.occupation) e.occupation = 'Please tell us what you do at the moment.';
  if (!f.availability) e.availability = 'Please choose how much time you can give.';
  if (f.portfolio.trim() && !isUrl(f.portfolio)) e.portfolio = 'Please enter a valid link, or leave this empty.';
  if (!f.experience.trim()) e.experience = 'Please tell us about your skills and experience.';
  if (!f.motivation.trim()) e.motivation = 'Please tell us why you want to join.';
  return e;
}

/** What replaces the form once an application is in. */
function Done({ f }: { f: TeamApplication }) {
  return (
    <div className="pilot-pop flex min-h-full flex-col items-center justify-center text-center">
      <svg width="0" height="0" aria-hidden="true" focusable="false" className="absolute">
        <defs>
          <linearGradient id="team-pop-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#F59E0B" />
            <stop offset="34%" stopColor="#EC4899" />
            <stop offset="68%" stopColor="#8B5CF6" />
            <stop offset="100%" stopColor="#4F46E5" />
          </linearGradient>
        </defs>
      </svg>
      <PartyPopper className="h-14 w-14" strokeWidth={1.75} style={{ stroke: 'url(#team-pop-grad)' }} />

      <h3 className="mt-5 font-display text-2xl font-extrabold text-balance sm:text-3xl">
        Your application is in
      </h3>
      <p className="mt-2 max-w-[38ch] text-sm leading-relaxed text-slate-500 dark:text-slate-400">
        Thank you, {f.firstName.trim()}. You applied for <span className="font-semibold text-slate-700 dark:text-slate-200">{f.role}</span>.
        Message us on WhatsApp so we can take it from here.
      </p>

      <div className="relative mt-7 w-full">
        <span aria-hidden="true" className="pilot-halo absolute inset-0 rounded-2xl bg-amber-500/30 blur-xl" />
        <a href={whatsappLink(applicationMessage(f))} target="_blank" rel="noopener noreferrer"
          className="wa-cta pilot-nudge relative flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-amber-500 via-orange-600 to-indigo-700 px-4 py-4 font-bold text-white shadow-lg shadow-amber-600/25 transition-all hover:shadow-xl hover:shadow-amber-600/35 hover:brightness-110 sm:px-6">
          <span className="wa-cta-inner">
            <Send className="wa-cta-icon" />
            <span className="whitespace-nowrap">Click here for next step</span>
          </span>
        </a>
      </div>

      <p className="tnum mt-4 text-xs text-slate-400">{WHATSAPP_DISPLAY}</p>

      <p className="mt-6 flex items-center justify-center gap-2 text-sm text-slate-500 dark:text-slate-400">
        <CheckCircle2 className="h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-400" />
        We review every application ourselves
      </p>
    </div>
  );
}

export default function TeamForm() {
  const [f, setF] = useState<TeamApplication>(BLANK_APPLICATION);
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState('');
  const [done, setDone] = useState(false);
  const card = useRef<HTMLDivElement>(null);

  const set = (k: keyof TeamApplication) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const v = e.target.value;
    setF(p => ({ ...p, [k]: v }));
    setErrors(p => (p[k] ? { ...p, [k]: undefined } : p));
  };

  const choose = (k: keyof TeamApplication) => (v: string) => {
    setF(p => ({ ...p, [k]: v }));
    setErrors(p => (p[k] ? { ...p, [k]: undefined } : p));
  };

  /* The role cards further down the page pre-pick a role on the way up here:
     they fire `team:pick-role` with the role's name (see Team.tsx). */
  useEffect(() => {
    const pick = (e: Event) => {
      const role = (e as CustomEvent<string>).detail;
      if (TEAM_ROLES.some(r => r.name === role)) choose('role')(role);
    };
    window.addEventListener('team:pick-role', pick);
    return () => window.removeEventListener('team:pick-role', pick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const found = validate(f);
    setErrors(found);
    if (Object.keys(found).length) {
      const first = document.querySelector<HTMLElement>('[data-invalid="true"]');
      first?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      first?.focus({ preventScroll: true });
      return;
    }
    setBusy(true);
    setFailed('');
    try {
      await submitTeamApplication(f);
      setDone(true);
    } catch {
      setFailed('We could not save your application just now. Please check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  /* Bring the answer into view the moment it exists — the same measurement
     the pilot form makes, for the same pinned carousel. */
  useEffect(() => {
    if (!done) return;
    const el = card.current;
    if (!el) return;

    const frame = requestAnimationFrame(() => {
      (el.firstElementChild as HTMLElement | null)?.scrollTo?.({ top: 0 });

      const carousel = document.querySelector('[aria-roledescription="carousel"]');
      const root = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      const overhead = carousel && window.innerWidth < 1024
        ? 5.25 * root + carousel.getBoundingClientRect().height
        : 0;

      const top = el.getBoundingClientRect().top + window.scrollY - overhead - 12;
      window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
    });
    return () => cancelAnimationFrame(frame);
  }, [done]);

  const invalid = (k: keyof TeamApplication) => ({
    'data-invalid': errors[k] ? 'true' : undefined,
    'aria-invalid': errors[k] ? true : undefined,
    className: FIELD + (errors[k] ? BAD : OK)
  });

  return (
    <div ref={card} id="apply" className="scroll-mt-28">
      <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-900/5 dark:border-slate-800 dark:bg-slate-900 sm:p-8 lg:aspect-square lg:overflow-y-auto">
        {done ? <Done f={f} /> : (
          <>
            <div className="relative">
              <span aria-hidden="true" className="pointer-events-none absolute -left-10 -top-14 h-32 w-32 rounded-full bg-indigo-500/10 blur-3xl dark:bg-indigo-400/10" />
              <span aria-hidden="true" className="relative block h-1 w-10 rounded-full bg-gradient-to-r from-indigo-600 to-amber-500" />

              <h2 className="relative mt-5 font-display text-[1.75rem] font-extrabold leading-[1.12] tracking-tight text-balance sm:text-[2.15rem]">
                Join the{' '}
                <span className="whitespace-nowrap bg-gradient-to-r from-indigo-600 via-indigo-500 to-amber-600 bg-clip-text text-transparent dark:from-indigo-400 dark:via-indigo-400 dark:to-amber-400">
                  Traqi Team
                </span>
              </h2>
            </div>

            <form onSubmit={submit} noValidate className="mt-7 space-y-4">
              {/* The role comes first: it is the one answer that decides how we
                  read everything else on the form. */}
              <fieldset>
                <legend className="mb-1.5 block text-[13px] font-semibold text-slate-700 dark:text-slate-300">
                  Role you are applying for
                </legend>
                <p className="-mt-0.5 mb-2.5 text-xs text-slate-500 dark:text-slate-400">Choose one role per application.</p>
                <div role="radiogroup" className="grid gap-2" data-invalid={errors.role ? 'true' : undefined} tabIndex={-1}>
                  {TEAM_ROLES.map((r, i) => {
                    const on = f.role === r.name;
                    return (
                      <label key={r.name} htmlFor={'t-role-' + i}
                        className={'flex cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-3 text-sm transition-colors '
                          + (on
                            ? 'border-indigo-500 bg-indigo-50 text-indigo-900 dark:border-indigo-400 dark:bg-indigo-500/10 dark:text-indigo-100'
                            : errors.role
                              ? 'border-red-400 dark:border-red-500/70'
                              : 'border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700')}>
                        <input id={'t-role-' + i} type="radio" name="role" value={r.name} checked={on}
                          onChange={set('role')} className="sr-only" />
                        <span aria-hidden="true" className={'grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 transition-colors '
                          + (on ? 'border-indigo-600 bg-indigo-600 dark:border-indigo-400 dark:bg-indigo-400' : 'border-slate-300 dark:border-slate-600')}>
                          {on && <Check className="h-3 w-3 text-white dark:text-slate-950" strokeWidth={3} />}
                        </span>
                        <span className="font-semibold">{r.name}</span>
                      </label>
                    );
                  })}
                </div>
                <Err msg={errors.role} />
              </fieldset>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="t-first">First name</Label>
                  <input id="t-first" value={f.firstName} onChange={set('firstName')} autoComplete="given-name"
                    placeholder="Amaka" maxLength={LIMITS.short} {...invalid('firstName')} />
                  <Err msg={errors.firstName} />
                </div>
                <div>
                  <Label htmlFor="t-surname">Surname</Label>
                  <input id="t-surname" value={f.surname} onChange={set('surname')} autoComplete="family-name"
                    placeholder="Ade" maxLength={LIMITS.short} {...invalid('surname')} />
                  <Err msg={errors.surname} />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="t-email">Email</Label>
                  <input id="t-email" type="email" inputMode="email" value={f.email} onChange={set('email')}
                    autoComplete="email" placeholder="you@mail.com" maxLength={LIMITS.short} {...invalid('email')} />
                  <Err msg={errors.email} />
                </div>
                <div>
                  <Label htmlFor="t-whatsapp">WhatsApp number</Label>
                  <input id="t-whatsapp" type="tel" inputMode="tel" value={f.whatsapp} onChange={set('whatsapp')}
                    autoComplete="tel" placeholder="0803 000 0000" maxLength={LIMITS.short} {...invalid('whatsapp')} />
                  <Err msg={errors.whatsapp} />
                </div>
              </div>

              <div>
                <Label htmlFor="t-location">Location</Label>
                <input id="t-location" value={f.location} onChange={set('location')} autoComplete="address-level2"
                  placeholder="Abeokuta, Ogun State" maxLength={LIMITS.short} {...invalid('location')} />
                <Err msg={errors.location} />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="t-occupation">What do you do now?</Label>
                  <OptionSelect id="t-occupation" value={f.occupation} onChange={choose('occupation')}
                    placeholder="Select…" invalid={!!errors.occupation} triggerClassName={invalid('occupation').className}
                    options={OCCUPATIONS.map(o => ({ value: o }))} />
                  <Err msg={errors.occupation} />
                </div>
                <div>
                  <Label htmlFor="t-availability">Time you can give weekly</Label>
                  <OptionSelect id="t-availability" value={f.availability} onChange={choose('availability')}
                    placeholder="Select…" invalid={!!errors.availability} triggerClassName={invalid('availability').className}
                    options={AVAILABILITY.map(a => ({ value: a }))} />
                  <Err msg={errors.availability} />
                </div>
              </div>

              <div>
                <Label htmlFor="t-portfolio" optional>Portfolio, LinkedIn or work sample</Label>
                <input id="t-portfolio" type="url" inputMode="url" value={f.portfolio} onChange={set('portfolio')}
                  placeholder="linkedin.com/in/yourname" maxLength={LIMITS.link} {...invalid('portfolio')} />
                <Err msg={errors.portfolio} />
              </div>

              <div>
                <Label htmlFor="t-experience">Your skills and experience</Label>
                <p className="-mt-1 mb-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                  What have you done that prepares you for this role? Tools you use, work you are proud of.
                </p>
                <textarea id="t-experience" rows={4} value={f.experience} onChange={set('experience')} maxLength={LIMITS.long}
                  placeholder="I have managed the Instagram page for two local brands and…" {...invalid('experience')} />
                <Err msg={errors.experience} />
              </div>

              <div>
                <Label htmlFor="t-motivation">Why do you want to join the Traqi Team?</Label>
                <p className="-mt-1 mb-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                  If you have the skill, the drive and the heart for meaningful work, tell us about it.
                </p>
                <textarea id="t-motivation" rows={3} value={f.motivation} onChange={set('motivation')} maxLength={LIMITS.long}
                  placeholder="I want to help small businesses like my mum's shop…" {...invalid('motivation')} />
                <Err msg={errors.motivation} />
              </div>

              {failed && (
                <p role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600 dark:border-red-500/25 dark:bg-red-500/10 dark:text-red-400">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{failed}
                </p>
              )}

              <button type="submit" disabled={busy}
                className="group mt-2 inline-flex w-full items-center justify-center gap-2.5 rounded-xl bg-indigo-600 px-6 py-4 font-bold text-white transition-all hover:bg-indigo-700 hover:shadow-xl hover:shadow-indigo-500/25 disabled:cursor-not-allowed disabled:opacity-60">
                {busy
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending your application…</>
                  : <><Send className="h-4 w-4 transition-transform group-hover:translate-x-0.5" /> Submit application</>}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
