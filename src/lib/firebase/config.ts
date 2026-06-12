import type { FirebaseOptions } from "firebase/app";

const FIREBASE_ENV_KEYS = [
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
  "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
] as const;

type FirebaseEnvKey = (typeof FIREBASE_ENV_KEYS)[number];

type FirebaseConfigResult =
  | {
      isConfigured: true;
      config: FirebaseOptions;
      missingKeys: [];
    }
  | {
      isConfigured: false;
      config: null;
      missingKeys: FirebaseEnvKey[];
    };

function readPublicFirebaseEnv(): Record<FirebaseEnvKey, string | undefined> {
  return {
    NEXT_PUBLIC_FIREBASE_API_KEY:
      process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN:
      process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID:
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET:
      process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID:
      process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    NEXT_PUBLIC_FIREBASE_APP_ID:
      process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };
}

export function getFirebaseConfig(): FirebaseConfigResult {
  const env = readPublicFirebaseEnv();
  const missingKeys = FIREBASE_ENV_KEYS.filter(
    (key) => !env[key] || env[key]?.trim() === "",
  );

  if (missingKeys.length > 0) {
    return {
      isConfigured: false,
      config: null,
      missingKeys,
    };
  }

  return {
    isConfigured: true,
    config: {
      apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: env.NEXT_PUBLIC_FIREBASE_APP_ID,
    },
    missingKeys: [],
  };
}

export function formatMissingFirebaseConfigMessage(
  missingKeys: readonly FirebaseEnvKey[],
): string {
  if (missingKeys.length === 0) {
    return "";
  }

  return `Firebase is not configured. Missing ${missingKeys.length} public Firebase environment variable${missingKeys.length === 1 ? "" : "s"}.`;
}
