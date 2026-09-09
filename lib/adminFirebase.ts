/* Traqi — Firebase instance for the product admin console (/admin).

   A second named app on the same project. The Firebase JS SDK keys auth
   persistence by app name, so the admin session and a business owner's
   session live side by side in one browser without either signing the other
   out — and TraqiProvider's onAuthStateChanged never sees an admin. */
import { initializeApp, getApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { initializeFirestore, Firestore } from 'firebase/firestore';
import { firebaseConfig } from './firebase';

const APP_NAME = 'traqi-admin';

export const adminApp: FirebaseApp = getApps().some(a => a.name === APP_NAME)
  ? getApp(APP_NAME)
  : initializeApp(firebaseConfig, APP_NAME);

export const adminAuth: Auth = getAuth(adminApp);
export const adminDb: Firestore = initializeFirestore(adminApp, { ignoreUndefinedProperties: true });
