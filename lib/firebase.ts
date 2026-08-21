/* Traqi — Firebase (traqi-prod) */
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, Firestore } from 'firebase/firestore';

const firebaseConfig = {
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
export const db: Firestore = getFirestore(app);

/** One document per workspace: businesses/{uid}. */
export async function saveWorkspace(uid: string, data: Record<string, unknown>) {
  await setDoc(doc(db, 'businesses', uid), data, { merge: true });
}
export async function loadWorkspace(uid: string): Promise<Record<string, any>> {
  const snap = await getDoc(doc(db, 'businesses', uid));
  return snap.exists() ? snap.data() : {};
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
