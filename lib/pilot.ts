/* Traqi — the pilot programme (/pilot).

   A deliberately unlinked page, shared by hand with the people we want as
   early users. Nothing on it opens the product: every call to action on
   that page leads back to the one form, and the form ends in a WhatsApp
   conversation with us. What that costs is a couple of constants and one
   collection, both kept here. */

import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { INDUSTRIES } from './industries';

/** Where every button on the pilot page goes. */
export const FORM_ANCHOR = '#early-access';

/* wa.me wants the number in full international form, digits only. */
export const WHATSAPP_NUMBER = '2349032141555';
export const WHATSAPP_DISPLAY = '+234 903 214 1555';
export const WHATSAPP_MESSAGE =
  'Hello Traqi, I would like to be one of the early users to use your services.';

export const whatsappLink = (message = WHATSAPP_MESSAGE) =>
  `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;

/** The onboarding industries, offered by name, plus a way out for anything
    we have not thought of — a business nobody can categorise is exactly the
    kind of applicant worth hearing from. */
export const OTHER_CATEGORY = 'Other';
export const BUSINESS_CATEGORIES = [...INDUSTRIES.map(i => i.name), OTHER_CATEGORY];

export type PilotSignup = {
  firstName: string;
  surname: string;
  business: string;
  category: string;        // one of BUSINESS_CATEGORIES, or the typed one
  categoryOther: string;   // what they typed when they chose "Other"
  location: string;
  email: string;
  whatsapp: string;
  about: string;           // one open-ended box; anything else goes in here too
};

export const BLANK_SIGNUP: PilotSignup = {
  firstName: '', surname: '', business: '', category: '', categoryOther: '',
  location: '', email: '', whatsapp: '', about: ''
};

/* Kept in step with the field lengths the Firestore rules enforce, so a
   rejected write is something we caught here first. */
export const LIMITS = { short: 120, long: 1200 };

export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());
/* Nigerian numbers arrive as 0803…, 234803… or +234 803 … — accept them all
   and let the digits decide. */
export const isPhone = (v: string) => /^[+\d][\d\s()-]{6,}$/.test(v.trim()) && v.replace(/\D/g, '').length >= 10;

/** Records one applicant. Returns the id so a duplicate submit is visible in
    the console; throws on a rejected write, which the form reports. */
export async function submitPilotSignup(f: PilotSignup): Promise<string> {
  const category = f.category === OTHER_CATEGORY ? f.categoryOther.trim() : f.category;
  const ref = await addDoc(collection(db, 'pilotSignups'), {
    firstName: f.firstName.trim(),
    surname: f.surname.trim(),
    business: f.business.trim(),
    category,
    categoryGroup: f.category,
    location: f.location.trim(),
    email: f.email.trim().toLowerCase(),
    whatsapp: f.whatsapp.trim(),
    about: f.about.trim(),
    status: 'new',
    source: 'pilot',
    createdAt: serverTimestamp()
  });
  return ref.id;
}
