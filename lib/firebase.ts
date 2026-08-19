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

/* ---- Per-device PIN sign-in bundle ---- */
const bundleKey = (username: string) => 'tq_u_' + String(username || '').trim().toLowerCase();
export function storeBundle(username: string, email: string, pw: string, pin: string) {
  const payload = JSON.stringify({ email, pw, pin });
  localStorage.setItem(bundleKey(username), btoa(unescape(encodeURIComponent(payload))));
}
export function loadBundle(username: string): { email: string; pw: string; pin: string } | null {
  const raw = localStorage.getItem(bundleKey(username));
  if (!raw) return null;
  try { return JSON.parse(decodeURIComponent(escape(atob(raw)))); } catch { return null; }
}
export function updateBundlePin(username: string, pin: string) {
  const b = loadBundle(username);
  if (b) storeBundle(username, b.email, b.pw, pin);
}
