/* Traqi — assistant invitations.

   An assistant can reach a workspace two ways: on the owner's own device
   through Switch Role, or with their own sign-in on their own phone. The
   second route starts here — the owner registers the assistant, Traqi mints an
   invite, and the assistant follows the link to claim exactly that seat.

   The invite document is the contract: it names the workspace, the seat and
   the one email address allowed to claim it. The token in the URL is the only
   credential to read it, so it is generated from the platform's CSPRNG and
   never reused. */

import { doc, getDoc, setDoc, updateDoc, addDoc, collection, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';
import type { Assistant } from './types';

export type InviteStatus = 'pending' | 'accepted' | 'revoked';

export type AssistantInvite = {
  token: string;
  ownerUid: string;
  assistantId: string;
  bizName: string;
  ownerName: string;
  username: string;      // the assistant's display name — locked on the form
  email: string;         // the only address that may claim this seat
  phone: string;
  status: InviteStatus;
  createdAt: string;
  acceptedAt?: string;
  acceptedUid?: string;
};

export type AssistantLink = {
  ownerUid: string;
  assistantId: string;
  token: string;
  email: string;
  createdAt: string;
};

const INVITES = 'assistantInvites';
const ACCOUNTS = 'assistantAccounts';

/** 32 hex characters of real randomness — the whole security of the link. */
export function newToken(): string {
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  return Array.from(b, x => x.toString(16).padStart(2, '0')).join('');
}

export const inviteUrl = (token: string) =>
  (typeof window === 'undefined' ? '' : window.location.origin) + '/join?t=' + token;

export async function getInvite(token: string): Promise<AssistantInvite | null> {
  if (!token) return null;
  const snap = await getDoc(doc(db, INVITES, token));
  return snap.exists() ? ({ token, ...(snap.data() as any) } as AssistantInvite) : null;
}

/** Writes (or refreshes) the invite for a seat and returns its link. */
export async function saveInvite(inv: Omit<AssistantInvite, 'createdAt' | 'status'> &
  Partial<Pick<AssistantInvite, 'createdAt' | 'status'>>): Promise<string> {
  const { token, ...rest } = inv;
  await setDoc(doc(db, INVITES, token), {
    ...rest,
    status: inv.status || 'pending',
    createdAt: inv.createdAt || new Date().toISOString()
  }, { merge: true });
  return inviteUrl(token);
}

export async function revokeInvite(token: string) {
  if (token) await deleteDoc(doc(db, INVITES, token)).catch(() => {});
}

export async function acceptInvite(token: string, uid: string) {
  await updateDoc(doc(db, INVITES, token), {
    status: 'accepted', acceptedAt: new Date().toISOString(), acceptedUid: uid
  });
}

/* ---------- the assistant's own account, pointing at their workspace ---------- */
export async function getAssistantLink(uid: string): Promise<AssistantLink | null> {
  const snap = await getDoc(doc(db, ACCOUNTS, uid));
  return snap.exists() ? (snap.data() as AssistantLink) : null;
}

export async function createAssistantLink(uid: string, inv: AssistantInvite) {
  const link: AssistantLink = {
    ownerUid: inv.ownerUid,
    assistantId: inv.assistantId,
    token: inv.token,
    email: inv.email,
    createdAt: new Date().toISOString()
  };
  await setDoc(doc(db, ACCOUNTS, uid), link);
  return link;
}

/* ---------- delivery ---------- */
export function inviteMessage(inv: { bizName: string; ownerName: string; username: string }, url: string) {
  return `Hi ${inv.username}, ${inv.ownerName} has added you to ${inv.bizName} on Traqi.\n\n`
    + `Set up your own sign-in here — your details are already filled in:\n${url}\n\n`
    + `You'll only see what you've been given access to.`;
}

/** wa.me link with the message prefilled. Nigerian numbers by default. */
export function whatsappInvite(phone: string, text: string) {
  const digits = String(phone || '').replace(/\D/g, '');
  const intl = digits.startsWith('234') ? digits
    : digits.startsWith('0') ? '234' + digits.slice(1)
      : digits.length === 10 ? '234' + digits : digits;
  return 'https://wa.me/' + intl + '?text=' + encodeURIComponent(text);
}

export const mailtoInvite = (email: string, subject: string, body: string) =>
  `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));

/** Queues the invite for delivery through the Firestore mail collection.
    Throws if the queue is unavailable, so the caller can fall back to mailto. */
export async function queueInviteEmail(inv: AssistantInvite, url: string) {
  const text = inviteMessage(inv, url);
  await addDoc(collection(db, 'mail'), {
    to: [inv.email],
    message: {
      subject: `${inv.ownerName} added you to ${inv.bizName} on Traqi`,
      text,
      html: `<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;margin:0 auto;padding:28px 24px;color:#0F172A">
<div style="font-weight:800;font-size:22px;color:#4F46E5;margin-bottom:20px">Traqı</div>
<p style="line-height:1.65;margin:0 0 16px">Hi ${esc(inv.username)},</p>
<p style="line-height:1.65;margin:0 0 16px"><strong>${esc(inv.ownerName)}</strong> has added you to <strong>${esc(inv.bizName)}</strong> on Traqi.</p>
<p style="line-height:1.65;margin:0 0 22px">Set up your own sign-in below — your name, email and business are already filled in.</p>
<p style="margin:0 0 24px"><a href="${url}" style="background:#4F46E5;color:#fff;text-decoration:none;font-weight:600;padding:12px 22px;border-radius:10px;display:inline-block">Accept your invitation</a></p>
<p style="font-size:12px;color:#64748B;line-height:1.6;margin:0">If the button doesn't work, paste this into your browser:<br>${esc(url)}</p>
</div>`
    },
    traqi: { kind: 'assistant_invite', ownerUid: inv.ownerUid, assistantId: inv.assistantId, ts: new Date().toISOString() }
  });
}

/** Tells the owner, by email, that a seat has just been claimed. */
export async function notifyOwnerOfJoin(
  ownerEmail: string, ownerName: string, assistantName: string, bizName: string, ownerUid: string
) {
  if (!ownerEmail) return;
  await addDoc(collection(db, 'mail'), {
    to: [ownerEmail],
    message: {
      subject: `${assistantName} has joined ${bizName} on Traqi`,
      text: `Hi ${ownerName},\n\n${assistantName} has finished setting up their own Traqi sign-in and can now work from their own device with the permissions you gave them.\n\nYou can review or pause their access on the Team page at any time.`,
      html: `<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;margin:0 auto;padding:28px 24px;color:#0F172A">
<div style="font-weight:800;font-size:22px;color:#4F46E5;margin-bottom:20px">Traqı</div>
<p style="line-height:1.65;margin:0 0 16px">Hi ${esc(ownerName)},</p>
<p style="line-height:1.65;margin:0 0 16px"><strong>${esc(assistantName)}</strong> has finished setting up their own Traqi sign-in and can now work from their own device — with exactly the permissions you gave them.</p>
<p style="line-height:1.65;margin:0">You can review or pause their access on the Team page at any time.</p>
</div>`
    },
    traqi: { kind: 'assistant_joined', ownerUid, ts: new Date().toISOString() }
  });
}

/** Everything the Team page needs to hand an invite over, in one call. */
export async function ensureInvite(
  a: Assistant, ownerUid: string, bizName: string, ownerName: string
): Promise<{ inv: AssistantInvite; url: string; token: string }> {
  const token = a.inviteToken || newToken();
  const inv: AssistantInvite = {
    token, ownerUid, assistantId: a.id, bizName, ownerName,
    username: a.name, email: (a.email || '').trim().toLowerCase(), phone: a.phone || '',
    status: 'pending', createdAt: new Date().toISOString()
  };
  const url = await saveInvite(inv);
  return { inv, url, token };
}
