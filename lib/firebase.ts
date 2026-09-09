/* Traqi — Firebase (traqi-prod) */
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import {
  initializeFirestore, doc, setDoc, getDoc, deleteField, Firestore
} from 'firebase/firestore';

export const firebaseConfig = {
  apiKey: 'AIzaSyDa4X61WOd2UjniMOzccxRgeeHY1hAoyZM',
  authDomain: 'traqi-prod.firebaseapp.com',
  databaseURL: 'https://traqi-prod-default-rtdb.firebaseio.com',
  projectId: 'traqi-prod',
  storageBucket: 'traqi-prod.firebasestorage.app',
  messagingSenderId: '378330889803',
  appId: '1:378330889803:web:23791e21d3db198bbdd7ce',
  measurementId: 'G-RM1B641ME3'
};

export const app: FirebaseApp = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const auth: Auth = getAuth(app);
/* A single `undefined` anywhere in a payload makes Firestore reject the whole
   write — one optional field left unset would silently drop an entire save.
   Ignoring them means an unset field is simply not written. */
export const db: Firestore = initializeFirestore(app, { ignoreUndefinedProperties: true });

/** One document per workspace: businesses/{uid}. */
export async function saveWorkspace(uid: string, data: Record<string, unknown>) {
  await setDoc(doc(db, 'businesses', uid), data, { merge: true });
}
export async function loadWorkspace(uid: string): Promise<Record<string, any>> {
  const snap = await getDoc(doc(db, 'businesses', uid));
  return snap.exists() ? snap.data() : {};
}

/* ---- Credentials, kept out of the workspace document ----
   The workspace is one document, and an assistant with their own sign-in has
   to be able to read it to work. PINs therefore live in a private
   subdocument that only the owner's own uid can open. */
export type Creds = { pin?: string; assistantPins?: Record<string, string> };

const credsDoc = (uid: string) => doc(db, 'businesses', uid, 'private', 'creds');

export async function loadCreds(uid: string): Promise<Creds | null> {
  try {
    const snap = await getDoc(credsDoc(uid));
    return snap.exists() ? (snap.data() as Creds) : null;
  } catch {
    /* Denied for assistants by design — they simply hold no PINs. */
    return null;
  }
}
export async function saveCreds(uid: string, patch: Creds) {
  await setDoc(credsDoc(uid), patch, { merge: true });
}

/** One-off: removes PINs left inline by a workspace written before the split. */
export async function clearInlineSecrets(uid: string, config: Record<string, any>, assistants: any[]) {
  const { pin, ...cleanConfig } = config || {};
  await setDoc(doc(db, 'businesses', uid), {
    pin: deleteField(),
    config: { ...cleanConfig, pin: deleteField() },
    assistants: assistants.map(a => { const { pin: _p, ...rest } = a || {}; return rest; })
  }, { merge: true });
}

/** Strips every PIN out of anything on its way to the shared document. */
export function redactSecrets<T extends Record<string, any>>(patch: T): T {
  const out: Record<string, any> = { ...patch };
  if (out.config && typeof out.config === 'object') {
    const { pin, ...rest } = out.config as Record<string, any>;
    out.config = rest;
  }
  if (Array.isArray(out.assistants)) {
    out.assistants = out.assistants.map((a: any) => {
      const { pin, ...rest } = a || {};
      return rest;
    });
  }
  delete out.pin;
  return out as T;
}

/* ---- Per-device PIN sign-in bundle ----
   Written the first time an account reaches this browser, whichever way it
   signed in, so username + PIN works from then on. Password accounts keep
   their credentials here and re-authenticate silently; Google accounts have
   no password to keep, so they carry `uid` and re-authenticate against the
   live Firebase session, falling back to one hinted Google tap. */
export type Bundle = {
  email: string;
  pw: string;                        // '' for Google accounts
  pin: string;
  uid?: string;                      // absent in bundles written before this
  provider?: 'password' | 'google';
};

const bundleKey = (username: string) => 'tq_u_' + String(username || '').trim().toLowerCase();

export function storeBundle(username: string, b: Bundle) {
  if (!username) return;
  const payload = JSON.stringify({ email: b.email || '', pw: b.pw || '', pin: b.pin || '', uid: b.uid || '', provider: b.provider || 'password' });
  localStorage.setItem(bundleKey(username), btoa(unescape(encodeURIComponent(payload))));
}

export function loadBundle(username: string): Bundle | null {
  const raw = localStorage.getItem(bundleKey(username));
  if (!raw) return null;
  try { return JSON.parse(decodeURIComponent(escape(atob(raw)))); } catch { return null; }
}

/** Merge into whatever is already on file — never clears a stored password. */
export function rememberAccount(username: string, patch: Partial<Bundle>) {
  const b = loadBundle(username);
  storeBundle(username, {
    email: patch.email || b?.email || '',
    pw: patch.pw || b?.pw || '',
    pin: patch.pin || b?.pin || '',
    uid: patch.uid || b?.uid || '',
    provider: patch.provider || b?.provider || 'password'
  });
}
