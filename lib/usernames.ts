/* Traqi — usernames and email identity.

   Firebase Auth only knows email addresses, so signing in with a username
   means resolving it to one first. This registry is that lookup, and it is
   also what makes usernames unique across the whole product: a name is
   reserved the moment it is handed out and can only ever be claimed by the
   address it was reserved for.

   A username document is readable without a session — it has to be, since the
   lookup happens before anyone is signed in. Knowing a username therefore
   reveals the address behind it, the usual trade for username login; the
   collection is not listable, so names cannot be harvested. */

import { doc, getDoc, setDoc, updateDoc, deleteDoc, Firestore } from 'firebase/firestore';
import { db } from './firebase';

export type UsernameDoc = {
  username: string;          // as typed, for display
  email: string;             // the address allowed to claim it
  uid: string;               // '' while still only reserved
  kind: 'owner' | 'assistant';
  reservedBy?: string;       // owner uid, for a seat reserved on someone's behalf
  assistantId?: string;
  createdAt: string;
  claimedAt?: string;
};

/** Usernames match case- and space-insensitively. */
export const usernameKey = (u: string) => String(u || '').trim().toLowerCase().replace(/\s+/g, '');
export const looksLikeEmail = (v: string) => /\S+@\S+\.\S+/.test(String(v || '').trim());

export class UsernameTaken extends Error {
  constructor(name: string) {
    super(`Username already exists — "${name}" is taken. Please choose another.`);
    this.name = 'UsernameTaken';
  }
}

export async function lookupUsername(username: string): Promise<UsernameDoc | null> {
  const k = usernameKey(username);
  if (!k) return null;
  try {
    const snap = await getDoc(doc(db, 'usernames', k));
    return snap.exists() ? (snap.data() as UsernameDoc) : null;
  } catch { return null; }
}

/** Free, or already held by this same person / this same seat. */
export async function isUsernameFree(
  username: string, mine?: { uid?: string; assistantId?: string }
): Promise<boolean> {
  const held = await lookupUsername(username);
  if (!held) return true;
  if (mine?.uid && held.uid === mine.uid) return true;
  if (mine?.assistantId && held.assistantId === mine.assistantId) return true;
  return false;
}

/** An owner puts a name aside for an assistant they are about to invite. */
export async function reserveUsername(
  username: string, email: string, ownerUid: string, assistantId: string
): Promise<void> {
  const k = usernameKey(username);
  if (!k) return;
  if (!(await isUsernameFree(k, { assistantId }))) throw new UsernameTaken(username.trim());
  await setDoc(doc(db, 'usernames', k), {
    username: String(username).trim(), email: email.trim().toLowerCase(), uid: '',
    kind: 'assistant', reservedBy: ownerUid, assistantId, createdAt: new Date().toISOString()
  });
}

/** Gives an unclaimed reservation back — used when a seat is renamed. */
export async function releaseUsername(username: string) {
  const k = usernameKey(username);
  if (!k) return;
  await deleteDoc(doc(db, 'usernames', k)).catch(() => {});
}

/** Takes ownership of a name: claims a reservation, or registers a fresh one. */
export async function claimUsername(
  username: string, email: string, uid: string, kind: UsernameDoc['kind']
): Promise<boolean> {
  const k = usernameKey(username);
  if (!k) return false;
  const held = await lookupUsername(k);
  const now = new Date().toISOString();
  try {
    if (!held) {
      await setDoc(doc(db, 'usernames', k), {
        username: String(username).trim(), email: email.trim().toLowerCase(),
        uid, kind, createdAt: now, claimedAt: now
      });
      return true;
    }
    if (held.uid === uid) return true;
    /* A reservation made for exactly this address — take it over. */
    if (!held.uid && held.email === email.trim().toLowerCase()) {
      await updateDoc(doc(db, 'usernames', k), { uid, claimedAt: now });
      return true;
    }
    return false;
  } catch { return false; }
}

/** Turns whatever was typed into an email address to authenticate with. */
export async function resolveToEmail(identifier: string): Promise<string | null> {
  const v = String(identifier || '').trim();
  if (!v) return null;
  if (looksLikeEmail(v)) return v;
  const claim = await lookupUsername(v);
  return claim?.email || null;
}

/* ---------- one address, one way in ----------
   Firebase can be configured either to link providers that share an address or
   to keep separate accounts per provider. Rather than depend on that setting,
   Traqi records how each address first signed up and holds it to that. */

export type EmailDoc = { email: string; provider: 'password' | 'google'; uid: string; createdAt: string };

const emailKey = (e: string) => String(e || '').trim().toLowerCase();

/* The admin console runs on its own Firestore instance, so both take one. */
export async function lookupEmail(email: string, dbi: Firestore = db): Promise<EmailDoc | null> {
  const k = emailKey(email);
  if (!k) return null;
  try {
    const snap = await getDoc(doc(dbi, 'emails', k));
    return snap.exists() ? (snap.data() as EmailDoc) : null;
  } catch { return null; }
}

export async function recordEmail(
  email: string, provider: EmailDoc['provider'], uid: string, dbi: Firestore = db
) {
  const k = emailKey(email);
  if (!k) return;
  await setDoc(doc(dbi, 'emails', k), {
    email: k, provider, uid, createdAt: new Date().toISOString()
  }, { merge: true }).catch(() => {});
}
