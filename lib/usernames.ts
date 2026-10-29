/* Traqi — usernames and email identity.

   Firebase Auth only knows email addresses, so signing in with a username
   means resolving it to one first. This registry is that lookup, and it is
   also what makes usernames unique across the whole product — business
   owners, assistants and console admins alike: a name is reserved the moment
   it is handed out and can only ever be claimed by the address it was
   reserved for. Its holder may later move to another name, which lets the
   old one go.

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
  kind: 'owner' | 'assistant' | 'admin';
  reservedBy?: string;       // owner uid, for a seat reserved on someone's behalf
  assistantId?: string;
  createdAt: string;
  claimedAt?: string;
};

/** Usernames match case- and space-insensitively. */
export const usernameKey = (u: string) => String(u || '').trim().toLowerCase().replace(/\s+/g, '');
export const looksLikeEmail = (v: string) => /\S+@\S+\.\S+/.test(String(v || '').trim());

/** What a username input keeps of what was typed: no spaces, anywhere. */
export const cleanUsername = (u: string) => String(u || '').replace(/\s+/g, '');

/** Why a new username can't be used as typed, or '' when it can. Only applied
    to names being chosen now — older names keep working as they are. */
export function usernameProblem(u: string): string {
  const v = String(u || '');
  if (!v.trim()) return 'Choose a username.';
  if (/\s/.test(v)) return 'Usernames cannot contain spaces.';
  if (v.includes('@')) return 'Usernames cannot contain "@" — that is how an email is told apart.';
  if (v.length < 3) return 'Use at least 3 characters.';
  if (v.length > 30) return 'Keep it to 30 characters or fewer.';
  if (!/^[A-Za-z0-9._-]+$/.test(v)) return 'Use letters, numbers, dots, dashes or underscores only.';
  return '';
}

export class UsernameTaken extends Error {
  constructor(name: string) {
    super(`Username already taken — "${name}" is in use. Please choose another.`);
    this.name = 'UsernameTaken';
  }
}

export async function lookupUsername(username: string, dbi: Firestore = db): Promise<UsernameDoc | null> {
  const k = usernameKey(username);
  if (!k) return null;
  try {
    const snap = await getDoc(doc(dbi, 'usernames', k));
    return snap.exists() ? (snap.data() as UsernameDoc) : null;
  } catch { return null; }
}

/** Free, or already held by this same person / this same seat. */
export async function isUsernameFree(
  username: string, mine?: { uid?: string; assistantId?: string }, dbi: Firestore = db
): Promise<boolean> {
  const held = await lookupUsername(username, dbi);
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
  username: string, email: string, uid: string, kind: UsernameDoc['kind'], dbi: Firestore = db
): Promise<boolean> {
  const k = usernameKey(username);
  if (!k) return false;
  const held = await lookupUsername(k, dbi);
  const now = new Date().toISOString();
  try {
    if (!held) {
      await setDoc(doc(dbi, 'usernames', k), {
        username: String(username).trim(), email: email.trim().toLowerCase(),
        uid, kind, createdAt: now, claimedAt: now
      });
      return true;
    }
    if (held.uid === uid) return true;
    /* A reservation made for exactly this address — take it over. */
    if (!held.uid && held.email === email.trim().toLowerCase()) {
      await updateDoc(doc(dbi, 'usernames', k), { uid, claimedAt: now });
      return true;
    }
    return false;
  } catch { return false; }
}

/** Moves an account from one name to another. The new name is claimed first,
    so a taken name changes nothing; only then is the old one let go, which
    frees it for anyone else. A change of case alone keeps the same entry. */
export async function renameUsername(
  from: string, to: string, email: string, uid: string, kind: UsernameDoc['kind'], dbi: Firestore = db
): Promise<void> {
  const next = cleanUsername(to);
  if (usernameKey(from) === usernameKey(next)) return;
  const k = usernameKey(next);
  const addr = email.trim().toLowerCase();
  const held = await lookupUsername(next, dbi);
  /* Taken means someone else holds it — not that a write failed. */
  if (held && held.uid !== uid && !(held.uid === '' && held.email === addr)) throw new UsernameTaken(next);
  const now = new Date().toISOString();
  try {
    if (!held) {
      await setDoc(doc(dbi, 'usernames', k), { username: next, email: addr, uid, kind, createdAt: now, claimedAt: now });
    } else if (held.uid !== uid) {
      await updateDoc(doc(dbi, 'usernames', k), { uid, claimedAt: now });
    }
  } catch (e: any) {
    if (e?.code === 'permission-denied') {
      /* Either someone took it a moment ago, or the session has lapsed. */
      const now2 = await lookupUsername(next, dbi);
      if (now2?.uid && now2.uid !== uid) throw new UsernameTaken(next);
      throw new Error('Traqi could not save that username — sign out and back in, then try again.');
    }
    throw new Error('Could not reach Traqi to save that username — check your connection and try again.');
  }
  /* Let the old name go. If the rules refuse, it simply stays reserved to this account. */
  const old = await lookupUsername(from, dbi);
  if (old && old.uid === uid) await deleteDoc(doc(dbi, 'usernames', usernameKey(from))).catch(() => {});
}

/** A free name built from `base` — used where nobody typed the name (a Google
    display name), so a clash is worked around rather than refused. */
export async function freeUsernameFrom(base: string, dbi: Firestore = db): Promise<string> {
  const root = cleanUsername(base).replace(/[^A-Za-z0-9._-]/g, '').slice(0, 24) || 'user';
  if (await isUsernameFree(root, undefined, dbi)) return root;
  for (let i = 0; i < 6; i++) {
    const candidate = root + Math.floor(100 + Math.random() * 900);
    if (await isUsernameFree(candidate, undefined, dbi)) return candidate;
  }
  return root + Date.now().toString().slice(-6);
}

/** Turns whatever was typed into an email address to authenticate with. */
export async function resolveToEmail(identifier: string, dbi: Firestore = db): Promise<string | null> {
  const v = String(identifier || '').trim();
  if (!v) return null;
  if (looksLikeEmail(v)) return v;
  const claim = await lookupUsername(v, dbi);
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
