export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  createAccountWithEmail: (email: string, password: string) => Promise<void>;
  signOutUser: () => Promise<void>;
}

export type FirebaseUserLike = {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
};

export function mapFirebaseUser(user: FirebaseUserLike): AuthUser {
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
  };
}
