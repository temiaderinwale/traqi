'use client';
/* Traqi — product admin console: session, gate and privileged actions.

   Runs on its own Firebase app (see adminFirebase.ts), so nothing here can
   disturb a business owner signed into the main app in the same browser.

   Access model:
     · the first account ever to register claims adminMeta/bootstrap and is
       approved on the spot as `superadmin`;
     · every later registration lands as `pending` and grants nothing until
       the superadmin approves it;
     · signing in with an account that has no admin record grants nothing —
       a business owner's credentials get them a polite dead end, not a door. */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signOut, updateProfile, sendPasswordResetEmail, GoogleAuthProvider, signInWithPopup, deleteUser, User
} from 'firebase/auth';
import {
  doc, getDoc, setDoc, updateDoc, collection, getDocs, query, orderBy, limit,
  runTransaction, addDoc, deleteDoc, serverTimestamp
} from 'firebase/firestore';
import { adminAuth, adminDb } from './adminFirebase';
import { AdminUser, AdminRole, AdminStatus, AdminAudit, C } from './adminTypes';
import { lookupEmail, recordEmail } from './usernames';

export type AdminStage =
  | 'loading' | 'signedOut' | 'noaccess' | 'pending' | 'rejected' | 'suspended' | 'ready';

type Ctx = {
  stage: AdminStage;
  me: AdminUser | null;
  fbUser: User | null;
  isSuper: boolean;
  admins: AdminUser[];
  pendingCount: number;
  refreshAdmins: () => Promise<void>;
  signIn: (email: string, pw: string) => Promise<void>;
  register: (username: string, email: string, pw: string) => Promise<void>;
  googleAuth: (mode: 'signin' | 'register') => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  setAdminStatus: (uid: string, status: AdminStatus) => Promise<void>;
  setAdminRole: (uid: string, role: AdminRole) => Promise<void>;
  logAudit: (action: string, detail?: string) => Promise<void>;
  audit: AdminAudit[];
  refreshAudit: () => Promise<void>;
};

const AdminContext = createContext<Ctx | null>(null);
export const useAdmin = () => {
  const c = useContext(AdminContext);
  if (!c) throw new Error('useAdmin must be used inside <AdminProvider>');
  return c;
};

const iso = () => new Date().toISOString();

/** Thrown by signIn/googleAuth when the account is authentic but not an admin. */
export class NoAdminAccess extends Error {
  constructor() { super('This account does not have admin access.'); this.name = 'NoAdminAccess'; }
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

async function readAdmin(uid: string): Promise<AdminUser | null> {
  const snap = await getDoc(doc(adminDb, C.admins, uid));
  return snap.exists() ? ({ uid, ...(snap.data() as any) } as AdminUser) : null;
}

/** Creates the admin record, claiming superadmin only if nobody has yet. */
async function claimOrRequest(u: User, username: string, provider: 'password' | 'google'): Promise<AdminUser> {
  const [metaCol, metaDoc] = C.bootstrap.split('/');
  const bootRef = doc(adminDb, metaCol, metaDoc);
  const meRef = doc(adminDb, C.admins, u.uid);

  return runTransaction(adminDb, async tx => {
    const mine = await tx.get(meRef);
    if (mine.exists()) return { uid: u.uid, ...(mine.data() as any) } as AdminUser;

    const boot = await tx.get(bootRef);
    const first = !boot.exists();
    const rec: AdminUser = {
      uid: u.uid,
      username: username || u.displayName || (u.email || '').split('@')[0],
      email: u.email || '',
      role: first ? 'superadmin' : 'admin',
      status: first ? 'approved' : 'pending',
      provider,
      createdAt: iso(),
      lastLoginAt: iso(),
      ...(first ? { approvedAt: iso(), approvedBy: u.uid, approvedByName: 'Bootstrap' } : {})
    };
    if (first) tx.set(bootRef, { ownerUid: u.uid, ownerEmail: u.email || '', claimedAt: iso() });
    tx.set(meRef, rec);
    return rec;
  });
}

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [stage, setStage] = useState<AdminStage>('loading');
  const [me, setMe] = useState<AdminUser | null>(null);
  const [fbUser, setFbUser] = useState<User | null>(null);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [audit, setAudit] = useState<AdminAudit[]>([]);
  /* True while a sign-in / register action is mid-flight. The auth listener
     stands down for the duration: those actions decide the outcome themselves,
     and an account with no admin record must not flash the refusal screen
     (unmounting the form) before the action has finished signing it out. */
  const busyAuth = useRef(false);
  const meRef = useRef<AdminUser | null>(null);
  meRef.current = me;

  const stageFor = (rec: AdminUser | null): AdminStage => {
    if (!rec) return 'noaccess';
    if (rec.status === 'approved') return 'ready';
    if (rec.status === 'rejected') return 'rejected';
    if (rec.status === 'suspended') return 'suspended';
    return 'pending';
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(adminAuth, async u => {
      setFbUser(u);
      if (busyAuth.current) return;
      if (!u) { setMe(null); setAdmins([]); setStage('signedOut'); return; }
      try {
        const rec = await readAdmin(u.uid);
        if (rec) {
          await updateDoc(doc(adminDb, C.admins, u.uid), { lastLoginAt: iso() }).catch(() => {});
          rec.lastLoginAt = iso();
        }
        setMe(rec);
        setStage(stageFor(rec));
      } catch {
        setMe(null);
        setStage('noaccess');
      }
    });
    return () => unsub();
  }, []);

  const refreshAdmins = useCallback(async () => {
    if (meRef.current?.status !== 'approved') return;
    const snap = await getDocs(collection(adminDb, C.admins));
    setAdmins(snap.docs
      .map(d => ({ uid: d.id, ...(d.data() as any) } as AdminUser))
      .sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || '')));
  }, []);

  useEffect(() => { if (stage === 'ready') refreshAdmins(); }, [stage, refreshAdmins]);

  const logAudit = useCallback(async (action: string, detail = '') => {
    const rec = meRef.current;
    if (!rec) return;
    await addDoc(collection(adminDb, C.audit), {
      ts: iso(), uid: rec.uid, name: rec.username || rec.email, action, detail, at: serverTimestamp()
    }).catch(() => {});
  }, []);

  const refreshAudit = useCallback(async () => {
    if (meRef.current?.status !== 'approved') return;
    const snap = await getDocs(query(collection(adminDb, C.audit), orderBy('ts', 'desc'), limit(300)));
    setAudit(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) } as AdminAudit)));
  }, []);

  /* ---------- Auth actions ---------- */
  const signIn = useCallback(async (email: string, pw: string) => {
    busyAuth.current = true;
    try {
      const cred = await signInWithEmailAndPassword(adminAuth, email, pw);
      const rec = await readAdmin(cred.user.uid);
      if (!rec) { await signOut(adminAuth).catch(() => {}); throw new NoAdminAccess(); }
      await updateDoc(doc(adminDb, C.admins, cred.user.uid), { lastLoginAt: iso() }).catch(() => {});
      setMe(rec);
      setStage(stageFor(rec));
    } finally { busyAuth.current = false; }
  }, []);

  const register = useCallback(async (username: string, email: string, pw: string) => {
    const known = await lookupEmail(email, adminDb);
    if (known && known.provider === 'google') throw new WrongSignInMethod('google');
    busyAuth.current = true;
    try {
      const cred = await createUserWithEmailAndPassword(adminAuth, email, pw);
      await recordEmail(email, 'password', cred.user.uid, adminDb);
      await updateProfile(cred.user, { displayName: username }).catch(() => {});
      const rec = await claimOrRequest(cred.user, username, 'password');
      setMe(rec);
      setStage(stageFor(rec));
    } finally { busyAuth.current = false; }
  }, []);

  const googleAuth = useCallback(async (mode: 'signin' | 'register') => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    busyAuth.current = true;
    try {
      const cred = await signInWithPopup(adminAuth, provider);
      /* One address, one way in — whether Firebase links providers on a shared
         address or opens a second account, both are turned away here. */
      const known = await lookupEmail(cred.user.email || '', adminDb);
      const linkedPassword = (cred.user.providerData || []).some(p => p.providerId === 'password');
      if (linkedPassword || (known && known.provider === 'password' && known.uid !== cred.user.uid)) {
        if (!known || known.uid !== cred.user.uid) await deleteUser(cred.user).catch(() => {});
        await signOut(adminAuth).catch(() => {});
        throw new WrongSignInMethod('password');
      }
      await recordEmail(cred.user.email || '', 'google', cred.user.uid, adminDb);
      let rec = await readAdmin(cred.user.uid);
      if (!rec) {
        /* Signing in is not a way to ask for access — that is what Register is
           for. Turn the session away rather than leaving it half-authenticated. */
        if (mode === 'signin') { await signOut(adminAuth).catch(() => {}); throw new NoAdminAccess(); }
        rec = await claimOrRequest(cred.user, cred.user.displayName || '', 'google');
      }
      setMe(rec);
      setStage(stageFor(rec));
    } finally { busyAuth.current = false; }
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    await sendPasswordResetEmail(adminAuth, email);
  }, []);

  const logout = useCallback(async () => {
    setStage('signedOut');
    setMe(null);
    await signOut(adminAuth).catch(() => {});
  }, []);

  /* ---------- Admin team management (superadmin only; rules enforce it) ---------- */
  const setAdminStatus = useCallback(async (uid: string, status: AdminStatus) => {
    const rec = meRef.current;
    const patch: Record<string, unknown> = { status };
    if (status === 'approved') {
      patch.approvedAt = iso();
      patch.approvedBy = rec?.uid || '';
      patch.approvedByName = rec?.username || rec?.email || '';
    }
    await updateDoc(doc(adminDb, C.admins, uid), patch);
    await logAudit('admin_' + status, uid);
    await refreshAdmins();
  }, [logAudit, refreshAdmins]);

  const setAdminRole = useCallback(async (uid: string, role: AdminRole) => {
    await updateDoc(doc(adminDb, C.admins, uid), { role });
    await logAudit('admin_role', `${uid} → ${role}`);
    await refreshAdmins();
  }, [logAudit, refreshAdmins]);

  const pendingCount = admins.filter(a => a.status === 'pending').length;

  const value = useMemo<Ctx>(() => ({
    stage, me, fbUser, isSuper: me?.role === 'superadmin', admins, pendingCount,
    refreshAdmins, signIn, register, googleAuth, resetPassword, logout,
    setAdminStatus, setAdminRole, logAudit, audit, refreshAudit
  }), [stage, me, fbUser, admins, pendingCount, refreshAdmins, signIn, register, googleAuth,
      resetPassword, logout, setAdminStatus, setAdminRole, logAudit, audit, refreshAudit]);

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

/** Used by the newsletter module — kept here so every Firestore path lives together. */
export { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, getDocs, addDoc, query, orderBy, limit };
