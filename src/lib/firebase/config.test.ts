import { afterEach, describe, expect, it } from "vitest";
import {
  formatMissingFirebaseConfigMessage,
  getFirebaseConfig,
} from "@/lib/firebase/config";

const firebaseEnv = {
  NEXT_PUBLIC_FIREBASE_API_KEY: "test-api-key",
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "test-auth-domain",
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: "test-project-id",
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: "test-storage-bucket",
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: "test-sender-id",
  NEXT_PUBLIC_FIREBASE_APP_ID: "test-app-id",
};

function clearFirebaseEnv(): void {
  Object.keys(firebaseEnv).forEach((key) => {
    delete process.env[key];
  });
}

describe("firebase config", () => {
  afterEach(() => {
    clearFirebaseEnv();
  });

  it("reports missing public Firebase environment variables", () => {
    clearFirebaseEnv();

    expect(getFirebaseConfig()).toEqual({
      isConfigured: false,
      config: null,
      missingKeys: Object.keys(firebaseEnv),
    });
  });

  it("builds Firebase config when all public values are present", () => {
    process.env = {
      ...process.env,
      ...firebaseEnv,
    };

    expect(getFirebaseConfig()).toEqual({
      isConfigured: true,
      config: {
        apiKey: firebaseEnv.NEXT_PUBLIC_FIREBASE_API_KEY,
        authDomain: firebaseEnv.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: firebaseEnv.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        storageBucket: firebaseEnv.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        messagingSenderId:
          firebaseEnv.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        appId: firebaseEnv.NEXT_PUBLIC_FIREBASE_APP_ID,
      },
      missingKeys: [],
    });
  });

  it("formats a developer-friendly missing-config message without values", () => {
    expect(
      formatMissingFirebaseConfigMessage([
        "NEXT_PUBLIC_FIREBASE_API_KEY",
        "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
      ]),
    ).toBe(
      "Firebase is not configured. Missing 2 public Firebase environment variables.",
    );
  });
});
