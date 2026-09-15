'use client';
/* Traqi — application store: auth, workspace data, sync, roles */

import React, { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signOut, updateProfile, sendEmailVerification, sendPasswordResetEmail,
  GoogleAuthProvider, signInWithPopup, deleteUser, User
} from 'firebase/auth';
import {
  auth, saveWorkspace, loadWorkspace, storeBundle, loadBundle, rememberAccount,
  loadCreds, saveCreds, redactSecrets, clearInlineSecrets
} from './firebase';
import {
  Workspace, CollectionKey, COLLECTIONS, DEFAULT_CONFIG, emptyWorkspace, CurrentUser, Config
} from './types';
import { can, requiresApproval } from './compute';
import { FeatureKey, Tier, TierKey, customerLimit, getTier, tierHas } from './tiers';
import { IndustryChoice, OTHER_INDUSTRY, categoriesFor } from './industries';
import {
  AssistantLink, acceptInvite, createAssistantLink, getAssistantLink, getInvite, notifyOwnerOfJoin
} from './invites';
import {
  UsernameTaken, claimUsername, isUsernameFree, lookupEmail, recordEmail, resolveToEmail
} from './usernames';

type Toast = { msg: string; undo?: () => void } | null;
/* 'plan' sits between registration and onboarding: an account has to hold a
   tier before there is a workspace to set up. */
type AuthStage =
  | 'loading' | 'signedOut' | 'verify' | 'completeProfile'
  | 'plan' | 'welcome' | 'onboarding' | 'pin' | 'ready';
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
  /* ---- account tier ---- */
  plan: TierKey | '';
  tier: Tier;
  hasFeature: (f: FeatureKey) => boolean;
  customerLimit: number;
  customersLeft: number;
  atCustomerLimit: boolean;
  choosePlan: (plan: TierKey) => void;
  changePlan: (plan: TierKey) => void;
  /* ---- what kind of business this is ---- */
  industry: IndustryChoice | '';
  categories: string[];
  chooseIndustry: (key: IndustryChoice, custom?: { name: string; categories: string[] }) => void;
  addCategory: (name: string) => string;
  /* True when this session is an assistant signed in with their own account
     rather than the owner's. They hold one seat and cannot switch out of it. */
  linkedAssistant: boolean;
  joinAsAssistant: (token: string, password: string) => Promise<void>;
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

/** Typed identifier matched no account — thrown before Firebase is called. */
export class EmailNotFound extends Error {
  constructor() { super('No account found with that username or email.'); this.name = 'EmailNotFound'; }
}
/** The address is already registered under the other sign-in method. */
export class WrongSignInMethod extends Error {
  constructor(public method: 'password' | 'google') {
    super(method === 'password'
      ? 'Email already exists — this address signed up with a password. Sign in with your email and password instead.'
      : 'Email already exists — this address signed up with Google. Use Continue with Google instead.');
    this.name = 'WrongSignInMethod';
  }
}

export function TraqiProvider({ children }: { children: React.ReactNode }) {
  const [ws, setWs] = useState<Workspace>(emptyWorkspace());
  const [user, setUser] = useState<CurrentUser>({ role: '', id: '', name: '', perms: [] });
  const [fbUser, setFbUser] = useState<User | null>(null);
  const [stage, setStage] = useState<AuthStage>('loading');
  const [currency, setCurrency] = useState<'NGN' | 'USD'>('NGN');
  const [toast, setToast] = useState<Toast>(null);
  const [cloudOk, setCloudOk] = useState(true);
  const [followUpsDone, setFollowUpsDone] = useState<Record<string, boolean>>({});
  const [assistantLink, setAssistantLink] = useState<AssistantLink | null>(null);
  /* Only an owner session may read or write the credentials document. */
  const isOwnerSession = useRef(true);
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
  /* The workspace document is shared with assistants who sign in themselves,
     so PINs never travel into it: they are split off here and written to the
     owner-only credentials document instead. Everything in memory and in
     localStorage still carries them, so nothing else in the app changes. */
  const persist = useCallback((patch: Partial<Workspace>) => {
    const uid = uidRef.current;
    const now = Date.now();
    setWs(prev => {
      const next = { ...prev, ...patch };
      wsRef.current = next;
      if (uid) {
        Object.entries(patch).forEach(([k, v]) => localStorage.setItem(key(uid, k), JSON.stringify(v)));
        localStorage.setItem(key(uid, 'lastModified'), String(now));

        if (isOwnerSession.current) {
          const creds: Record<string, any> = {};
          if (patch.config && (patch.config as Config).pin) creds.pin = (patch.config as Config).pin;
          if (patch.assistants) {
            creds.assistantPins = Object.fromEntries(
              (patch.assistants as Workspace['assistants']).map(a => [a.id, a.pin || ''])
            );
          }
          if (Object.keys(creds).length) saveCreds(uid, creds).catch(() => {});
        }

        saveWorkspace(uid, { ...redactSecrets(patch), lastModified: now }).catch(() => {
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
    /* Entitlement is the server's to state, whichever copy of the workspace
       won above: the top-level `plan` is what the admin console writes when it
       moves an account between tiers, so a stale local config can't outrank it. */
    if (snap?.plan) {
      next.config.plan = snap.plan;
      localStorage.setItem(key(uid, 'config'), JSON.stringify(next.config));
    }

    /* PINs come from the private document, which only the owner can open. A
       workspace written before the split still carries them inline; move them
       across once, then clear them from the shared document. */
    if (isOwnerSession.current) {
      const creds = await loadCreds(uid);
      if (creds?.pin) next.config.pin = creds.pin;
      if (creds?.assistantPins) {
        next.assistants = next.assistants.map(a =>
          (creds.assistantPins![a.id] ? { ...a, pin: creds.assistantPins![a.id] } : a));
      }
      const inlinePin = String(snap?.pin || snap?.config?.pin || '');
      const inlineAssistantPins = (snap?.assistants || []).some((a: any) => a?.pin);
      if (!creds && (inlinePin || inlineAssistantPins)) {
        await saveCreds(uid, {
          pin: inlinePin || next.config.pin,
          assistantPins: Object.fromEntries(next.assistants.map(a => [a.id, a.pin || '']))
        }).catch(() => {});
        await clearInlineSecrets(uid, next.config, next.assistants).catch(() => {});
      }
    }

    setFollowUpsDone(JSON.parse(localStorage.getItem(key(uid, 'done_followups')) || '{}'));
    setWs(next);
    wsRef.current = next;
    return { data: next, cloudOk: ok, hadCloudDoc: !!(snap && Object.keys(snap).length) };
  }, []);

  /* Reads back which invitations have been claimed and folds that into the
     roster — the owner's session is the only one allowed to write it. */
  const syncAssistantClaims = useCallback(async (data: Workspace) => {
    const waiting = data.assistants.filter(a => a.inviteToken && !a.accountUid);
    if (!waiting.length) return;
    const claimed: { id: string; uid: string; at: string }[] = [];
    for (const a of waiting) {
      const inv = await getInvite(a.inviteToken!).catch(() => null);
      if (inv?.status === 'accepted' && inv.acceptedUid) {
        claimed.push({ id: a.id, uid: inv.acceptedUid, at: inv.acceptedAt || new Date().toISOString() });
      }
    }
    if (!claimed.length) return;

    const byId = new Map(claimed.map(c => [c.id, c]));
    const assistants = data.assistants.map(a => {
      const c = byId.get(a.id);
      return c ? { ...a, accountUid: c.uid, onboardedAt: c.at } : a;
    });
    const names = claimed.map(c => data.assistants.find(a => a.id === c.id)?.name || 'A team member');
    const now = new Date().toISOString();
    const auditLog = [...data.auditLog, ...claimed.map((c, i) => ({
      id: 'LOG-' + (Date.now() + i), ts: now, userId: c.id, userName: names[i],
      role: 'assistant', action: 'Joined the team', detail: `${names[i]} set up their own sign-in`
    }))].slice(-500);
    const messages = [...data.messages, ...claimed.map((c, i) => ({
      id: 'MSG-' + (Date.now() + i), from: c.id, fromName: names[i], to: ['owner'],
      toName: data.config.ownerName || 'Owner', type: 'message' as const,
      text: `${names[i]} has finished setting up their Traqi sign-in and joined the team.`,
      readBy: {}, ts: now
    }))];

    persist({ assistants, auditLog, messages });
    showToast(names.length === 1
      ? `${names[0]} has joined the team`
      : `${names.length} team members have joined`);
  }, [persist, showToast]);

  /* ---------- Assistants signed in with their own account ----------
     Their uid owns no workspace: the account document points at the owner's,
     and loadData() aims every later read and write at that uid. */
  const enterAsAssistant = useCallback(async (link: AssistantLink, u: User): Promise<boolean> => {
    isOwnerSession.current = false;
    const { data } = await loadData(link.ownerUid);
    const a = data.assistants.find(x => x.id === link.assistantId);
    if (!a || a.active === false) {
      await signOut(auth).catch(() => {});
      showToast(a ? 'Your access to this workspace has been paused' : 'That team seat no longer exists');
      return false;
    }

    /* The roster is the owner's to write — an assistant editing it could hand
       themselves permissions. The accepted invite is the record of this claim;
       the owner's app reads it back and updates the roster there. Email tells
       them straight away, in case they aren't in the app. */
    if (!a.accountUid) {
      notifyOwnerOfJoin(data.config.email, data.config.ownerName, a.name, data.config.bizName, link.ownerUid)
        .catch(() => {});
    }

    setUser({ role: 'assistant', id: a.id, name: a.name, perms: a.perms || [] });
    try {
      sessionStorage.setItem('traqi_role', 'assistant');
      sessionStorage.setItem('traqi_roleId', a.id);
    } catch {}
    setStage('ready');
    return true;
  }, [loadData, persist, showToast]);

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
        setAssistantLink(null);
        uidRef.current = '';
        try { sessionStorage.removeItem('traqi_role'); sessionStorage.removeItem('traqi_roleId'); } catch {}
        return;
      }
      const isPasswordUser = (u.providerData || []).some(p => p.providerId === 'password');
      if (isPasswordUser && !u.emailVerified) { setStage('verify'); return; }

      /* An assistant's account carries no workspace of its own — it points at
         the owner's, so this branch replaces the whole owner flow below. */
      const link = await getAssistantLink(u.uid).catch(() => null);
      setAssistantLink(link);
      if (link) { freshSignIn.current = false; await enterAsAssistant(link, u); return; }

      isOwnerSession.current = true;
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
      if (ok) {
        saveWorkspace(u.uid, redactSecrets({ config: cfg, bizName: cfg.bizName, username: cfg.ownerName, email: cfg.email })).catch(() => {});
        if (cfg.pin) saveCreds(u.uid, { pin: cfg.pin }).catch(() => {});
        /* Fold in any invitations claimed while the owner was away. */
        syncAssistantClaims(merged).catch(() => {});
      }
      /* This account has now signed in on this browser — remember it (and any
         later PIN change) so username + PIN can bring it back, Google included. */
      if (cfg.ownerName && cfg.pin) {
        rememberAccount(cfg.ownerName, {
          email: u.email || cfg.email || '', pin: cfg.pin, uid: u.uid,
          provider: isPasswordUser ? 'password' : 'google'
        });
      }

      /* No tier on file yet — that gate comes before the workspace exists. */
      if (!cfg.plan) { setStage('plan'); return; }
      /* Then what kind of business it is, which fills the categories. */
      if (!cfg.industry) { setStage('welcome'); return; }
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
  }, [loadData, enterAsAssistant, syncAssistantClaims]);

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

  /* Accepts an email or a username — assistants are given a username by their
     owner and may sign in with either. */
  const signInPassword = useCallback(async (identifier: string, pw: string) => {
    const email = await resolveToEmail(identifier);
    if (!email) throw new EmailNotFound();
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
    /* Usernames are unique product-wide, and the address must not already be
       signed up the other way — both checked before an account is created, so
       a rejected sign-up leaves nothing behind. */
    if (!(await isUsernameFree(username))) throw new UsernameTaken(username.trim());
    const known = await lookupEmail(email);
    if (known && known.provider === 'google') throw new WrongSignInMethod('google');

    freshSignIn.current = true;
    pendingReg.current = { bizName: biz, ownerName: username, email, pin };
    try {
      const c = await createUserWithEmailAndPassword(auth, email, pw);
      await saveWorkspace(c.user.uid, redactSecrets({
        username, bizName: biz, email, subscriptionStatus: 'trial', createdAt: new Date().toISOString(),
        config: { ...DEFAULT_CONFIG, bizName: biz, ownerName: username, email, pin },
        products: [], customers: [], sales: [], returns: [], suppliers: [], expenses: [],
        debts: [], targets: {}, assistants: [], pending: [], auditLog: [], tasks: [], messages: []
      }));
      await saveCreds(c.user.uid, { pin }).catch(() => {});
      await claimUsername(username, email, c.user.uid, 'owner').catch(() => false);
      await recordEmail(email, 'password', c.user.uid);
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
    try {
      const c = await signInWithPopup(auth, provider);
      /* One address, one way in. Firebase may either link Google onto an
         existing password account or open a second one, depending on a project
         setting — so check both: the providers on this account, and what Traqi
         recorded when the address first signed up. */
      const known = await lookupEmail(c.user.email || '');
      const linkedPassword = (c.user.providerData || []).some(p => p.providerId === 'password');
      if (linkedPassword || (known && known.provider === 'password' && known.uid !== c.user.uid)) {
        freshSignIn.current = false;
        /* If Google just made a second account, take it back out again. */
        if (!known || known.uid !== c.user.uid) await deleteUser(c.user).catch(() => {});
        await signOut(auth).catch(() => {});
        throw new WrongSignInMethod('password');
      }
      await recordEmail(c.user.email || '', 'google', c.user.uid);
    } catch (e) { freshSignIn.current = false; throw e; }
  }, []);

  const completeGoogleProfile = useCallback(async (username: string, pin: string, biz: string) => {
    const u = auth.currentUser;
    if (!u) throw new Error('Not signed in');
    isOwnerSession.current = true;
    const cfg: Config = { ...DEFAULT_CONFIG, bizName: biz, ownerName: username, email: u.email || '', pin };
    await saveWorkspace(u.uid, redactSecrets({
      username, bizName: biz, email: u.email || '', authProvider: 'google',
      subscriptionStatus: 'trial', createdAt: new Date().toISOString(), config: cfg,
      products: [], customers: [], sales: [], returns: [], suppliers: [], expenses: [],
      debts: [], targets: {}, assistants: [], pending: [], auditLog: [], tasks: [], messages: []
    }));
    await saveCreds(u.uid, { pin }).catch(() => {});
    try { await updateProfile(u, { displayName: username }); } catch {}
    rememberAccount(username, { email: u.email || '', pin, uid: u.uid, provider: 'google' });
    uidRef.current = u.uid;
    const next = { ...emptyWorkspace(), config: cfg };
    setWs(next); wsRef.current = next;
    localStorage.setItem(key(u.uid, 'config'), JSON.stringify(cfg));
    /* Google accounts land here instead of registration, so the tier gate
       follows profile completion rather than verification. */
    setStage('plan');
  }, []);

  const resendVerification = useCallback(async () => {
    if (auth.currentUser) await sendEmailVerification(auth.currentUser);
  }, []);
  /* Claims a seat from an invite link: the email is fixed by the invite, so
     only the password is chosen here. */
  const joinAsAssistant = useCallback(async (token: string, password: string) => {
    const inv = await getInvite(token);
    if (!inv) throw new Error('This invitation link is not valid.');
    if (inv.status === 'accepted') throw new Error('This invitation has already been used.');
    if (inv.status === 'revoked') throw new Error('This invitation has been withdrawn.');

    const cred = await createUserWithEmailAndPassword(auth, inv.email, password);
    await createAssistantLink(cred.user.uid, inv);
    await acceptInvite(token, cred.user.uid).catch(() => {});
    /* Lets them sign in with the username their owner gave them, not just the
       address. Best effort: a taken username simply means email-only sign-in. */
    await claimUsername(inv.username, inv.email, cred.user.uid, 'assistant').catch(() => false);
    await recordEmail(inv.email, 'password', cred.user.uid);
    try { await updateProfile(cred.user, { displayName: inv.username }); } catch {}
    try { await sendEmailVerification(cred.user); } catch {}
    setStage('verify');
  }, []);

  const checkVerified = useCallback(async () => {
    const u = auth.currentUser;
    if (!u) return false;
    await u.reload();
    if (!auth.currentUser?.emailVerified) return false;
    /* reload() refreshes the user object, not the ID token Firestore checks.
       Assistant access is gated on email_verified in the rules, so force a new
       token before anything touches the workspace. */
    await u.getIdToken(true).catch(() => {});
    /* Assistants land in their owner's workspace, not one of their own. */
    const link = await getAssistantLink(u.uid).catch(() => null);
    if (link) {
      setAssistantLink(link);
      await enterAsAssistant(link, u);
      return true;
    }
    freshSignIn.current = true;
    isOwnerSession.current = true;
    const { data } = await loadData(u.uid);
    /* Straight out of verification a brand-new account still has no tier. */
    if (!data.config.plan) { setStage('plan'); return true; }
    if (!data.config.industry) { setStage('welcome'); return true; }
    setStage(data.config.onboarded ? 'ready' : 'onboarding');
    if (data.config.onboarded) {
      setUser({ role: 'owner', id: 'owner', name: data.config.ownerName, perms: [] });
      sessionStorage.setItem('traqi_role', 'owner');
    }
    return true;
  }, [loadData, enterAsAssistant, syncAssistantClaims]);
  const resetPassword = useCallback(async (email: string) => { await sendPasswordResetEmail(auth, email); }, []);

  const finishOnboarding = useCallback(() => {
    saveConfig({ onboarded: true });
    setUser({ role: 'owner', id: 'owner', name: wsRef.current.config.ownerName, perms: [] });
    sessionStorage.setItem('traqi_role', 'owner');
    setStage('ready');
  }, [saveConfig]);

  /* ---------- Account tier ---------- */
  /* Writes the tier in both places it is read from: inside config (what this
     app runs on) and at the top level of the business document (what the
     admin console reads and writes). */
  const writePlan = useCallback((plan: TierKey) => {
    const planChosenAt = new Date().toISOString();
    saveConfig({ plan, planChosenAt });
    const uid = uidRef.current;
    if (uid) saveWorkspace(uid, { plan, planChosenAt }).catch(() => {});
  }, [saveConfig]);

  /* Picked during sign-up. The welcome — and the business type it asks for —
     comes next, unless this workspace already has one. */
  const choosePlan = useCallback((plan: TierKey) => {
    writePlan(plan);
    const cfg = wsRef.current.config;
    if (!cfg.industry) { setStage('welcome'); return; }
    /* A workspace that is already set up (an account from before tiers
       existed) goes back through the normal role gate instead. */
    setStage(cfg.onboarded ? 'pin' : 'onboarding');
  }, [writePlan]);

  /* ---------- What kind of business this is ---------- */
  /* One of the eight classes brings its own category list with it. "Other"
     brings none, so the owner names the trade and types the categories, and
     those become the workspace's own — which is to say the ones Add Product
     offers from here on. Kept in the order they were entered; blanks and
     repeats dropped. */
  const chooseIndustry = useCallback((
    industry: IndustryChoice,
    custom?: { name: string; categories: string[] }
  ) => {
    if (industry === OTHER_INDUSTRY) {
      const seen = new Set<string>();
      const categories: string[] = [];
      (custom?.categories || []).forEach(raw => {
        const clean = raw.trim().replace(/\s+/g, ' ');
        const key = clean.toLowerCase();
        if (!clean || seen.has(key)) return;
        seen.add(key);
        categories.push(clean);
      });
      saveConfig({ industry, customIndustry: (custom?.name || '').trim(), extraCategories: categories });
    } else {
      saveConfig({ industry, customIndustry: '' });
    }
    setStage(wsRef.current.config.onboarded ? 'pin' : 'onboarding');
  }, [saveConfig]);

  /** Adds a category to this workspace's own list; returns the stored name. */
  const addCategory = useCallback((name: string) => {
    const clean = name.trim().replace(/\s+/g, ' ');
    if (!clean) return '';
    const cfg = wsRef.current.config;
    const known = categoriesFor(cfg.industry, cfg.extraCategories);
    const match = known.find(c => c.toLowerCase() === clean.toLowerCase());
    if (match) return match;                       // already there, under any casing
    saveConfig({ extraCategories: [clean, ...(cfg.extraCategories || [])] });
    return clean;
  }, [saveConfig]);

  /* Changed later, from Settings. */
  const changePlan = useCallback((plan: TierKey) => {
    const from = wsRef.current.config.plan;
    if (from === plan) return;
    writePlan(plan);
    log('Changed plan', `${getTier(from).name} → ${getTier(plan).name}`);
    showToast(`You're on ${getTier(plan).name} now`);
  }, [writePlan, log, showToast]);

  const roleCandidates = useCallback(() => {
    const c = wsRef.current.config;
    const owner = { id: 'owner', name: c.ownerName || 'Owner', type: 'owner' as const, pin: c.pin, perms: [] };
    /* Assistants survive a downgrade in the data, but they cannot sign in
       until the workspace is back on a tier that includes a team. */
    if (!tierHas(c.plan, 'team')) return [owner];
    return [
      owner,
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
    /* An assistant on their own account holds one seat. The control is hidden
       for them; this makes sure no other path can drop them into the role gate,
       where the workspace's PINs would be the only thing in the way. */
    if (assistantLink) return;
    try { sessionStorage.removeItem('traqi_role'); sessionStorage.removeItem('traqi_roleId'); } catch {}
    setUser({ role: '', id: '', name: '', perms: [] });
    setStage('pin');
  }, [assistantLink]);

  const logout = useCallback(async () => {
    try { sessionStorage.removeItem('traqi_role'); sessionStorage.removeItem('traqi_roleId'); } catch {}
    /* Curtain first: clearing the user before the stage would leave the shell
       rendering a signed-out workspace for a beat. Firebase can catch up. */
    setStage('signedOut');
    setUser({ role: '', id: '', name: '', perms: [] });
    await signOut(auth).catch(() => {});
  }, []);

  const plan = ws.config.plan;
  const tier = getTier(plan);
  const custLimit = customerLimit(plan);

  const value = useMemo<Ctx>(() => ({
    ws, user, fbUser, stage, currency, toast, cloudOk,
    setCurrency, save, saveConfig, saveTargets, log, submitApproval, showToast,
    can: (p: string) => can(user, p),
    requiresApproval: (p: string) => requiresApproval(user, p),
    isOwner: user.role === 'owner',
    plan, tier,
    hasFeature: (f: FeatureKey) => tierHas(plan, f),
    customerLimit: custLimit,
    customersLeft: Math.max(0, custLimit - ws.customers.length),
    atCustomerLimit: ws.customers.length >= custLimit,
    choosePlan, changePlan,
    industry: ws.config.industry,
    categories: categoriesFor(ws.config.industry, ws.config.extraCategories),
    chooseIndustry, addCategory,
    linkedAssistant: !!assistantLink,
    joinAsAssistant,
    followUpsDone, markFollowUpDone,
    signInPin, signInPassword, register, googleAuth, completeGoogleProfile,
    resendVerification, checkVerified, resetPassword, finishOnboarding,
    chooseRole, switchRole, logout, roleCandidates
  }), [ws, user, fbUser, stage, currency, toast, cloudOk, save, saveConfig, saveTargets, log,
      submitApproval, showToast, plan, tier, custLimit, choosePlan, changePlan,
      chooseIndustry, addCategory,
      assistantLink, joinAsAssistant,
      followUpsDone, markFollowUpDone, signInPin, signInPassword,
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
