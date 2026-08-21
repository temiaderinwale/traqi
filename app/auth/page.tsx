'use client';
/* Traqi — authentication, registration and onboarding */

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, Eye, EyeOff, Package, PartyPopper, Users } from 'lucide-react';
import { useTraqi } from '@/lib/store';
import { authError, strength, nextId } from '@/lib/format';
import { Field } from '@/components/ui';
import { Mark, Wordmark } from '@/components/Brand';
import Preloader from '@/components/Preloader';

type Panel = 'si' | 'pw' | 'reg' | 'reset';

/* PINs and passwords are always typed fresh — browsers and password managers
   refill any password box on sight, including the 4-digit PIN. 'new-password'
   is what actually stops Chrome; the data-* flags cover LastPass/1Password/
   Dashlane. Names, emails and usernames still autofill normally. */
const NO_AUTOFILL = {
  autoComplete: 'new-password',
  'data-lpignore': 'true',
  'data-1p-ignore': 'true',
  'data-form-type': 'other'
} as const;

const GoogleIcon = () => (
  <svg width="17" height="17" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
    <path fill="#FF3D00" d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
    <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
    <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
  </svg>
);


export default function AuthPage() {
  const t = useTraqi();
  const router = useRouter();
  const [panel, setPanel] = useState<Panel>('si');
  const [msg, setMsg] = useState<{ text: string; type: 'err' | 'ok' } | null>(null);
  const [loading, setLoading] = useState(false);
  /* Credentials accepted — raise the preloader and keep it up. The store still
     has to load the workspace and the router still has to reach /dashboard;
     without this the form would reappear for both of those beats. */
  const [entering, setEntering] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const [siUser, setSiUser] = useState(''); const [siPin, setSiPin] = useState('');
  const [pwEmail, setPwEmail] = useState(''); const [pwPass, setPwPass] = useState('');
  const [rBiz, setRBiz] = useState(''); const [rUser, setRUser] = useState(''); const [rEmail, setREmail] = useState('');
  const [rPw, setRPw] = useState(''); const [rPw2, setRPw2] = useState(''); const [rPin, setRPin] = useState('');
  const [rsEmail, setRsEmail] = useState('');
  const [gBiz, setGBiz] = useState(''); const [gUser, setGUser] = useState(''); const [gPin, setGPin] = useState('');

  /* 'ready' goes straight in; 'pin' needs the role gate, which lives in AppShell. */
  useEffect(() => {
    if (t.stage === 'ready' || t.stage === 'pin') router.replace('/dashboard');
  }, [t.stage, router]);

  /* Signing out from a post-auth panel drops the curtain and returns the form. */
  useEffect(() => { if (t.stage === 'signedOut') setEntering(false); }, [t.stage]);

  /* Sign-up CTAs link to /auth?tab=register; everything else opens on Sign In.
     Read after mount so the server-rendered markup stays the 'si' default. */
  useEffect(() => {
    const tab = new URLSearchParams(window.location.search).get('tab');
    if (tab === 'register' || tab === 'reg') setPanel('reg');
  }, []);

  const st = strength(rPw);
  const go = (p: Panel) => { setPanel(p); setMsg(null); };

  const doPin = async () => {
    if (!siUser || !siPin) return setMsg({ text: 'Enter your username and PIN.', type: 'err' });
    if (!/^\d{4}$/.test(siPin)) return setMsg({ text: 'PIN must be exactly 4 digits.', type: 'err' });
    setLoading(true);
    const res = await t.signInPin(siUser, siPin);
    setLoading(false);
    if (res === 'ok') setEntering(true);
    else if (res === 'badpin') setMsg({ text: 'Incorrect PIN. Try again.', type: 'err' });
    else if (res === 'notfound') { setMsg({ text: "PIN sign-in isn't set up on this device yet — sign in once with Google or your password.", type: 'err' }); setTimeout(() => go('pw'), 2600); }
    else if (res === 'badcred') { setMsg({ text: 'Saved login expired — sign in with your password to restore PIN sign-in.', type: 'err' }); setTimeout(() => go('pw'), 2400); }
    else if (res === 'cancelled') setMsg({ text: 'Google sign-in was closed before it finished — try again.', type: 'err' });
    else if (res === 'wrongaccount') setMsg({ text: `That's a different Google account. Choose the one ${siUser} was set up with.`, type: 'err' });
    else if (res === 'error') setMsg({ text: 'Something went wrong. Please try again.', type: 'err' });
  };

  const doPw = async () => {
    if (!pwEmail || !pwPass) return setMsg({ text: 'Fill in both fields.', type: 'err' });
    setLoading(true);
    try { await t.signInPassword(pwEmail, pwPass); setEntering(true); }
    catch (e: any) { setMsg({ text: authError(e?.code), type: 'err' }); }
    setLoading(false);
  };

  const doReg = async () => {
    if (!rBiz || !rUser || !rEmail || !rPw || !rPw2 || !rPin) return setMsg({ text: 'Fill in all fields.', type: 'err' });
    if (rPw !== rPw2) return setMsg({ text: 'Passwords do not match.', type: 'err' });
    if (rPw.length < 6) return setMsg({ text: 'Password must be at least 6 characters.', type: 'err' });
    if (!/^\d{4}$/.test(rPin)) return setMsg({ text: 'PIN must be exactly 4 digits.', type: 'err' });
    setLoading(true);
    try { await t.register(rEmail, rPw, rUser, rPin, rBiz); setEntering(true); }
    catch (e: any) { setMsg({ text: authError(e?.code), type: 'err' }); }
    setLoading(false);
  };

  const doGoogle = async () => {
    setLoading(true);
    /* Resolves once the Google account is picked and the popup closes. */
    try { await t.googleAuth(); setEntering(true); } catch (e: any) { setMsg({ text: authError(e?.code), type: 'err' }); }
    setLoading(false);
  };

  const doReset = async () => {
    if (!rsEmail) return setMsg({ text: 'Enter your email address.', type: 'err' });
    setLoading(true);
    try { await t.resetPassword(rsEmail); setMsg({ text: 'Reset link sent — check your inbox.', type: 'ok' }); }
    catch (e: any) { setMsg({ text: authError(e?.code), type: 'err' }); }
    setLoading(false);
  };

  /* ---------- Post-auth stages ---------- */
  /* Signed in and on the way to /dashboard — hold the curtain over the redirect. */
  if (t.stage === 'ready' || t.stage === 'pin') return <Preloader />;
  if (t.stage === 'verify') return <Centered><VerifyPanel /></Centered>;
  if (t.stage === 'completeProfile') {
    return (
      <Centered>
        <h3 className="font-display" style={{ fontSize: '1.1rem', margin: '0 0 4px' }}>Complete your registration</h3>
        <p className="hint" style={{ marginBottom: 18 }}>You&apos;re signed in with Google — just a few details to finish setting up.</p>
        <div className="form-grid" style={{ marginBottom: 14 }}>
          <Field label="Business name"><input value={gBiz} onChange={e => setGBiz(e.target.value)} placeholder="Scentelle Fragrances" /></Field>
          <Field label="Username"><input value={gUser} onChange={e => setGUser(e.target.value)} placeholder="amaka" /></Field>
        </div>
        <Field label="4-digit PIN">
          <input type="password" className="pin-input" maxLength={4} inputMode="numeric" placeholder="••••" {...NO_AUTOFILL}
            value={gPin} onChange={e => setGPin(e.target.value.replace(/\D/g, '').slice(0, 4))} />
        </Field>
        <button className="btn btn-primary btn-block" style={{ marginTop: 18 }} disabled={loading}
          onClick={async () => {
            if (!gBiz || !gUser || !/^\d{4}$/.test(gPin)) return setMsg({ text: 'Fill in all fields (PIN must be 4 digits).', type: 'err' });
            setLoading(true);
            try { await t.completeGoogleProfile(gUser, gPin, gBiz); } catch { setMsg({ text: 'Could not complete registration.', type: 'err' }); }
            setLoading(false);
          }}>Complete Registration</button>
        {msg && <div className={'msg ' + msg.type}>{msg.text}</div>}
        <p className="hint" style={{ textAlign: 'center', marginTop: 14 }}>
          <button className="link-btn" onClick={t.logout}>← Cancel and use a different account</button>
        </p>
      </Centered>
    );
  }
  if (t.stage === 'onboarding') return <Onboarding />;
  /* Credentials accepted, workspace still loading — no glimpse of the form. */
  if (entering) return <Preloader />;

  /* ---------- Sign in / register ---------- */
  return (
    <div className="auth-wrap" style={{ display: 'grid' }}>
      <aside className="auth-left">
        <div className="mark-pattern" />
        <Link href="/" aria-label="Traqi home"
          style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 10, alignSelf: 'flex-start' }}>
          <Mark dark size={36} /><Wordmark className="" />
        </Link>
        <div style={{ position: 'relative' }}>
          <h1 className="font-display" style={{ fontSize: '3rem', fontWeight: 800, lineHeight: 1.08, margin: 0 }}>Track it.<br />Grow it.</h1>
          <p style={{ color: 'var(--indigo-400)', marginTop: 16, maxWidth: '24rem', lineHeight: 1.6 }}>
            Everything your business needs to sell, restock and keep customers coming back — in one calm workspace.
          </p>
          <ul style={{ listStyle: 'none', padding: 0, margin: '36px 0 0', display: 'grid', gap: 16, fontSize: '.88rem' }}>
            {['Record sales and send receipts in seconds', 'Smart follow-ups before customers run out', "Financial reports you'll actually read"].map(b => (
              <li key={b} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <span style={{ width: 24, height: 24, borderRadius: 99, background: 'rgba(99,102,241,.25)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                  <Check style={{ width: 14, height: 14, color: '#A5B4FC' }} />
                </span>
                <span style={{ color: '#E0E7FF' }}>{b}</span>
              </li>
            ))}
          </ul>
        </div>
        <p style={{ position: 'relative', fontSize: '.72rem', color: 'rgba(165,180,252,.7)', margin: 0 }}>© 2026 Traqi — An Innovation by Ascendia</p>
      </aside>

      <main className="auth-right">
        <div className="auth-card">
          <h2 className="font-display" style={{ fontSize: '1.7rem', fontWeight: 800, margin: 0 }}>Welcome to Traqi</h2>
          <p className="hint" style={{ marginTop: 6 }}>Sign in to your workspace, or create a new one.</p>

          <div className="auth-tabs">
            <button className={'auth-tab' + (panel !== 'reg' ? ' on' : '')} onClick={() => go('si')}>Sign In</button>
            <button className={'auth-tab' + (panel === 'reg' ? ' on' : '')} onClick={() => go('reg')}>Register</button>
          </div>

          {panel === 'si' && (
            <div className="pnl on">
              <button className="btn btn-secondary btn-block" onClick={doGoogle} disabled={loading}><GoogleIcon />Continue with Google</button>
              <div className="divider"><span>or use username &amp; PIN</span></div>
              <Field label="Username"><input value={siUser} onChange={e => setSiUser(e.target.value)} placeholder="e.g. amaka" /></Field>
              <div className="field" style={{ marginTop: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="label">4-digit PIN</label>
                  <button className="link-btn" onClick={() => go('pw')}>Forgot PIN? Use password →</button>
                </div>
                <div className="eye-wrap">
                  <input type={showPin ? 'text' : 'password'} className="pin-input" maxLength={4} inputMode="numeric" placeholder="••••" {...NO_AUTOFILL}
                    value={siPin} onChange={e => setSiPin(e.target.value.replace(/\D/g, '').slice(0, 4))} onKeyDown={e => e.key === 'Enter' && doPin()} />
                  <button className="eye-btn" onClick={() => setShowPin(v => !v)} tabIndex={-1}>{showPin ? <EyeOff /> : <Eye />}</button>
                </div>
              </div>
              <button className="btn btn-primary btn-block" style={{ marginTop: 18 }} onClick={doPin} disabled={loading}>
                {loading ? 'Please wait…' : 'Sign In'}
              </button>
              {msg && <div className={'msg ' + msg.type}>{msg.text}</div>}
              <p className="hint" style={{ textAlign: 'center', marginTop: 14 }}>
                New to Traqi? <button className="link-btn" onClick={() => go('reg')}>Create an account</button>
              </p>
            </div>
          )}

          {panel === 'pw' && (
            <div className="pnl on">
              <h3 className="font-display" style={{ fontSize: '1.1rem', margin: '0 0 4px' }}>Sign in with password</h3>
              <p className="hint" style={{ marginBottom: 18 }}>PIN forgotten? Use your email and password instead.</p>
              <Field label="Email address"><input type="email" value={pwEmail} onChange={e => setPwEmail(e.target.value)} placeholder="you@business.com" /></Field>
              <div className="field" style={{ marginTop: 14 }}>
                <label className="label">Password</label>
                <div className="eye-wrap">
                  <input type={showPw ? 'text' : 'password'} value={pwPass} onChange={e => setPwPass(e.target.value)} {...NO_AUTOFILL}
                    placeholder="Your password" onKeyDown={e => e.key === 'Enter' && doPw()} />
                  <button className="eye-btn" onClick={() => setShowPw(v => !v)} tabIndex={-1}>{showPw ? <EyeOff /> : <Eye />}</button>
                </div>
              </div>
              <div style={{ textAlign: 'right', marginTop: 8 }}><button className="link-btn" onClick={() => go('reset')}>Forgot password?</button></div>
              <button className="btn btn-primary btn-block" style={{ marginTop: 14 }} onClick={doPw} disabled={loading}>
                {loading ? 'Please wait…' : 'Sign In'}
              </button>
              {msg && <div className={'msg ' + msg.type}>{msg.text}</div>}
              <p className="hint" style={{ textAlign: 'center', marginTop: 14 }}><button className="link-btn" onClick={() => go('si')}>← Back to PIN sign in</button></p>
            </div>
          )}

          {panel === 'reg' && (
            <div className="pnl on">
              <button className="btn btn-secondary btn-block" onClick={doGoogle} disabled={loading}><GoogleIcon />Register with Google</button>
              <div className="divider"><span>or register with email</span></div>
              <div className="form-grid" style={{ marginBottom: 14 }}>
                <Field label="Business name"><input value={rBiz} onChange={e => setRBiz(e.target.value)} placeholder="Scentelle Fragrances" /></Field>
                <Field label="Username"><input value={rUser} onChange={e => setRUser(e.target.value)} placeholder="amaka" /></Field>
              </div>
              <Field label="Email address"><input type="email" value={rEmail} onChange={e => setREmail(e.target.value)} placeholder="you@business.com" /></Field>
              <div className="field" style={{ marginTop: 14 }}>
                <label className="label">Password</label>
                <input type="password" value={rPw} onChange={e => setRPw(e.target.value)} placeholder="At least 6 characters" {...NO_AUTOFILL} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
                  <div className="strength-bar"><span style={{ width: st.width, background: st.color }} /></div>
                  <span style={{ fontSize: '.7rem', fontWeight: 700, width: '5rem', textAlign: 'right', color: st.label ? st.color : 'var(--text-3)' }}>{st.label}</span>
                </div>
              </div>
              <div className="form-grid" style={{ marginTop: 14 }}>
                <Field label="Confirm password"><input type="password" value={rPw2} onChange={e => setRPw2(e.target.value)} placeholder="Repeat password" {...NO_AUTOFILL} /></Field>
                <Field label="4-digit PIN"><input type="password" className="pin-input" maxLength={4} inputMode="numeric" placeholder="••••" {...NO_AUTOFILL}
                  value={rPin} onChange={e => setRPin(e.target.value.replace(/\D/g, '').slice(0, 4))} /></Field>
              </div>
              <p className="hint" style={{ marginTop: 10 }}>Your PIN is a quick sign-in for daily use. Keep your password for account recovery.</p>
              <button className="btn btn-primary btn-block" style={{ marginTop: 16 }} onClick={doReg} disabled={loading}>
                {loading ? 'Please wait…' : 'Create Account'}
              </button>
              {msg && <div className={'msg ' + msg.type}>{msg.text}</div>}
              <p className="hint" style={{ textAlign: 'center', marginTop: 14 }}>
                Have an account? <button className="link-btn" onClick={() => go('si')}>Sign in</button>
              </p>
            </div>
          )}

          {panel === 'reset' && (
            <div className="pnl on">
              <h3 className="font-display" style={{ fontSize: '1.1rem', margin: '0 0 4px' }}>Reset password</h3>
              <p className="hint" style={{ marginBottom: 18 }}>Enter your email — we&apos;ll send a reset link right away.</p>
              <Field label="Email address"><input type="email" value={rsEmail} onChange={e => setRsEmail(e.target.value)} placeholder="you@business.com" /></Field>
              <button className="btn btn-primary btn-block" style={{ marginTop: 16 }} onClick={doReset} disabled={loading}>Send Reset Link</button>
              {msg && <div className={'msg ' + msg.type}>{msg.text}</div>}
              <p className="hint" style={{ textAlign: 'center', marginTop: 14 }}><button className="link-btn" onClick={() => go('pw')}>← Back</button></p>
            </div>
          )}
        </div>
        <p className="hint" style={{ textAlign: 'center', padding: '0 0 22px' }}>© 2026 Traqi — An Innovation by Ascendia</p>
      </main>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 16 }}>
      <div className="card card-p" style={{ maxWidth: 440, width: '100%' }}>{children}</div>
    </div>
  );
}

function VerifyPanel() {
  const { fbUser, resendVerification, checkVerified, logout } = useTraqi();
  const [msg, setMsg] = useState<{ text: string; type: 'err' | 'ok' } | null>(null);
  return (
    <>
      <h3 className="font-display" style={{ fontSize: '1.1rem', margin: '0 0 4px' }}>Verify your email</h3>
      <p className="hint" style={{ marginBottom: 18 }}>
        We sent a verification link to <strong style={{ color: 'var(--indigo-600)' }}>{fbUser?.email}</strong>. Open your inbox, click the link, then continue.
      </p>
      <button className="btn btn-primary btn-block" onClick={async () => {
        const ok = await checkVerified();
        if (!ok) setMsg({ text: 'Not verified yet. Open the link in your inbox (check spam too), then try again.', type: 'err' });
      }}>Continue</button>
      {msg && <div className={'msg ' + msg.type}>{msg.text}</div>}
      <p className="hint" style={{ textAlign: 'center', marginTop: 14 }}>
        <button className="link-btn" onClick={async () => { await resendVerification(); setMsg({ text: 'Verification email sent.', type: 'ok' }); }}>Resend email</button>
        {' · '}
        <button className="link-btn" onClick={logout}>Use a different account</button>
      </p>
    </>
  );
}

function Onboarding() {
  const { ws, save, finishOnboarding, showToast } = useTraqi();
  const [step, setStep] = useState(2);
  const [p, setP] = useState({ name: '', price: '', days: '' });
  const [c, setC] = useState({ name: '', phone: '', bday: '' });

  const saveProduct = () => {
    if (!p.name || !p.price) { showToast('Enter a product name and price'); return; }
    save('products', [...ws.products, {
      id: nextId('PRF', ws.products), name: p.name, cat: 'Other', size: '', cost: 0,
      price: parseFloat(p.price) || 0, stock: 10, reorder: 3, usageDays: parseInt(p.days) || 30,
      restocked: 0, supplier: '', notes: ''
    }]);
    setStep(3);
  };
  const saveCustomer = () => {
    if (!c.name || !c.phone) { showToast('Enter a name and phone number'); return; }
    save('customers', [...ws.customers, {
      id: nextId('CUS', ws.customers), name: c.name, phone: c.phone, wa: c.phone, insta: '', city: '',
      source: '', refby: '', type: 'Regular', bday: c.bday, scent: '', notes: ''
    }]);
    setStep(4);
  };

  return (
    <div className="full-overlay open">
      <div className="modal narrow" style={{ textAlign: 'center' }}>
        <div className="progress" style={{ height: 5, marginBottom: 22 }}><span style={{ width: step * 25 + '%' }} /></div>
        {step === 2 && (
          <>
            <span style={{ width: 56, height: 56, borderRadius: '1rem', background: 'var(--indigo-50)', color: 'var(--indigo-600)', display: 'grid', placeItems: 'center', margin: '0 auto 14px' }}><Package /></span>
            <h3 className="font-display" style={{ fontSize: '1.35rem', fontWeight: 800, margin: '0 0 6px' }}>Add your first product</h3>
            <p className="hint" style={{ marginBottom: 20 }}>This makes the follow-up tracker work from day one.</p>
            <div style={{ display: 'grid', gap: 12, textAlign: 'left' }}>
              <Field label="Product name *"><input value={p.name} onChange={e => setP({ ...p, name: e.target.value })} placeholder="e.g. Rose Elixir" /></Field>
              <Field label="Selling price (₦) *"><input type="number" value={p.price} onChange={e => setP({ ...p, price: e.target.value })} placeholder="8500" /></Field>
              <Field label="Expected usage (days)"><input type="number" value={p.days} onChange={e => setP({ ...p, days: e.target.value })} placeholder="30" /></Field>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setStep(3)}>Skip</button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={saveProduct}>Save &amp; continue</button>
            </div>
          </>
        )}
        {step === 3 && (
          <>
            <span style={{ width: 56, height: 56, borderRadius: '1rem', background: 'var(--indigo-50)', color: 'var(--indigo-600)', display: 'grid', placeItems: 'center', margin: '0 auto 14px' }}><Users /></span>
            <h3 className="font-display" style={{ fontSize: '1.35rem', fontWeight: 800, margin: '0 0 6px' }}>Add your first customer</h3>
            <p className="hint" style={{ marginBottom: 20 }}>Birthday alerts and follow-ups start working for them straight away.</p>
            <div style={{ display: 'grid', gap: 12, textAlign: 'left' }}>
              <Field label="Customer name *"><input value={c.name} onChange={e => setC({ ...c, name: e.target.value })} placeholder="e.g. Amaka Obi" /></Field>
              <Field label="Phone / WhatsApp *"><input value={c.phone} onChange={e => setC({ ...c, phone: e.target.value })} placeholder="0801…" /></Field>
              <Field label="Birthday (DD/MM)"><input value={c.bday} onChange={e => setC({ ...c, bday: e.target.value })} placeholder="14/02" maxLength={5} /></Field>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setStep(4)}>Skip</button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={saveCustomer}>Save &amp; continue</button>
            </div>
          </>
        )}
        {step === 4 && (
          <>
            <span style={{ width: 56, height: 56, borderRadius: '1rem', background: 'var(--green-50)', color: 'var(--green-600)', display: 'grid', placeItems: 'center', margin: '0 auto 14px' }}><PartyPopper /></span>
            <h3 className="font-display" style={{ fontSize: '1.35rem', fontWeight: 800, margin: '0 0 6px' }}>You&apos;re all set!</h3>
            <p className="hint" style={{ marginBottom: 18 }}>Here&apos;s what&apos;s waiting inside:</p>
            <div style={{ textAlign: 'left', background: 'var(--surface-2)', borderRadius: '.85rem', padding: 16, fontSize: '.84rem', lineHeight: 2, color: 'var(--text-2)' }}>
              <strong style={{ color: 'var(--text)' }}>Follow-up tracker</strong> — never miss a reorder<br />
              <strong style={{ color: 'var(--text)' }}>Birthday alerts</strong> — wish customers on time<br />
              <strong style={{ color: 'var(--text)' }}>Sales log</strong> — record sales in seconds<br />
              <strong style={{ color: 'var(--text)' }}>Daily briefing</strong> — your day at a glance<br />
              <strong style={{ color: 'var(--text)' }}>Receipts</strong> — professional and shareable
            </div>
            <button className="btn btn-primary btn-block" style={{ marginTop: 20 }} onClick={finishOnboarding}>Enter dashboard →</button>
          </>
        )}
      </div>
    </div>
  );
}
