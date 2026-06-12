import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import {
  formatMissingFirebaseConfigMessage,
  getFirebaseConfig,
} from "@/lib/firebase/config";

export type FirebaseClientServices = {
  firebaseApp: FirebaseApp;
  firebaseAuth: Auth;
  firestoreDb: Firestore;
};

export type FirebaseClientResult =
  | {
      isReady: true;
      services: FirebaseClientServices;
      error: null;
    }
  | {
      isReady: false;
      services: null;
      error: string;
    };

export let firebaseApp: FirebaseApp | null = null;
export let firebaseAuth: Auth | null = null;
export let firestoreDb: Firestore | null = null;

let cachedServices: FirebaseClientServices | null = null;

export function getFirebaseClient(): FirebaseClientResult {
  if (cachedServices) {
    return {
      isReady: true,
      services: cachedServices,
      error: null,
    };
  }

  if (typeof window === "undefined") {
    return {
      isReady: false,
      services: null,
      error: "Firebase client services are only available in the browser.",
    };
  }

  const firebaseConfig = getFirebaseConfig();

  if (!firebaseConfig.isConfigured) {
    return {
      isReady: false,
      services: null,
      error: formatMissingFirebaseConfigMessage(firebaseConfig.missingKeys),
    };
  }

  firebaseApp =
    getApps().length > 0 ? getApp() : initializeApp(firebaseConfig.config);
  firebaseAuth = getAuth(firebaseApp);
  firestoreDb = getFirestore(firebaseApp);
  cachedServices = {
    firebaseApp,
    firebaseAuth,
    firestoreDb,
  };

  return {
    isReady: true,
    services: cachedServices,
    error: null,
  };
}
