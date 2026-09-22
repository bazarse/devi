import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import serviceAccount from './firebase-service-account.json';

export function getFirebaseMessaging() {
  const app = getApps().length === 0
    ? initializeApp({
        credential: cert(serviceAccount as any)
      })
    : getApps()[0];

  return getMessaging(app);
}
