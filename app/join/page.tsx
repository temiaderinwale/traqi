'use client';
/* Traqi — /join?t=<token>: an assistant claiming the seat their owner made.

   Business, name and email come from the invite and cannot be edited here —
   they are the seat. All the assistant chooses is a password. */

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, Eye, EyeOff, Lock, ShieldCheck, UserPlus } from 'lucide-react';
import { useTraqi } from '@/lib/store';
import { getInvite, AssistantInvite } from '@/lib/invites';
import { authError, strength } from '@/lib/format';
import { Field } from '@/components/ui';
import { Mark, Wordmark } from '@/components/Brand';
import Preloader from '@/components/Preloader';

const NO_AUTOFILL = {
  autoComplete: 'new-password',
  'data-lpignore': 'true',
  'data-1p-ignore': 'true',
  'data-form-type': 'other'
} as const;

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-wrap" style={{ display: 'grid' }}>
      <aside className="auth-left">
        <div className="mark-pattern" />
        <Link href="/" aria-label="Traqi home"
          style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 10, alignSelf: 'flex-start' }}>
          <Mark dark size={36} /><Wordmark className="" />
        </Link>
        <div style={{ position: 'relative' }}>
          <h1 className="font-display" style={{ fontSize: '2.6rem', fontWeight: 800, lineHeight: 1.1, margin: 0 }}>
            You&apos;ve been<br />added to the team.
          </h1>
          <p style={{ color: 'var(--indigo-400)', marginTop: 16, maxWidth: '24rem', lineHeight: 1.6 }}>
            Set up your own sign-in and you can work from your own phone — you&apos;ll see exactly
            what your manager has given you access to, and nothing else.
          </p>
        </div>
        <p style={{ position: 'relative', fontSize: '.72rem', color: 'rgba(165,180,252,.7)', margin: 0 }}>
          © 2026 Traqi — An Innovation by Ascendia
        </p>
      </aside>
      <main className="auth-right"><div className="auth-card">{children}</div></main>
    </div>
  );
}

export default function JoinPage() {
  const t = useTraqi();
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [inv, setInv] = useState<AssistantInvite | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'bad' | 'used'>('loading');
  const [pw, setPw] = useState(''); const [pw2, setPw2] = useState('');
  const [showPw, setShowPw] = useState(false); const [showPw2, setShowPw2] = useState(false);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const tk = new URLSearchParams(window.location.search).get('t') || '';
    setToken(tk);
    if (!tk) { setState('bad'); return; }
    getInvite(tk)
      .then(i => {
        if (!i) { setState('bad'); return; }
        setInv(i);
        setState(i.status === 'pending' ? 'ready' : 'used');
      })
      .catch(() => setState('bad'));
  }, []);

  const st = strength(pw);
  const mismatch = pw2.length > 0 && !pw.startsWith(pw2);

  const submit = async () => {
    if (!token) return;
    if (pw.length < 6) { setMsg('Password must be at least 6 characters.'); return; }
    if (pw !== pw2) { setMsg('Passwords do not match.'); return; }
    setBusy(true);
    setMsg('');
    try {
      await t.joinAsAssistant(token, pw);
      /* The store is at 'verify' now — /auth owns that screen. */
      router.replace('/auth');
    } catch (e: any) {
      setMsg(e?.code === 'auth/email-already-in-use'
        ? 'That email already has a Traqi sign-in. Use it to sign in instead.'
        : e?.code ? authError(e.code) : (e?.message || 'Could not complete sign-up.'));
      setBusy(false);
    }
  };

  if (state === 'loading') return <Preloader />;
  /* Already signed in and on the way in — let the app take over. */
  if (t.stage === 'ready' || t.stage === 'pin') { router.replace('/dashboard'); return <Preloader />; }
  if (t.stage === 'verify') { router.replace('/auth'); return <Preloader />; }

  if (state !== 'ready' || !inv) {
    return (
      <Frame>
        <div style={{ textAlign: 'center', padding: '18px 0' }}>
          <span style={{ width: 60, height: 60, borderRadius: '1.1rem', background: 'var(--red-50)', color: 'var(--red-600)', display: 'grid', placeItems: 'center', margin: '0 auto 16px' }}>
            <Lock />
          </span>
          <h2 className="font-display" style={{ fontSize: '1.3rem', fontWeight: 800, margin: '0 0 8px' }}>
            {state === 'used' ? 'This invitation has been used' : 'This link isn’t valid'}
          </h2>
          <p className="hint" style={{ maxWidth: '22rem', margin: '0 auto', lineHeight: 1.6 }}>
            {state === 'used'
              ? 'The seat has already been claimed. Sign in with your email and password instead.'
              : 'Ask your manager to send you a fresh invitation from the Team page.'}
          </p>
          <Link href="/auth" className="btn btn-primary btn-block" style={{ marginTop: 22 }}>Go to sign in</Link>
        </div>
      </Frame>
    );
  }

  return (
    <Frame>
      <h2 className="font-display" style={{ fontSize: '1.55rem', fontWeight: 800, margin: 0 }}>Join {inv.bizName}</h2>
      <p className="hint" style={{ marginTop: 6 }}>
        {inv.ownerName} invited you. Choose a password and your sign-in is ready.
      </p>

      <div className="muted-box" style={{ marginTop: 20, display: 'grid', gap: 10 }}>
        {[['Business', inv.bizName], ['Your username', inv.username], ['Email', inv.email]].map(([k, v]) => (
          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: '.84rem' }}>
            <span className="hint">{k}</span>
            <strong style={{ textAlign: 'right', wordBreak: 'break-word' }}>{v}</strong>
          </div>
        ))}
        <p className="hint" style={{ display: 'flex', gap: 7, alignItems: 'flex-start', margin: '2px 0 0', fontSize: '.72rem' }}>
          <Lock style={{ width: 12, height: 12, flexShrink: 0, marginTop: 2 }} />
          Set by {inv.ownerName} — these can&apos;t be changed here.
        </p>
      </div>

      <div className="field" style={{ marginTop: 18 }}>
        <label className="label">Create a password</label>
        <div className="eye-wrap">
          <input type={showPw ? 'text' : 'password'} value={pw} onChange={e => setPw(e.target.value)}
            placeholder="At least 6 characters" {...NO_AUTOFILL} />
          <button className="eye-btn" onClick={() => setShowPw(v => !v)} tabIndex={-1}>{showPw ? <EyeOff /> : <Eye />}</button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
          <div className="strength-bar"><span style={{ width: st.width, background: st.color }} /></div>
          <span style={{ fontSize: '.7rem', fontWeight: 700, width: '5rem', textAlign: 'right', color: st.label ? st.color : 'var(--text-3)' }}>{st.label}</span>
        </div>
      </div>

      <div className="field" style={{ marginTop: 14 }}>
        <label className="label">Confirm password</label>
        <div className="eye-wrap">
          <input type={showPw2 ? 'text' : 'password'} value={pw2} onChange={e => setPw2(e.target.value)}
            placeholder="Repeat password" {...NO_AUTOFILL} onKeyDown={e => e.key === 'Enter' && submit()} />
          <button className="eye-btn" onClick={() => setShowPw2(v => !v)} tabIndex={-1}>{showPw2 ? <EyeOff /> : <Eye />}</button>
        </div>
        {mismatch && <span className="field-err">Passwords do not match.</span>}
      </div>

      <button className="btn btn-primary btn-block" style={{ marginTop: 18 }} disabled={busy || mismatch} onClick={submit}>
        {busy ? 'Setting you up…' : <><UserPlus />Create my sign-in</>}
      </button>
      {msg && <div className="msg err">{msg}</div>}

      <p className="hint" style={{ marginTop: 16, display: 'flex', gap: 8, alignItems: 'flex-start', lineHeight: 1.6 }}>
        <ShieldCheck style={{ width: 14, height: 14, flexShrink: 0, marginTop: 2 }} />
        We&apos;ll email you a verification link. Once you confirm it, {inv.ownerName} is told you&apos;ve joined —
        and from then on you can sign in with either <strong>{inv.username}</strong> or your email, plus this password.
      </p>
      <p className="hint" style={{ textAlign: 'center', marginTop: 14 }}>
        Already set up? <Link href="/auth" style={{ color: 'var(--indigo-600)', fontWeight: 600 }}>Sign in</Link>
      </p>
    </Frame>
  );
}
