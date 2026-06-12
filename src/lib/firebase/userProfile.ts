import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  type FieldValue,
} from "firebase/firestore";
import type { AuthUser } from "@/lib/auth/types";
import { getFirebaseClient } from "@/lib/firebase/client";

export type UserProfileTimestamp = string | FieldValue;

export interface UserProfilePayload {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  createdAt?: UserProfileTimestamp;
  updatedAt: UserProfileTimestamp;
}

export function buildUserProfilePayload({
  createdAt,
  updatedAt,
  user,
}: {
  createdAt?: UserProfileTimestamp;
  updatedAt: UserProfileTimestamp;
  user: AuthUser;
}): UserProfilePayload {
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
    ...(createdAt === undefined ? {} : { createdAt }),
    updatedAt,
  };
}

export async function upsertUserProfile(user: AuthUser): Promise<void> {
  const firebaseClient = getFirebaseClient();

  if (!firebaseClient.isReady) {
    throw new Error(firebaseClient.error);
  }

  const userRef = doc(firebaseClient.services.firestoreDb, "users", user.uid);
  const existingProfile = await getDoc(userRef);
  const createdAt = existingProfile.exists() ? undefined : serverTimestamp();

  await setDoc(
    userRef,
    buildUserProfilePayload({
      createdAt,
      updatedAt: serverTimestamp(),
      user,
    }),
    { merge: true },
  );
}
