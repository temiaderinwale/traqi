'use client';
/* Traqi — the pilot application form.

   The whole page exists to fill this in, so it is the only thing on /pilot
   that submits anywhere. Details land in Firestore under `pilotSignups`, and
   the moment one does the card turns into the invitation to open a WhatsApp
   conversation — which is the actual point of the exercise. Nobody reaches
   the product from here; we let people in by hand, after we have spoken. */

import { useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2, PartyPopper, Send, SendHorizontal } from 'lucide-react';
import {
  BLANK_SIGNUP, BUSINESS_CATEGORIES, LIMITS, OTHER_CATEGORY, WHATSAPP_DISPLAY,
  isEmail, isPhone, signupMessage, submitPilotSignup, whatsappLink, type PilotSignup
} from '@/lib/pilot';

type Errors = Partial<Record<keyof PilotSignup, string>>;

const FIELD = 'w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-900 transition-colors placeholder:text-slate-400 '
  + 'dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-600';
const OK = ' border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700';
const BAD = ' border-red-400 dark:border-red-500/70';

function Label({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-[13px] font-semibold text-slate-700 dark:text-slate-300">
      {children}
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

function validate(f: PilotSignup): Errors {
  const e: Errors = {};
  if (!f.firstName.trim()) e.firstName = 'Please enter your first name.';
  if (!f.surname.trim()) e.surname = 'Please enter your surname.';
  if (!f.business.trim()) e.business = 'Please enter the name of your business.';
  if (!f.category) e.category = 'Please choose a category.';
  else if (f.category === OTHER_CATEGORY && !f.categoryOther.trim()) e.categoryOther = 'Please tell us your category.';
  if (!f.location.trim()) e.location = 'Please enter your location.';
  if (!f.email.trim()) e.email = 'Please enter your email address.';
  else if (!isEmail(f.email)) e.email = 'Please enter a valid email address.';
  if (!f.whatsapp.trim()) e.whatsapp = 'Please enter your WhatsApp number.';
  else if (!isPhone(f.whatsapp)) e.whatsapp = 'Please enter a valid phone number.';
  /* No length floor here on purpose: somebody with very little to say should
     still be able to send the form. */
  if (!f.about.trim()) e.about = 'Please tell us briefly about your business.';
  return e;
}

/** What replaces the form once an application is in. Loud on purpose: this is
    the one step we need people to take, and they have just told us they are
    interested, so the moment to ask is now. */
function Done({ f }: { f: PilotSignup }) {
  return (
    /* Everything on one centre line, and centred in the card as well: on a
       desktop the card is a fixed square, and this panel is far shorter than
       the form it replaced, so left alone it would sit in the top corner of a
       lot of empty white. */
    <div className="pilot-pop flex min-h-full flex-col items-center justify-center text-center">
      {/* The same gold-through-purple run as the button below it, turned on
          the diagonal so the two read as a pair rather than a repeat. */}
      <span className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-amber-400 via-orange-500 to-indigo-600 shadow-lg shadow-orange-500/25">
        <PartyPopper className="h-8 w-8 text-white" />
      </span>

      <h3 className="mt-5 font-display text-2xl font-extrabold text-balance sm:text-3xl">
        You are now on the list
      </h3>

      <div className="relative mt-7 w-full">
        {/* A quiet halo behind the button, so the eye goes there and nowhere
            else on the card. */}
        <span aria-hidden="true" className="pilot-halo absolute inset-0 rounded-2xl bg-amber-500/30 blur-xl" />

        {/* Gold running into the brand indigo — Traqi's own two colours. The
            label is short enough to sit large, and `wa-cta` sizes it off the
            button's own width so it keeps clear air at both ends at every
            screen size rather than only at the one it was tuned on. */}
        <a href={whatsappLink(signupMessage(f))} target="_blank" rel="noopener noreferrer"
          className="wa-cta pilot-nudge relative flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-amber-500 via-orange-600 to-indigo-700 px-4 py-4 font-bold text-white shadow-lg shadow-amber-600/25 transition-all hover:shadow-xl hover:shadow-amber-600/35 hover:brightness-110 sm:px-6">
          {/* One font-size on the inner row drives both the words and the
              icon, so the mark grows and shrinks with the label instead of
              needing its own matching set of sizes. */}
          <span className="wa-cta-inner">
            <SendHorizontal className="wa-cta-icon" />
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

export default function PilotForm() {
  const [f, setF] = useState<PilotSignup>(BLANK_SIGNUP);
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState('');
  const [done, setDone] = useState(false);
  const card = useRef<HTMLDivElement>(null);

  /* Clearing a field's error as it is corrected, rather than only on the next
     submit, keeps a long form from feeling like it is scolding you. */
  const set = (k: keyof PilotSignup) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const v = e.target.value;
    setF(p => ({ ...p, [k]: v }));
    setErrors(p => (p[k] ? { ...p, [k]: undefined } : p));
  };

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
      await submitPilotSignup(f);
      setDone(true);
      card.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch {
      setFailed('We could not save your details just now. Please check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  const invalid = (k: keyof PilotSignup) => ({
    'data-invalid': errors[k] ? 'true' : undefined,
    'aria-invalid': errors[k] ? true : undefined,
    className: FIELD + (errors[k] ? BAD : OK)
  });

  return (
    <div ref={card} id="early-access" className="scroll-mt-28">
      {/* On a desktop the card is exactly as tall as the square beside it and
          scrolls its own contents, so the carousel never leaves the screen
          while somebody works down the form. Both columns are the same width,
          so one aspect-square on each is all it takes to match them. */}
      <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-900/5 dark:border-slate-800 dark:bg-slate-900 sm:p-8 lg:aspect-square lg:overflow-y-auto">
        {done ? <Done f={f} /> : (
          <>
            {/* The card opens on type alone — no badge, no icon, nothing
                boxed in behind the words. The colour is in the letterforms
                themselves: the brand's indigo running into its amber straight
                through "early user", under a short rule of the same gradient.
                The product name stays plain text: the wordmark sets its amber
                tittle from a dotless i, and at display size that mark reads as
                a stray tick — it belongs at nav size, where it already is. */}
            <div className="relative">
              <span aria-hidden="true" className="pointer-events-none absolute -left-10 -top-14 h-32 w-32 rounded-full bg-indigo-500/10 blur-3xl dark:bg-indigo-400/10" />
              <span aria-hidden="true" className="relative block h-1 w-10 rounded-full bg-gradient-to-r from-indigo-600 to-amber-500" />

              <h2 className="relative mt-5 font-display text-[1.75rem] font-extrabold leading-[1.12] tracking-tight text-balance sm:text-[2.15rem]">
                Become an{' '}
                {/* Held on one line: a clipped gradient is cut into per-line
                    fragments when it wraps, which would leave "early" in
                    indigo and "user" in amber rather than one run of colour.
                    The light-mode tail stops at amber-600 — amber-500 on
                    white is under 3:1 even at display size. */}
                <span className="whitespace-nowrap bg-gradient-to-r from-indigo-600 via-indigo-500 to-amber-600 bg-clip-text text-transparent dark:from-indigo-400 dark:via-indigo-400 dark:to-amber-400">
                  early user
                </span>{' '}
                of Traqi
              </h2>

              {/* Plain text here: the wordmark is set at 800 weight, which in
                  a sentence this size reads as a shout rather than a name. It
                  earns its place once, in the heading. */}
              <p className="relative mt-3.5 max-w-[44ch] text-[0.95rem] leading-relaxed text-slate-500 dark:text-slate-400">
                We are opening Traqi to a small group of business owners first. Tell us about your business.
              </p>
            </div>

            <form onSubmit={submit} noValidate className="mt-7 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="p-first">First name</Label>
                  <input id="p-first" value={f.firstName} onChange={set('firstName')} autoComplete="given-name"
                    placeholder="Amaka" maxLength={LIMITS.short} {...invalid('firstName')} />
                  <Err msg={errors.firstName} />
                </div>
                <div>
                  <Label htmlFor="p-surname">Surname</Label>
                  <input id="p-surname" value={f.surname} onChange={set('surname')} autoComplete="family-name"
                    placeholder="Ade" maxLength={LIMITS.short} {...invalid('surname')} />
                  <Err msg={errors.surname} />
                </div>
              </div>

              <div>
                <Label htmlFor="p-business">Name of business</Label>
                <input id="p-business" value={f.business} onChange={set('business')} autoComplete="organization"
                  placeholder="Amaka Scents & Beauty" maxLength={LIMITS.short} {...invalid('business')} />
                <Err msg={errors.business} />
              </div>

              <div>
                <Label htmlFor="p-category">Category of business</Label>
                <select id="p-category" value={f.category} onChange={set('category')} {...invalid('category')}>
                  <option value="">Select your category…</option>
                  {BUSINESS_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <Err msg={errors.category} />
                {f.category === OTHER_CATEGORY && (
                  <div className="pilot-pop mt-3">
                    <Label htmlFor="p-category-other">Tell us your category</Label>
                    <input id="p-category-other" value={f.categoryOther} onChange={set('categoryOther')} autoFocus
                      placeholder="e.g. Bakery & Confectionery" maxLength={LIMITS.short} {...invalid('categoryOther')} />
                    <Err msg={errors.categoryOther} />
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="p-location">Location</Label>
                <input id="p-location" value={f.location} onChange={set('location')} autoComplete="address-level2"
                  placeholder="Abeokuta, Ogun State" maxLength={LIMITS.short} {...invalid('location')} />
                <Err msg={errors.location} />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="p-email">Email</Label>
                  <input id="p-email" type="email" inputMode="email" value={f.email} onChange={set('email')}
                    autoComplete="email" placeholder="you@mail.com" maxLength={LIMITS.short} {...invalid('email')} />
                  <Err msg={errors.email} />
                </div>
                <div>
                  <Label htmlFor="p-whatsapp">WhatsApp number</Label>
                  <input id="p-whatsapp" type="tel" inputMode="tel" value={f.whatsapp} onChange={set('whatsapp')}
                    autoComplete="tel" placeholder="0803 000 0000" maxLength={LIMITS.short} {...invalid('whatsapp')} />
                  <Err msg={errors.whatsapp} />
                </div>
              </div>

              {/* One box for both questions — the second is an instruction to
                  put anything else in this same answer, not a field of its own. */}
              <div>
                <Label htmlFor="p-about">Tell us briefly</Label>
                <p className="-mt-1 mb-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                  How do you believe Traqi can better organise your business operations?
                </p>
                <textarea id="p-about" rows={4} value={f.about} onChange={set('about')} maxLength={LIMITS.long}
                  placeholder="Right now our sales and stock live in a notebook, and Traqi would let us…"
                  {...invalid('about')} />
                {/* Sits under the box because it is about what to put in it. */}
                <p className="mt-1.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                  Anything else you would like to share? Include above.
                </p>
                <Err msg={errors.about} />
              </div>

              {failed && (
                <p role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600 dark:border-red-500/25 dark:bg-red-500/10 dark:text-red-400">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{failed}
                </p>
              )}

              <button type="submit" disabled={busy}
                className="group mt-2 inline-flex w-full items-center justify-center gap-2.5 rounded-xl bg-indigo-600 px-6 py-4 font-bold text-white transition-all hover:bg-indigo-700 hover:shadow-xl hover:shadow-indigo-500/25 disabled:cursor-not-allowed disabled:opacity-60">
                {busy
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending your details…</>
                  : <><Send className="h-4 w-4 transition-transform group-hover:translate-x-0.5" /> Apply for early access</>}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
