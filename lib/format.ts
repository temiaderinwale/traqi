/* Traqi — formatting and small helpers */
export function fmt(n: number, currency: 'NGN' | 'USD' = 'NGN', usdRate = 1600): string {
  const v = Number(n || 0);
  return currency === 'USD' ? '$' + Math.round(v / usdRate).toLocaleString() : '₦' + Math.round(v).toLocaleString();
}
export const todayStr = () => new Date().toISOString().slice(0, 10);
export function diffDays(d: string): number {
  const dt = new Date(d), t = new Date(); t.setHours(0, 0, 0, 0);
  return Math.round((dt.getTime() - t.getTime()) / 86400000);
}
export const fmtDate = (d?: string) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
export function nextId(prefix: string, arr: { id: string }[]): string {
  const nums = arr.map(x => parseInt((x.id || '').replace(prefix + '-', ''))).filter(n => !isNaN(n));
  const n = nums.length ? Math.max(...nums) + 1 : 1;
  return prefix + '-' + (n < 10 ? '00' + n : n < 100 ? '0' + n : n);
}
export const initials = (name: string) =>
  (name || '').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
export const marginClass = (m: number) => (m >= 40 ? 'pos' : m >= 20 ? 'warn-t' : 'neg');
export const waLink = (phone?: string) =>
  'https://wa.me/234' + String(phone || '').replace(/\D/g, '').replace(/^0/, '');
export function strength(v: string) {
  let s = 0;
  if (v.length >= 6) s++; if (v.length >= 10) s++;
  if (/[A-Z]/.test(v)) s++; if (/[0-9]/.test(v)) s++; if (/[^A-Za-z0-9]/.test(v)) s++;
  return {
    width: ['0%', '20%', '44%', '68%', '86%', '100%'][s],
    color: ['transparent', '#DC2626', '#F59E0B', '#EAB308', '#16A34A', '#15803D'][s],
    label: ['', 'Weak', 'Fair', 'Moderate', 'Strong', 'Very strong'][s]
  };
}
export function authError(code?: string): string {
  const m: Record<string, string> = {
    'auth/user-not-found': 'No account found with that email.',
    'auth/wrong-password': 'Incorrect password.',
    'auth/invalid-email': 'That email address looks invalid.',
    'auth/email-already-in-use': 'That email is already registered.',
    'auth/weak-password': 'Password is too weak (6 characters minimum).',
    'auth/too-many-requests': 'Too many attempts — wait a moment and try again.',
    'auth/network-request-failed': 'Network error. Check your connection.',
    'auth/invalid-credential': 'Incorrect email or password.',
    'auth/popup-closed-by-user': 'Google sign-in was cancelled.',
    'auth/popup-blocked': 'Pop-up blocked — allow pop-ups and try again.',
    'auth/unauthorized-domain': 'This domain is not authorised for Google sign-in yet.',
    'auth/operation-not-allowed': 'That sign-in method is not enabled in Firebase yet.'
  };
  return m[code || ''] || 'Something went wrong. Please try again.';
}
