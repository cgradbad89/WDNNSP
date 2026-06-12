"use client";

import type { JSX, ReactNode } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type Auth,
} from "firebase/auth";
import {
  mapFirebaseUser,
  type AuthContextValue,
  type AuthUser,
} from "@/lib/auth/types";
import { getFirebaseClient } from "@/lib/firebase/client";
import { upsertUserProfile } from "@/lib/firebase/userProfile";

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function getAuthErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim() !== "") {
    return error.message;
  }

  return "Authentication could not be completed.";
}

function resolveFirebaseAuth():
  | {
      firebaseAuth: Auth;
      error: null;
    }
  | {
      firebaseAuth: null;
      error: string;
    } {
  const firebaseClient = getFirebaseClient();

  if (!firebaseClient.isReady) {
    return {
      firebaseAuth: null,
      error: firebaseClient.error,
    };
  }

  return {
    firebaseAuth: firebaseClient.services.firebaseAuth,
    error: null,
  };
}

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}): JSX.Element {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const syncedProfileUidRef = useRef<string | null>(null);

  const syncUserProfile = useCallback(async (nextUser: AuthUser) => {
    if (syncedProfileUidRef.current === nextUser.uid) {
      return;
    }

    try {
      await upsertUserProfile(nextUser);
      syncedProfileUidRef.current = nextUser.uid;
    } catch {
      setError("Signed in, but the Firestore user profile could not be updated.");
    }
  }, []);

  const getReadyFirebaseAuth = useCallback(() => {
    const firebaseAuthResult = resolveFirebaseAuth();

    if (!firebaseAuthResult.firebaseAuth) {
      setError(firebaseAuthResult.error);
      setIsLoading(false);
      return null;
    }

    return firebaseAuthResult.firebaseAuth;
  }, []);

  useEffect(() => {
    const firebaseAuthResult = resolveFirebaseAuth();

    if (!firebaseAuthResult.firebaseAuth) {
      const timeoutId = window.setTimeout(() => {
        setError(firebaseAuthResult.error);
        setIsLoading(false);
      }, 0);

      return () => {
        window.clearTimeout(timeoutId);
      };
    }

    return onAuthStateChanged(
      firebaseAuthResult.firebaseAuth,
      (firebaseUser) => {
        const nextUser = firebaseUser ? mapFirebaseUser(firebaseUser) : null;

        if (!nextUser) {
          syncedProfileUidRef.current = null;
        }

        setUser(nextUser);
        setIsLoading(false);
        setError(null);

        if (nextUser) {
          void syncUserProfile(nextUser);
        }
      },
      (authError) => {
        setUser(null);
        setIsLoading(false);
        setError(getAuthErrorMessage(authError));
      },
    );
  }, [syncUserProfile]);

  const signInWithGoogle = useCallback(async () => {
    const firebaseAuth = getReadyFirebaseAuth();

    if (!firebaseAuth) {
      return;
    }

    setError(null);

    try {
      const credential = await signInWithPopup(
        firebaseAuth,
        new GoogleAuthProvider(),
      );
      await syncUserProfile(mapFirebaseUser(credential.user));
    } catch (authError) {
      setError(getAuthErrorMessage(authError));
    }
  }, [getReadyFirebaseAuth, syncUserProfile]);

  const signInWithEmail = useCallback(
    async (email: string, password: string) => {
      const firebaseAuth = getReadyFirebaseAuth();

      if (!firebaseAuth) {
        return;
      }

      setError(null);

      try {
        const credential = await signInWithEmailAndPassword(
          firebaseAuth,
          email,
          password,
        );
        await syncUserProfile(mapFirebaseUser(credential.user));
      } catch (authError) {
        setError(getAuthErrorMessage(authError));
      }
    },
    [getReadyFirebaseAuth, syncUserProfile],
  );

  const createAccountWithEmail = useCallback(
    async (email: string, password: string) => {
      const firebaseAuth = getReadyFirebaseAuth();

      if (!firebaseAuth) {
        return;
      }

      setError(null);

      try {
        const credential = await createUserWithEmailAndPassword(
          firebaseAuth,
          email,
          password,
        );
        await syncUserProfile(mapFirebaseUser(credential.user));
      } catch (authError) {
        setError(getAuthErrorMessage(authError));
      }
    },
    [getReadyFirebaseAuth, syncUserProfile],
  );

  const signOutUser = useCallback(async () => {
    const firebaseAuth = getReadyFirebaseAuth();

    if (!firebaseAuth) {
      return;
    }

    setError(null);

    try {
      await signOut(firebaseAuth);
      syncedProfileUidRef.current = null;
    } catch (authError) {
      setError(getAuthErrorMessage(authError));
    }
  }, [getReadyFirebaseAuth]);

  const contextValue = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      error,
      signInWithGoogle,
      signInWithEmail,
      createAccountWithEmail,
      signOutUser,
    }),
    [
      createAccountWithEmail,
      error,
      isLoading,
      signInWithEmail,
      signInWithGoogle,
      signOutUser,
      user,
    ],
  );

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }

  return context;
}
