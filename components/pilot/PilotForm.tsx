'use client';
/* Traqi — the pilot application form.

   The whole page exists to fill this in, so it is the only thing on /pilot
   that submits anywhere. Details land in Firestore under `pilotSignups`, and
   the moment one does the card turns into the invitation to open a WhatsApp
   conversation — which is the actual point of the exercise. Nobody reaches
   the product from here; we let people in by hand, after we have spoken. */

import { useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2, PartyPopper, Send } from 'lucide-react';
import {
  BLANK_SIGNUP, BUSINESS_CATEGORIES, LIMITS, OTHER_CATEGORY, WHATSAPP_DISPLAY,
  isEmail, isPhone, submitPilotSignup, whatsappLink, type PilotSignup
} from '@/lib/pilot';

type Errors = Partial<Record<keyof PilotSignup, string>>;

/** WhatsApp's own glyph. Lucide's MessageCircle reads as any chat app; at the
    size this button wants it, the real mark is what people recognise. */
const WhatsAppMark = ({ className = '' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.174.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
  </svg>
);

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
function Done() {
  return (
    /* Everything on one centre line, and centred in the card as well: on a
       desktop the card is a fixed square, and this panel is far shorter than
       the form it replaced, so left alone it would sit in the top corner of a
       lot of empty white. */
    <div className="pilot-pop flex min-h-full flex-col items-center justify-center text-center">
      <span className="grid h-16 w-16 place-items-center rounded-2xl bg-green-50 dark:bg-green-500/10">
        <PartyPopper className="h-8 w-8 text-green-600 dark:text-green-400" />
      </span>

      <h3 className="mt-5 font-display text-2xl font-extrabold text-balance sm:text-3xl">
        You are now on the list
      </h3>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">One more step</p>

      <div className="relative mt-7 w-full">
        {/* A quiet halo behind the panel, so the eye goes there and nowhere
            else on the card. */}
        <span aria-hidden="true" className="pilot-halo absolute inset-0 rounded-2xl bg-green-500/30 blur-xl" />
        <div className="relative rounded-2xl border border-green-200 bg-gradient-to-br from-green-50 to-white px-3 py-7 dark:border-green-500/20 dark:from-green-500/10 dark:to-slate-900 sm:px-6">
          <p className="mx-auto max-w-[28ch] font-display text-lg font-extrabold leading-snug text-balance">
            Would you like to be one of the early users to use this application?
          </p>
          <p className="mt-2.5 text-sm text-slate-500 dark:text-slate-400">Send Traqi a message now</p>

          {/* Mark and words as one unit: a tight gap, centred on each other,
              and the label on a single line whatever the screen. Keeping it
              unbroken while leaving clear space at both ends is what wa-cta
              in globals.css is for — it sizes the label off the button's own
              width rather than the viewport's. */}
          <a href={whatsappLink()} target="_blank" rel="noopener noreferrer"
            className="wa-cta pilot-nudge mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-3 py-4 font-bold text-white shadow-lg shadow-green-600/25 transition-all hover:bg-[#1FB855] hover:shadow-xl hover:shadow-green-600/30 sm:gap-2.5 sm:px-5">
            <WhatsAppMark className="h-6 w-6 shrink-0 sm:h-7 sm:w-7" />
            <span className="wa-cta-label whitespace-nowrap leading-none">
              Continue with Traqi Admin on WhatsApp
            </span>
          </a>

          <p className="tnum mt-3.5 text-xs text-slate-400">{WHATSAPP_DISPLAY}</p>
        </div>
      </div>

      <p className="mt-7 flex items-center justify-center gap-2 text-sm text-slate-500 dark:text-slate-400">
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
        {done ? <Done /> : (
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
                <Label htmlFor="p-about">Tell us briefly, in a sentence</Label>
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
