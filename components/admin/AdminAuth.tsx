'use client';
/* Traqi — /admin sign in, registration, and the waiting-room screens. */

import React, { useState } from 'react';
import { Eye, EyeOff, MailCheck, ShieldAlert, ShieldCheck, ShieldX } from 'lucide-react';
import { useAdmin, NoAdminAccess, WrongSignInMethod } from '@/lib/adminStore';
import { authError, strength } from '@/lib/format';
import { Field } from '@/components/ui';
import { Mark, Wordmark } from '@/components/Brand';

/* Admin credentials are always typed fresh — see the same note in app/auth. */
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

function Frame({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <div className="auth-wrap" style={{ display: 'grid' }}>
      <aside className="auth-left">
        <div className="mark-pattern" />
        <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 10, alignSelf: 'flex-start' }}>
          <Mark dark size={36} /><Wordmark className="" />
        </span>
        <div style={{ position: 'relative' }}>
          <span className="badge" style={{ background: 'rgba(99,102,241,.25)', color: '#C7D2FE', marginBottom: 18, display: 'inline-block' }}>
            Product Admin
          </span>
          <h1 className="font-display" style={{ fontSize: '2.6rem', fontWeight: 800, lineHeight: 1.1, margin: 0 }}>
            The console<br />behind Traqi.
          </h1>
          <p style={{ color: 'var(--indigo-400)', marginTop: 16, maxWidth: '24rem', lineHeight: 1.6 }}>
            Every business on the platform, the volume they process, the plans they sit on, and the
            newsletters that reach them — in one place.
          </p>
        </div>
        <p style={{ position: 'relative', fontSize: '.72rem', color: 'rgba(165,180,252,.7)', margin: 0 }}>
          Restricted area — Traqi staff only.
        </p>
      </aside>
      <main className="auth-right">
        <div className="auth-card">
          <h2 className="font-display" style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0 }}>{title}</h2>
          <p className="hint" style={{ marginTop: 6 }}>{sub}</p>
          {children}
        </div>
      </main>
    </div>
  );
}

/* ---------- Post sign-in dead ends ---------- */
function Notice({ icon: Icon, tone, title, text }: {
  icon: typeof ShieldCheck; tone: string; title: string; text: string;
}) {
  const { logout, fbUser } = useAdmin();
  return (
    <Frame title="Admin access" sub={fbUser?.email || ''}>
      <div style={{ textAlign: 'center', padding: '18px 0 6px' }}>
        <span style={{ width: 62, height: 62, borderRadius: '1.1rem', background: tone + '1f', color: tone, display: 'grid', placeItems: 'center', margin: '0 auto 16px' }}>
          <Icon style={{ width: 28, height: 28 }} />
        </span>
        <h3 className="font-display" style={{ fontSize: '1.15rem', fontWeight: 800, margin: '0 0 8px' }}>{title}</h3>
        <p className="hint" style={{ maxWidth: '22rem', margin: '0 auto', lineHeight: 1.6 }}>{text}</p>
        <button className="btn btn-secondary btn-block" style={{ marginTop: 24 }} onClick={logout}>Sign out</button>
      </div>
    </Frame>
  );
}

export function PendingScreen() {
  return (
    <Notice icon={MailCheck} tone="#F59E0B" title="Waiting for approval"
      text="Your admin request has been sent to the Traqi owner account. You'll get in as soon as it's approved — sign in again then." />
  );
}
export function NoAccessScreen() {
  return (
    <Notice icon={ShieldAlert} tone="#DC2626" title="No admin access"
      text="This account is authenticated but has no admin record. If you're meant to be here, register for admin access and ask the owner to approve you." />
  );
}
export function RejectedScreen() {
  return (
    <Notice icon={ShieldX} tone="#DC2626" title="Request declined"
      text="Your admin request was declined. Contact the Traqi owner account if you think that's a mistake." />
  );
}
export function SuspendedScreen() {
  return (
    <Notice icon={ShieldX} tone="#DC2626" title="Access suspended"
      text="This admin account has been suspended. Contact the Traqi owner account to restore it." />
  );
}

/* ---------- Sign in / register ---------- */
export default function AdminAuth() {
  const { signIn, register, googleAuth, resetPassword } = useAdmin();
  const [tab, setTab] = useState<'si' | 'reg'>('si');
  const [msg, setMsg] = useState<{ text: string; type: 'err' | 'ok' } | null>(null);
  const [loading, setLoading] = useState(false);

  const [siEmail, setSiEmail] = useState(''); const [siPw, setSiPw] = useState('');
  const [rUser, setRUser] = useState(''); const [rEmail, setREmail] = useState('');
  const [rPw, setRPw] = useState(''); const [rPw2, setRPw2] = useState('');
  const [showSi, setShowSi] = useState(false);
  const [showRPw, setShowRPw] = useState(false); const [showRPw2, setShowRPw2] = useState(false);

  const st = strength(rPw);
  /* Quiet while the confirmation is still a correct prefix — same rule the
     business registration form uses. */
  const pwMismatch = rPw2.length > 0 && !rPw.startsWith(rPw2);

  const go = (t: 'si' | 'reg') => { setTab(t); setMsg(null); };
  const fail = (e: any) => setMsg({
    text: e instanceof NoAdminAccess ? e.message + ' Register to request access.'
      : e instanceof WrongSignInMethod ? e.message
        : e?.code === 'auth/email-already-in-use'
          ? 'Email already exists — that address already has an account. Sign in instead, or use Continue with Google if that is how you signed up.'
          : authError(e?.code),
    type: 'err'
  });

  const doSignIn = async () => {
    if (!siEmail || !siPw) return setMsg({ text: 'Enter your email and password.', type: 'err' });
    setLoading(true);
    try { await signIn(siEmail, siPw); } catch (e) { fail(e); }
    setLoading(false);
  };

  const doRegister = async () => {
    if (!rUser || !rEmail || !rPw || !rPw2) return setMsg({ text: 'Fill in all fields.', type: 'err' });
    if (rPw !== rPw2) return setMsg({ text: 'Passwords do not match.', type: 'err' });
    if (rPw.length < 8) return setMsg({ text: 'Use at least 8 characters for an admin password.', type: 'err' });
    setLoading(true);
    try { await register(rUser.trim(), rEmail.trim(), rPw); } catch (e) { fail(e); }
    setLoading(false);
  };

  const doGoogle = async (mode: 'signin' | 'register') => {
    setLoading(true);
    try { await googleAuth(mode); } catch (e) { fail(e); }
    setLoading(false);
  };

  const doReset = async () => {
    if (!siEmail) return setMsg({ text: 'Enter your email first, then tap reset.', type: 'err' });
    setLoading(true);
    try { await resetPassword(siEmail); setMsg({ text: 'Reset link sent — check your inbox.', type: 'ok' }); }
    catch (e: any) { setMsg({ text: authError(e?.code), type: 'err' }); }
    setLoading(false);
  };

  return (
    <Frame title="Traqi Admin" sub="Sign in to the product console, or request admin access.">
      <div className="auth-tabs">
        <button className={'auth-tab' + (tab === 'si' ? ' on' : '')} onClick={() => go('si')}>Sign In</button>
        <button className={'auth-tab' + (tab === 'reg' ? ' on' : '')} onClick={() => go('reg')}>Register</button>
      </div>

      {tab === 'si' ? (
        <div className="pnl on">
          <button className="btn btn-secondary btn-block" onClick={() => doGoogle('signin')} disabled={loading}>
            <GoogleIcon />Continue with Google
          </button>
          <div className="divider"><span>or use email &amp; password</span></div>
          <Field label="Email address">
            <input type="email" value={siEmail} onChange={e => setSiEmail(e.target.value)} placeholder="you@traqi.app" autoComplete="username" />
          </Field>
          <div className="field" style={{ marginTop: 14 }}>
            <label className="label">Password</label>
            <div className="eye-wrap">
              <input type={showSi ? 'text' : 'password'} value={siPw} onChange={e => setSiPw(e.target.value)}
                placeholder="Your password" {...NO_AUTOFILL} onKeyDown={e => e.key === 'Enter' && doSignIn()} />
              <button className="eye-btn" onClick={() => setShowSi(v => !v)} tabIndex={-1}>{showSi ? <EyeOff /> : <Eye />}</button>
            </div>
          </div>
          <div style={{ textAlign: 'right', marginTop: 8 }}>
            <button className="link-btn" onClick={doReset}>Forgot password?</button>
          </div>
          <button className="btn btn-primary btn-block" style={{ marginTop: 14 }} onClick={doSignIn} disabled={loading}>
            {loading ? 'Please wait…' : 'Sign In'}
          </button>
          {msg && <div className={'msg ' + msg.type}>{msg.text}</div>}
        </div>
      ) : (
        <div className="pnl on">
          <button className="btn btn-secondary btn-block" onClick={() => doGoogle('register')} disabled={loading}>
            <GoogleIcon />Continue with Google
          </button>
          <div className="divider"><span>or register with email</span></div>
          <Field label="Username"><input value={rUser} onChange={e => setRUser(e.target.value)} placeholder="jola" /></Field>
          <div className="field" style={{ marginTop: 14 }}>
            <label className="label">Email address</label>
            <input type="email" value={rEmail} onChange={e => setREmail(e.target.value)} placeholder="you@traqi.app" />
          </div>
          <div className="field" style={{ marginTop: 14 }}>
            <label className="label">Password</label>
            <div className="eye-wrap">
              <input type={showRPw ? 'text' : 'password'} value={rPw} onChange={e => setRPw(e.target.value)}
                placeholder="At least 8 characters" {...NO_AUTOFILL} />
              <button className="eye-btn" onClick={() => setShowRPw(v => !v)} tabIndex={-1}>{showRPw ? <EyeOff /> : <Eye />}</button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
              <div className="strength-bar"><span style={{ width: st.width, background: st.color }} /></div>
              <span style={{ fontSize: '.7rem', fontWeight: 700, width: '5rem', textAlign: 'right', color: st.label ? st.color : 'var(--text-3)' }}>{st.label}</span>
            </div>
          </div>
          <div className="field" style={{ marginTop: 14 }}>
            <label className="label">Confirm password</label>
            <div className="eye-wrap">
              <input type={showRPw2 ? 'text' : 'password'} value={rPw2} onChange={e => setRPw2(e.target.value)}
                placeholder="Repeat password" {...NO_AUTOFILL} onKeyDown={e => e.key === 'Enter' && doRegister()} />
              <button className="eye-btn" onClick={() => setShowRPw2(v => !v)} tabIndex={-1}>{showRPw2 ? <EyeOff /> : <Eye />}</button>
            </div>
            {pwMismatch && <span className="field-err">Passwords do not match.</span>}
          </div>
          <p className="hint" style={{ marginTop: 12, lineHeight: 1.6 }}>
            The first admin account is approved automatically. Every later request waits for the
            owner account to approve it.
          </p>
          <button className="btn btn-primary btn-block" style={{ marginTop: 14 }} onClick={doRegister} disabled={loading || pwMismatch}>
            {loading ? 'Please wait…' : 'Request Admin Access'}
          </button>
          {msg && <div className={'msg ' + msg.type}>{msg.text}</div>}
        </div>
      )}
    </Frame>
  );
}
