import {
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  writeBatch,
  type FieldValue,
} from "firebase/firestore";
import { getFirebaseClient } from "@/lib/firebase/client";
import type { WalletLoadResult } from "@/lib/wallet/repository";
import {
  isPointsAccount,
  isPointsAccountArray,
} from "@/lib/wallet/validators";
import type { PointsAccount } from "@/types/points";

export interface WalletMetaPayload {
  initialized: boolean;
  updatedAt: FieldValue;
}

export interface CloudWalletDocument {
  id: string;
  data: unknown;
}

export type FirestoreWalletAccountPayload = {
  id: string;
  userId: string;
  programId: string;
  programName: string;
  programType: PointsAccount["programType"];
  balance: number;
  lastUpdatedAt: string;
  notes?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getCloudWalletErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim() !== "") {
    return error.message;
  }

  return fallback;
}

function getFirestoreDb() {
  const firebaseClient = getFirebaseClient();

  if (!firebaseClient.isReady) {
    throw new Error(firebaseClient.error);
  }

  return firebaseClient.services.firestoreDb;
}

export function normalizeCloudWalletAccount(
  uid: string,
  account: PointsAccount,
): PointsAccount {
  return {
    ...account,
    userId: uid,
  };
}

export function toFirestoreWalletAccount(
  account: PointsAccount,
): FirestoreWalletAccountPayload {
  return {
    id: account.id,
    userId: account.userId,
    programId: account.programId,
    programName: account.programName,
    programType: account.programType,
    balance: account.balance,
    lastUpdatedAt: account.lastUpdatedAt,
    ...(account.notes === undefined ? {} : { notes: account.notes }),
  };
}

export function parseCloudWalletAccountDocuments(
  uid: string,
  documents: CloudWalletDocument[],
): PointsAccount[] {
  return documents.flatMap((walletDocument) => {
    if (!isRecord(walletDocument.data)) {
      return [];
    }

    const candidate = {
      ...walletDocument.data,
      id: walletDocument.id,
      userId: uid,
    };

    if (!isPointsAccount(candidate)) {
      return [];
    }

    return [normalizeCloudWalletAccount(uid, candidate)];
  });
}

export function isCloudWalletMetaInitialized(value: unknown): boolean {
  return isRecord(value) && value.initialized === true;
}

export function buildCloudWalletLoadResult({
  accounts,
  hasAccountDocuments,
  isInitialized,
}: {
  accounts: PointsAccount[];
  hasAccountDocuments: boolean;
  isInitialized: boolean;
}): WalletLoadResult {
  return {
    accounts,
    hasStoredValue: isInitialized || hasAccountDocuments,
    source: "cloud",
  };
}

export async function loadCloudWalletAccounts(
  uid: string,
): Promise<WalletLoadResult> {
  try {
    const firestoreDb = getFirestoreDb();
    const walletAccountsRef = collection(
      firestoreDb,
      "users",
      uid,
      "walletAccounts",
    );
    const walletMetaRef = doc(
      firestoreDb,
      "users",
      uid,
      "walletMeta",
      "current",
    );
    const [walletAccountsSnapshot, walletMetaSnapshot] = await Promise.all([
      getDocs(walletAccountsRef),
      getDoc(walletMetaRef),
    ]);
    const accountDocuments = walletAccountsSnapshot.docs.map((walletDocument) => ({
      id: walletDocument.id,
      data: walletDocument.data(),
    }));
    const accounts = parseCloudWalletAccountDocuments(uid, accountDocuments);
    const isInitialized =
      walletMetaSnapshot.exists() &&
      isCloudWalletMetaInitialized(walletMetaSnapshot.data());

    return buildCloudWalletLoadResult({
      accounts,
      hasAccountDocuments: !walletAccountsSnapshot.empty,
      isInitialized,
    });
  } catch (error) {
    throw new Error(
      getCloudWalletErrorMessage(
        error,
        "Cloud wallet data could not be loaded.",
      ),
    );
  }
}

export async function saveCloudWalletAccounts(
  uid: string,
  accounts: PointsAccount[],
): Promise<void> {
  const normalizedAccounts = accounts.map((account) =>
    normalizeCloudWalletAccount(uid, account),
  );

  if (!isPointsAccountArray(normalizedAccounts)) {
    throw new Error("Wallet account data is invalid and was not saved.");
  }

  try {
    const firestoreDb = getFirestoreDb();
    const walletAccountsRef = collection(
      firestoreDb,
      "users",
      uid,
      "walletAccounts",
    );
    const walletMetaRef = doc(
      firestoreDb,
      "users",
      uid,
      "walletMeta",
      "current",
    );
    const existingAccountsSnapshot = await getDocs(walletAccountsRef);
    const nextAccountIds = new Set(
      normalizedAccounts.map((account) => account.id),
    );
    const batch = writeBatch(firestoreDb);

    existingAccountsSnapshot.docs.forEach((walletDocument) => {
      if (!nextAccountIds.has(walletDocument.id)) {
        batch.delete(walletDocument.ref);
      }
    });

    normalizedAccounts.forEach((account) => {
      batch.set(
        doc(walletAccountsRef, account.id),
        toFirestoreWalletAccount(account),
      );
    });

    batch.set(
      walletMetaRef,
      {
        initialized: true,
        updatedAt: serverTimestamp(),
      } satisfies WalletMetaPayload,
      { merge: true },
    );

    await batch.commit();
  } catch (error) {
    throw new Error(
      getCloudWalletErrorMessage(
        error,
        "Cloud wallet data could not be saved.",
      ),
    );
  }
}
