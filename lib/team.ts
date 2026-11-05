/* Traqi — Join the Traqi Team (/team).

   The volunteer call from the "Join Our Team" fliers, as a page. It is the
   pilot page's twin: one form, nothing on it opens the product, and the form
   ends in a WhatsApp conversation with us. Every application is written twice
   — to Firestore, where the admin console triages it, and to a Google Sheet
   owned by traqi.info@gmail.com, through an Apps Script web app. */

import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { WHATSAPP_NUMBER } from './pilot';

/** Where every button on the team page goes. */
export const FORM_ANCHOR = '#apply';

/** As printed on the fliers. */
export const DEADLINE_LABEL = '30 November';

/** The open roles, word for word from the fliers. One per application —
    somebody torn between two can apply twice, and we would rather read two
    clear answers than one hedged one. */
export const TEAM_ROLES = [
  {
    name: 'Operations & Customer Support',
    desc: 'Be the first voice our business owners hear — answer questions, guide new users through setup and keep the day-to-day running smoothly.'
  },
  {
    name: 'Technical Assistant',
    desc: 'Help test new features, reproduce and report bugs, and support the product team as Traqi grows.'
  },
  {
    name: 'Social Media Manager',
    desc: 'Run Traqi\'s pages — plan the calendar, post consistently and grow a community of small business owners.'
  },
  {
    name: 'Content Creator',
    desc: 'Make the videos, graphics and short posts that show what Traqi does for a real business.'
  },
  {
    name: 'Marketing & Communications Associate',
    desc: 'Shape how Traqi is talked about — campaigns, partnerships, newsletters and outreach to the businesses we serve.'
  }
] as const;

export const ROLE_NAMES: string[] = TEAM_ROLES.map(r => r.name);

/** What the applicant is doing now — so we know what hours to expect and who
    is fitting this around school or a job. */
export const OCCUPATIONS = ['Student', 'Employed', 'Self-employed', 'Freelancer', 'Looking for work', 'Other'];

/** Hours a week they can give. Volunteers, so a range rather than a promise. */
export const AVAILABILITY = ['Less than 5 hours', '5 – 10 hours', '10 – 20 hours', 'More than 20 hours'];

export type TeamApplication = {
  firstName: string;
  surname: string;
  email: string;
  whatsapp: string;
  location: string;
  role: string;            // exactly one of ROLE_NAMES
  occupation: string;      // one of OCCUPATIONS
  availability: string;    // one of AVAILABILITY
  portfolio: string;       // optional link: LinkedIn, portfolio, social page
  experience: string;      // skills and experience for the role
  motivation: string;      // why Traqi, why this role
};

export const BLANK_APPLICATION: TeamApplication = {
  firstName: '', surname: '', email: '', whatsapp: '', location: '', role: '',
  occupation: '', availability: '', portfolio: '', experience: '', motivation: ''
};

/* Kept in step with the field lengths the Firestore rules enforce. The link
   gets more room than a name: LinkedIn URLs with tracking tails run long. */
export const LIMITS = { short: 120, link: 300, long: 1200 };

export const isUrl = (v: string) => /^(https?:\/\/)?[^\s.]+\.[^\s]{2,}$/i.test(v.trim());

/** What the applicant carries into WhatsApp once they have applied, so the
    conversation opens with us already knowing who is writing and for what. */
export function applicationMessage(f: TeamApplication): string {
  return `Hello Traqi, I'm ${f.firstName.trim()} ${f.surname.trim()} from ${f.location.trim()}.\n`
    + `I just applied to join the Traqi Team as a volunteer ${f.role} and would like to proceed to the next step.`;
}

export const whatsappLink = (message: string) =>
  `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;

/** The Apps Script web app that appends each application to the team sheet.
    NEXT_PUBLIC_TEAM_SHEET_URL overrides it. Emptied, applications still
    reach the admin console; only the sheet copy is skipped. Redeploying the
    script as a *new version* of the same deployment keeps this URL. */
export const SHEET_ENDPOINT = process.env.NEXT_PUBLIC_TEAM_SHEET_URL
  || 'https://script.google.com/macros/s/AKfycbxs2fwymyYegawaUkX3YF8XG7wnszH6uCt8bt_oQkvO889kNJhRvJkgxVK-KPr6A90c/exec';

const clean = (f: TeamApplication) => ({
  firstName: f.firstName.trim(),
  surname: f.surname.trim(),
  email: f.email.trim().toLowerCase(),
  whatsapp: f.whatsapp.trim(),
  location: f.location.trim(),
  role: f.role,
  occupation: f.occupation,
  availability: f.availability,
  portfolio: f.portfolio.trim(),
  experience: f.experience.trim(),
  motivation: f.motivation.trim()
});

/** The sheet copy. Apps Script answers a cross-origin POST with a redirect
    the browser will not let us read, so this is sent `no-cors` as plain text
    (which also skips the preflight Apps Script cannot answer) and never
    awaited for a verdict: the Firestore write is the one that counts. */
function sendToSheet(id: string, data: ReturnType<typeof clean>) {
  if (!SHEET_ENDPOINT) return;
  try {
    fetch(SHEET_ENDPOINT, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ id, ...data, submittedAt: new Date().toISOString() }),
      keepalive: true
    }).catch(() => { /* the console still has it */ });
  } catch { /* ditto */ }
}

/** Records one application. Returns the id; throws on a rejected write,
    which the form reports. */
export async function submitTeamApplication(f: TeamApplication): Promise<string> {
  const data = clean(f);
  const ref = await addDoc(collection(db, 'teamApplications'), {
    ...data,
    status: 'new',
    source: 'team',
    createdAt: serverTimestamp()
  });
  sendToSheet(ref.id, data);
  return ref.id;
}
