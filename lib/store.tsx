'use client';
/* Traqi — application store: auth, workspace data, sync, roles */

import React, { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signOut, updateProfile, sendEmailVerification, sendPasswordResetEmail,
  GoogleAuthProvider, signInWithPopup, User
} from 'firebase/auth';
import { auth, saveWorkspace, loadWorkspace, storeBundle, loadBundle, rememberAccount } from './firebase';
import {
  Workspace, CollectionKey, COLLECTIONS, DEFAULT_CONFIG, emptyWorkspace, CurrentUser, Config
} from './types';
import { can, requiresApproval } from './compute';

type Toast = { msg: string; undo?: () => void } | null;
type AuthStage = 'loading' | 'signedOut' | 'verify' | 'completeProfile' | 'onboarding' | 'pin' | 'ready';
export type PinResult = 'ok' | 'notfound' | 'badpin' | 'badcred' | 'wrongaccount' | 'cancelled' | 'error';

type Ctx = {
  ws: Workspace;
  user: CurrentUser;
  fbUser: User | null;
  stage: AuthStage;
  currency: 'NGN' | 'USD';
  toast: Toast;
  cloudOk: boolean;
  setCurrency: (c: 'NGN' | 'USD') => void;
  save: <K extends CollectionKey>(key: K, value: Workspace[K]) => void;
  saveConfig: (patch: Partial<Config>) => void;
  saveTargets: (t: Record<string, number>) => void;
  log: (action: string, detail?: string) => void;
  submitApproval: (type: string, data: any, label: string) => void;
  showToast: (msg: string, undo?: () => void) => void;
  can: (perm: string) => boolean;
  requiresApproval: (perm: string) => boolean;
  isOwner: boolean;
  followUpsDone: Record<string, boolean>;
  markFollowUpDone: (saleId: string) => void;
  /* auth actions */
  signInPin: (username: string, pin: string) => Promise<PinResult>;
  signInPassword: (email: string, pw: string) => Promise<void>;
  register: (email: string, pw: string, username: string, pin: string, biz: string) => Promise<void>;
  googleAuth: () => Promise<void>;
  completeGoogleProfile: (username: string, pin: string, biz: string) => Promise<void>;
  resendVerification: () => Promise<void>;
  checkVerified: () => Promise<boolean>;
  resetPassword: (email: string) => Promise<void>;
  finishOnboarding: () => void;
  chooseRole: (roleId: string, pin: string) => string;
  switchRole: () => void;
  logout: () => Promise<void>;
  roleCandidates: () => { id: string; name: string; type: 'owner' | 'assistant'; pin: string; perms: string[] }[];
};

const TraqiContext = createContext<Ctx | null>(null);
export const useTraqi = () => {
  const c = useContext(TraqiContext);
  if (!c) throw new Error('useTraqi must be used inside <TraqiProvider>');
  return c;
};

const key = (uid: string, k: string) => (uid ? `tq_${uid}_${k}` : `tq_${k}`);

export function TraqiProvider({ children }: { children: React.ReactNode }) {
  const [ws, setWs] = useState<Workspace>(emptyWorkspace());
  const [user, setUser] = useState<CurrentUser>({ role: '', id: '', name: '', perms: [] });
  const [fbUser, setFbUser] = useState<User | null>(null);
  const [stage, setStage] = useState<AuthStage>('loading');
  const [currency, setCurrency] = useState<'NGN' | 'USD'>('NGN');
  const [toast, setToast] = useState<Toast>(null);
  const [cloudOk, setCloudOk] = useState(true);
  const [followUpsDone, setFollowUpsDone] = useState<Record<string, boolean>>({});
  const uidRef = useRef('');
  const freshSignIn = useRef(false);
  const pendingReg = useRef<Partial<Config> | null>(null);
  /* Set before a PIN-triggered Google popup: only this uid may come back. */
  const expectUid = useRef('');
  const wsRef = useRef(ws);
  wsRef.current = ws;

  const showToast = useCallback((msg: string, undo?: () => void) => {
    setToast({ msg, undo });
    window.setTimeout(() => setToast(null), undo ? 6000 : 2800);
  }, []);

  /* ---------- Persistence ---------- */
  const persist = useCallback((patch: Partial<Workspace>) => {
    const uid = uidRef.current;
    const now = Date.now();
    setWs(prev => {
      const next = { ...prev, ...patch };
      wsRef.current = next;
      if (uid) {
        Object.entries(patch).forEach(([k, v]) => localStorage.setItem(key(uid, k), JSON.stringify(v)));
        localStorage.setItem(key(uid, 'lastModified'), String(now));
        saveWorkspace(uid, { ...patch, lastModified: now }).catch(() => {
          setCloudOk(false);
          showToast('Cloud sync failed — saved on this device only');
        });
      }
      return next;
    });
  }, [showToast]);

  const save = useCallback(<K extends CollectionKey>(k: K, value: Workspace[K]) => {
    persist({ [k]: value } as unknown as Partial<Workspace>);
  }, [persist]);

  const saveConfig = useCallback((patch: Partial<Config>) => {
    const config = { ...wsRef.current.config, ...patch };
    persist({ config });
    /* Keep this browser's quick sign-in honest when the PIN or name changes. */
    if (config.ownerName && config.pin) rememberAccount(config.ownerName, { pin: config.pin, email: config.email });
  }, [persist]);

  const saveTargets = useCallback((t: Record<string, number>) => persist({ targets: t }), [persist]);

  const log = useCallback((action: string, detail = '') => {
    const entry = {
      id: 'LOG-' + Date.now(), ts: new Date().toISOString(),
      userId: user.id || 'owner', userName: user.name || wsRef.current.config.ownerName,
      role: user.role || 'owner', action, detail
    };
    const next = [...wsRef.current.auditLog, entry].slice(-500);
    persist({ auditLog: next });
  }, [persist, user]);

  const submitApproval = useCallback((type: string, data: any, label: string) => {
    const item = {
      id: 'PND-' + Date.now(), ts: new Date().toISOString(), type: type as any, data,
      label, submittedBy: user.id, submitterName: user.name, status: 'pending' as const
    };
    persist({ pending: [...wsRef.current.pending, item] });
    showToast('Submitted for approval — the owner will review it');
  }, [persist, showToast, user]);

  const markFollowUpDone = useCallback((saleId: string) => {
    setFollowUpsDone(prev => {
      const next = { ...prev, [saleId]: true };
      if (uidRef.current) localStorage.setItem(key(uidRef.current, 'done_followups'), JSON.stringify(next));
      return next;
    });
    showToast('Follow-up marked done');
  }, [showToast]);

  /* ---------- Load a workspace (cloud first, newest copy wins) ---------- */
  const loadData = useCallback(async (uid: string) => {
    uidRef.current = uid;
    let snap: Record<string, any> | null = null, ok = false;
    try { snap = await loadWorkspace(uid); ok = true; } catch { ok = false; }
    setCloudOk(ok);
    const localTs = parseInt(localStorage.getItem(key(uid, 'lastModified')) || '0', 10);
    const cloudTs = (snap?.lastModified as number) || 0;
    const next = emptyWorkspace();

    if (snap && Object.keys(snap).length && cloudTs >= localTs) {
      COLLECTIONS.forEach(k => { (next as any)[k] = snap![k] || []; });
      next.targets = snap.targets || {};
      next.config = { ...DEFAULT_CONFIG, ...(snap.config || {}) };
      COLLECTIONS.forEach(k => localStorage.setItem(key(uid, k), JSON.stringify((next as any)[k])));
      localStorage.setItem(key(uid, 'targets'), JSON.stringify(next.targets));
      localStorage.setItem(key(uid, 'config'), JSON.stringify(next.config));
      localStorage.setItem(key(uid, 'lastModified'), String(cloudTs));
    } else {
      COLLECTIONS.forEach(k => { (next as any)[k] = JSON.parse(localStorage.getItem(key(uid, k)) || '[]'); });
      next.targets = JSON.parse(localStorage.getItem(key(uid, 'targets')) || '{}');
      next.config = { ...DEFAULT_CONFIG, ...JSON.parse(localStorage.getItem(key(uid, 'config')) || '{}') };
    }
    setFollowUpsDone(JSON.parse(localStorage.getItem(key(uid, 'done_followups')) || '{}'));
    setWs(next);
    wsRef.current = next;
    return { data: next, cloudOk: ok, hadCloudDoc: !!(snap && Object.keys(snap).length) };
  }, []);

  /* ---------- Auth state ---------- */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async u => {
      /* A PIN unlock named one account; Google answered with another. Turn it
         away here, before any workspace loads or the router moves. */
      if (u && expectUid.current && u.uid !== expectUid.current) {
        expectUid.current = '';
        freshSignIn.current = false;
        await signOut(auth).catch(() => {});
        return;
      }
      expectUid.current = '';
      setFbUser(u);
      if (!u) {
        setStage('signedOut');
        setUser({ role: '', id: '', name: '', perms: [] });
        uidRef.current = '';
        try { sessionStorage.removeItem('traqi_role'); sessionStorage.removeItem('traqi_roleId'); } catch {}
        return;
      }
      const isPasswordUser = (u.providerData || []).some(p => p.providerId === 'password');
      if (isPasswordUser && !u.emailVerified) { setStage('verify'); return; }

      const { data, cloudOk: ok } = await loadData(u.uid);
      const cfg = { ...data.config };
      if (pendingReg.current) { Object.assign(cfg, pendingReg.current); pendingReg.current = null; }

      const hasProfile = !!(cfg.bizName || cfg.onboarded || data.products.length || data.customers.length || data.sales.length);
      if (ok && !hasProfile) { setStage('completeProfile'); return; }

      if (!cfg.ownerName || cfg.ownerName === 'Owner') cfg.ownerName = u.displayName || cfg.ownerName;
      if (!cfg.email) cfg.email = u.email || '';
      const merged = { ...data, config: cfg };
      setWs(merged); wsRef.current = merged;
      localStorage.setItem(key(u.uid, 'config'), JSON.stringify(cfg));
      if (ok) saveWorkspace(u.uid, { config: cfg, bizName: cfg.bizName, username: cfg.ownerName, email: cfg.email, pin: cfg.pin }).catch(() => {});
      /* This account has now signed in on this browser — remember it (and any
         later PIN change) so username + PIN can bring it back, Google included. */
      if (cfg.ownerName && cfg.pin) {
        rememberAccount(cfg.ownerName, {
          email: u.email || cfg.email || '', pin: cfg.pin, uid: u.uid,
          provider: isPasswordUser ? 'password' : 'google'
        });
      }

      if (!cfg.onboarded) { setStage('onboarding'); return; }
      if (freshSignIn.current) {
        freshSignIn.current = false;
        setUser({ role: 'owner', id: 'owner', name: cfg.ownerName, perms: [] });
        sessionStorage.setItem('traqi_role', 'owner');
        setStage('ready');
        return;
      }
      /* Reuse the session role, otherwise ask for a PIN */
      const role = sessionStorage.getItem('traqi_role'), rid = sessionStorage.getItem('traqi_roleId');
      if (role === 'owner') { setUser({ role: 'owner', id: 'owner', name: cfg.ownerName, perms: [] }); setStage('ready'); return; }
      if (role === 'assistant' && rid) {
        const a = merged.assistants.find(x => x.id === rid && x.active !== false);
        if (a) { setUser({ role: 'assistant', id: a.id, name: a.name, perms: a.perms || [] }); setStage('ready'); return; }
      }
      setStage('pin');
    });
    return () => unsub();
  }, [loadData]);

  /* ---------- Auth actions ---------- */
  /* Username + PIN, for any account that has signed in on this browser before.
     Nothing here runs before the Google popup call, so it keeps the click
     gesture and the browser doesn't block it. */
  const signInPin = useCallback(async (username: string, pin: string): Promise<PinResult> => {
    const b = loadBundle(username);
    if (!b) return 'notfound';
    if (!b.pin || b.pin !== pin) return 'badpin';
    freshSignIn.current = true;

    /* The Firebase session usually survives in this browser — the PIN is the
       only thing standing between it and the workspace, and it just matched. */
    const cur = auth.currentUser;
    if (cur && (!b.uid || cur.uid === b.uid)) {
      freshSignIn.current = false;
      let cfg = wsRef.current.config;
      if (!cfg.ownerName) cfg = (await loadData(cur.uid)).data.config;
      setUser({ role: 'owner', id: 'owner', name: cfg.ownerName || username, perms: [] });
      sessionStorage.setItem('traqi_role', 'owner');
      sessionStorage.removeItem('traqi_roleId');
      setStage('ready');
      return 'ok';
    }

    /* Password account: the stored credentials re-authenticate silently. */
    if (b.pw) {
      try { await signInWithEmailAndPassword(auth, b.email, b.pw); return 'ok'; }
      catch (e: any) {
        freshSignIn.current = false;
        return e?.code === 'auth/invalid-credential' || e?.code === 'auth/wrong-password' ? 'badcred' : 'error';
      }
    }

    /* Google account whose session is gone. There is no password to replay, so
       Google has to vouch once more — hinted at the stored address, which
       normally resolves without an account chooser. */
    expectUid.current = b.uid || '';
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters(b.email ? { login_hint: b.email } : { prompt: 'select_account' });
      const c = await signInWithPopup(auth, provider);
      /* The listener has already turned a mismatch away — just report it. */
      if (b.uid && c.user.uid !== b.uid) { freshSignIn.current = false; return 'wrongaccount'; }
      return 'ok';
    } catch (e: any) {
      expectUid.current = '';
      freshSignIn.current = false;
      const code = e?.code || '';
      return code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request' ? 'cancelled' : 'error';
    }
  }, [loadData]);

  const signInPassword = useCallback(async (email: string, pw: string) => {
    freshSignIn.current = true;
    try {
      const c = await signInWithEmailAndPassword(auth, email, pw);
      try {
        const prof = await loadWorkspace(c.user.uid);
        const uname = prof?.username || prof?.config?.ownerName || c.user.displayName || '';
        const upin = prof?.pin || prof?.config?.pin || '';
        if (uname && upin) storeBundle(uname, { email, pw, pin: upin, uid: c.user.uid, provider: 'password' });
      } catch {}
    } catch (e) { freshSignIn.current = false; throw e; }
  }, []);

  const register = useCallback(async (email: string, pw: string, username: string, pin: string, biz: string) => {
    freshSignIn.current = true;
    pendingReg.current = { bizName: biz, ownerName: username, email, pin };
    try {
      const c = await createUserWithEmailAndPassword(auth, email, pw);
      await saveWorkspace(c.user.uid, {
        username, bizName: biz, email, pin, subscriptionStatus: 'trial', createdAt: new Date().toISOString(),
        config: { ...DEFAULT_CONFIG, bizName: biz, ownerName: username, email, pin },
        products: [], customers: [], sales: [], returns: [], suppliers: [], expenses: [],
        debts: [], targets: {}, assistants: [], pending: [], auditLog: [], tasks: [], messages: []
      });
      await updateProfile(c.user, { displayName: username });
      try { await sendEmailVerification(c.user); } catch {}
      storeBundle(username, { email, pw, pin, uid: c.user.uid, provider: 'password' });
    } catch (e) { freshSignIn.current = false; pendingReg.current = null; throw e; }
  }, []);

  const googleAuth = useCallback(async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    expectUid.current = '';        // any account the owner picks here is fine
    freshSignIn.current = true;
    try { await signInWithPopup(auth, provider); }
    catch (e) { freshSignIn.current = false; throw e; }
  }, []);

  const completeGoogleProfile = useCallback(async (username: string, pin: string, biz: string) => {
    const u = auth.currentUser;
    if (!u) throw new Error('Not signed in');
    const cfg: Config = { ...DEFAULT_CONFIG, bizName: biz, ownerName: username, email: u.email || '', pin };
    await saveWorkspace(u.uid, {
      username, bizName: biz, email: u.email || '', pin, authProvider: 'google',
      subscriptionStatus: 'trial', createdAt: new Date().toISOString(), config: cfg,
      products: [], customers: [], sales: [], returns: [], suppliers: [], expenses: [],
      debts: [], targets: {}, assistants: [], pending: [], auditLog: [], tasks: [], messages: []
    });
    try { await updateProfile(u, { displayName: username }); } catch {}
    rememberAccount(username, { email: u.email || '', pin, uid: u.uid, provider: 'google' });
    uidRef.current = u.uid;
    const next = { ...emptyWorkspace(), config: cfg };
    setWs(next); wsRef.current = next;
    localStorage.setItem(key(u.uid, 'config'), JSON.stringify(cfg));
    setStage('onboarding');
  }, []);

  const resendVerification = useCallback(async () => {
    if (auth.currentUser) await sendEmailVerification(auth.currentUser);
  }, []);
  const checkVerified = useCallback(async () => {
    const u = auth.currentUser;
    if (!u) return false;
    await u.reload();
    if (!auth.currentUser?.emailVerified) return false;
    freshSignIn.current = true;
    const { data } = await loadData(u.uid);
    setStage(data.config.onboarded ? 'ready' : 'onboarding');
    if (data.config.onboarded) {
      setUser({ role: 'owner', id: 'owner', name: data.config.ownerName, perms: [] });
      sessionStorage.setItem('traqi_role', 'owner');
    }
    return true;
  }, [loadData]);
  const resetPassword = useCallback(async (email: string) => { await sendPasswordResetEmail(auth, email); }, []);

  const finishOnboarding = useCallback(() => {
    saveConfig({ onboarded: true });
    setUser({ role: 'owner', id: 'owner', name: wsRef.current.config.ownerName, perms: [] });
    sessionStorage.setItem('traqi_role', 'owner');
    setStage('ready');
  }, [saveConfig]);

  const roleCandidates = useCallback(() => {
    const c = wsRef.current.config;
    return [
      { id: 'owner', name: c.ownerName || 'Owner', type: 'owner' as const, pin: c.pin, perms: [] },
      ...wsRef.current.assistants.filter(a => a.active !== false)
        .map(a => ({ id: a.id, name: a.name, type: 'assistant' as const, pin: a.pin, perms: a.perms || [] }))
    ];
  }, []);

  const chooseRole = useCallback((roleId: string, pin: string) => {
    const role = roleCandidates().find(r => r.id === roleId);
    if (!role) return 'Choose a role first';
    if (pin !== role.pin) return 'Incorrect PIN';
    if (role.type === 'owner') {
      setUser({ role: 'owner', id: 'owner', name: role.name, perms: [] });
      sessionStorage.setItem('traqi_role', 'owner');
      sessionStorage.removeItem('traqi_roleId');
    } else {
      setUser({ role: 'assistant', id: role.id, name: role.name, perms: role.perms });
      sessionStorage.setItem('traqi_role', 'assistant');
      sessionStorage.setItem('traqi_roleId', role.id);
    }
    setStage('ready');
    return '';
  }, [roleCandidates]);

  const switchRole = useCallback(() => {
    try { sessionStorage.removeItem('traqi_role'); sessionStorage.removeItem('traqi_roleId'); } catch {}
    setUser({ role: '', id: '', name: '', perms: [] });
    setStage('pin');
  }, []);

  const logout = useCallback(async () => {
    try { sessionStorage.removeItem('traqi_role'); sessionStorage.removeItem('traqi_roleId'); } catch {}
    /* Curtain first: clearing the user before the stage would leave the shell
       rendering a signed-out workspace for a beat. Firebase can catch up. */
    setStage('signedOut');
    setUser({ role: '', id: '', name: '', perms: [] });
    await signOut(auth).catch(() => {});
  }, []);

  const value = useMemo<Ctx>(() => ({
    ws, user, fbUser, stage, currency, toast, cloudOk,
    setCurrency, save, saveConfig, saveTargets, log, submitApproval, showToast,
    can: (p: string) => can(user, p),
    requiresApproval: (p: string) => requiresApproval(user, p),
    isOwner: user.role === 'owner',
    followUpsDone, markFollowUpDone,
    signInPin, signInPassword, register, googleAuth, completeGoogleProfile,
    resendVerification, checkVerified, resetPassword, finishOnboarding,
    chooseRole, switchRole, logout, roleCandidates
  }), [ws, user, fbUser, stage, currency, toast, cloudOk, save, saveConfig, saveTargets, log,
      submitApproval, showToast, followUpsDone, markFollowUpDone, signInPin, signInPassword,
      register, googleAuth, completeGoogleProfile, resendVerification, checkVerified,
      resetPassword, finishOnboarding, chooseRole, switchRole, logout, roleCandidates]);

  return <TraqiContext.Provider value={value}>{children}</TraqiContext.Provider>;
}

/** Currency-aware money formatter bound to the active workspace. */
export function useMoney() {
  const { currency } = useTraqi();
  return useCallback((n: number) => {
    const v = Number(n || 0);
    return currency === 'USD' ? '$' + Math.round(v / 1600).toLocaleString() : '₦' + Math.round(v).toLocaleString();
  }, [currency]);
}
