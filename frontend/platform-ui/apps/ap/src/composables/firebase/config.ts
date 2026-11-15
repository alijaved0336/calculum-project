import { initializeApp, FirebaseOptions, getApp } from "firebase/app";
import { getStorage } from "firebase/storage";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
const firebaseConfig: FirebaseOptions = {
    apiKey: import.meta.env.VITE_API_KEY_FB,
    authDomain: import.meta.env.VITE_AUTH_DOMAIN_FB,
    projectId: import.meta.env.VITE_PROJECT_ID_FB,
    storageBucket: import.meta.env.VITE_STORAGE_BUCKET_FB,
    messagingSenderId: import.meta.env.VITE_MESSAGING_SENDER_ID_FB,
    appId: import.meta.env.VITE_APP_ID_FB
};

function createFirebaseApp(config: FirebaseOptions) {
  try {
    return getApp();
  } catch {
    return initializeApp(config);
  }
}

export const appFirebase = createFirebaseApp(firebaseConfig);
export const storage = getStorage(appFirebase);
export const firestore = getFirestore(appFirebase);
export const auth = getAuth(appFirebase);