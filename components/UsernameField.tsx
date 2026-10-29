'use client';
/* Traqi — choosing a username.

   One input for every place a username is picked: registration, the Google
   profile step, the admin console, assistant seats and Settings. Spaces never
   make it in — they are dropped as they are typed — and the registry is asked
   about the name while it is still being typed, so "already taken" shows up
   beside the field instead of after the form has been sent. */

import React, { useEffect, useState } from 'react';
import { Check, Loader2, X } from 'lucide-react';
import type { Firestore } from 'firebase/firestore';
import { cleanUsername, isUsernameFree, usernameKey, usernameProblem } from '@/lib/usernames';

export type UsernameCheck = {
  state: 'idle' | 'same' | 'invalid' | 'checking' | 'free' | 'taken';
  message: string;
  /** True when the form may go ahead with this name. */
  ok: boolean;
};

/** Live availability for `value`. `original` is the name already held — it is
    always fine to keep. `mine` lets a seat or account match its own entry. */
export function useUsernameCheck(value: string, opts: {
  original?: string;
  mine?: { uid?: string; assistantId?: string };
  dbi?: Firestore;
  enabled?: boolean;
} = {}): UsernameCheck {
  const { original = '', mine, dbi, enabled = true } = opts;
  const [check, setCheck] = useState<UsernameCheck>({ state: 'idle', message: '', ok: false });
  const uid = mine?.uid, assistantId = mine?.assistantId;

  useEffect(() => {
    if (!enabled) { setCheck({ state: 'idle', message: '', ok: true }); return; }
    if (!value) { setCheck({ state: 'idle', message: '', ok: false }); return; }
    if (original && usernameKey(value) === usernameKey(original)) {
      setCheck({ state: 'same', message: '', ok: true });
      return;
    }
    const problem = usernameProblem(value);
    if (problem) { setCheck({ state: 'invalid', message: problem, ok: false }); return; }

    setCheck({ state: 'checking', message: 'Checking…', ok: false });
    let live = true;
    const t = setTimeout(async () => {
      const free = await isUsernameFree(value, { uid, assistantId }, dbi);
      if (!live) return;
      setCheck(free
        ? { state: 'free', message: 'Available', ok: true }
        : { state: 'taken', message: 'Username already taken — please choose another.', ok: false });
    }, 380);
    return () => { live = false; clearTimeout(t); };
  }, [value, original, uid, assistantId, dbi, enabled]);

  return check;
}

export function UsernameInput({ value, onChange, check, placeholder, disabled, autoFocus, onEnter }: {
  value: string;
  onChange: (v: string) => void;
  check: UsernameCheck;
  placeholder?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  onEnter?: () => void;
}) {
  const bad = check.state === 'taken' || check.state === 'invalid';
  return (
    <>
      <input value={value} placeholder={placeholder} disabled={disabled} autoFocus={autoFocus}
        autoCapitalize="none" autoCorrect="off" spellCheck={false} autoComplete="username"
        aria-invalid={bad || undefined}
        style={bad ? { borderColor: 'var(--red-600)' } : undefined}
        onChange={e => onChange(cleanUsername(e.target.value))}
        onKeyDown={e => {
          /* The space bar does nothing here rather than something surprising. */
          if (e.key === ' ') e.preventDefault();
          if (e.key === 'Enter' && onEnter) onEnter();
        }} />
      {check.message && (
        <span className={'uname-status ' + check.state} role={bad ? 'alert' : undefined}>
          {check.state === 'checking' ? <Loader2 className="spin" /> : check.state === 'free' ? <Check /> : <X />}
          {check.message}
        </span>
      )}
    </>
  );
}
