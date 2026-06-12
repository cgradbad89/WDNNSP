import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  writeBatch,
  type FieldValue,
} from "firebase/firestore";
import { getFirebaseClient } from "@/lib/firebase/client";
import { isSavedSearch, isSavedSearchArray } from "@/lib/search/validators";
import type { SavedSearch } from "@/types/search";

export interface CloudSavedSearchesLoadResult {
  searches: SavedSearch[];
  hasStoredValue: boolean;
  source: "cloud";
}

export interface CloudActiveSearchLoadResult {
  search: SavedSearch | null;
  hasStoredValue: boolean;
  source: "cloud";
}

export interface SearchMetaPayload {
  initialized: boolean;
  updatedAt: FieldValue;
}

export interface CloudSearchDocument {
  id: string;
  data: unknown;
}

export type FirestoreSavedSearchPayload = {
  id: string;
  userId: string;
  name: string;
  originCodes: string[];
  destinationCodes: string[];
  departDate: string;
  tripType: SavedSearch["tripType"];
  passengers: number;
  cabin: SavedSearch["cabin"];
  createdAt: string;
  updatedAt: string;
  returnDate?: string;
  flexibleDays?: number;
  maxStops?: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getCloudSearchErrorMessage(error: unknown, fallback: string): string {
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

export function normalizeCloudSavedSearch(
  uid: string,
  search: SavedSearch,
): SavedSearch {
  return {
    ...search,
    userId: uid,
  };
}

export function toFirestoreSavedSearch(
  search: SavedSearch,
): FirestoreSavedSearchPayload {
  return {
    id: search.id,
    userId: search.userId,
    name: search.name,
    originCodes: search.originCodes,
    destinationCodes: search.destinationCodes,
    departDate: search.departDate,
    tripType: search.tripType,
    passengers: search.passengers,
    cabin: search.cabin,
    createdAt: search.createdAt,
    updatedAt: search.updatedAt,
    ...(search.returnDate === undefined ? {} : { returnDate: search.returnDate }),
    ...(search.flexibleDays === undefined
      ? {}
      : { flexibleDays: search.flexibleDays }),
    ...(search.maxStops === undefined ? {} : { maxStops: search.maxStops }),
  };
}

export function fromFirestoreSavedSearch(
  uid: string,
  documentId: string,
  data: unknown,
): SavedSearch | null {
  if (!isRecord(data)) {
    return null;
  }

  const candidate = {
    ...data,
    id: documentId,
    userId: uid,
  };

  if (!isSavedSearch(candidate)) {
    return null;
  }

  return normalizeCloudSavedSearch(uid, candidate);
}

export function fromFirestoreActiveSearch(
  uid: string,
  data: unknown,
): SavedSearch | null {
  if (!isRecord(data)) {
    return null;
  }

  const candidate = {
    ...data,
    userId: uid,
  };

  if (!isSavedSearch(candidate)) {
    return null;
  }

  return normalizeCloudSavedSearch(uid, candidate);
}

export function parseCloudSavedSearchDocuments(
  uid: string,
  documents: CloudSearchDocument[],
): SavedSearch[] {
  return documents.flatMap((searchDocument) => {
    const search = fromFirestoreSavedSearch(
      uid,
      searchDocument.id,
      searchDocument.data,
    );

    return search ? [search] : [];
  });
}

export function isCloudSearchMetaInitialized(value: unknown): boolean {
  return isRecord(value) && value.initialized === true;
}

export function buildCloudSavedSearchesLoadResult({
  hasSearchDocuments,
  isInitialized,
  searches,
}: {
  hasSearchDocuments: boolean;
  isInitialized: boolean;
  searches: SavedSearch[];
}): CloudSavedSearchesLoadResult {
  return {
    searches,
    hasStoredValue: isInitialized || hasSearchDocuments,
    source: "cloud",
  };
}

export function buildCloudActiveSearchLoadResult({
  hasActiveDocument,
  search,
}: {
  hasActiveDocument: boolean;
  search: SavedSearch | null;
}): CloudActiveSearchLoadResult {
  return {
    search,
    hasStoredValue: hasActiveDocument,
    source: "cloud",
  };
}

export async function loadCloudSavedSearches(
  uid: string,
): Promise<CloudSavedSearchesLoadResult> {
  try {
    const firestoreDb = getFirestoreDb();
    const savedSearchesRef = collection(
      firestoreDb,
      "users",
      uid,
      "savedSearches",
    );
    const searchMetaRef = doc(
      firestoreDb,
      "users",
      uid,
      "searchMeta",
      "current",
    );
    const [savedSearchesSnapshot, searchMetaSnapshot] = await Promise.all([
      getDocs(savedSearchesRef),
      getDoc(searchMetaRef),
    ]);
    const searchDocuments = savedSearchesSnapshot.docs.map((searchDocument) => ({
      id: searchDocument.id,
      data: searchDocument.data(),
    }));
    const searches = parseCloudSavedSearchDocuments(uid, searchDocuments);
    const isInitialized =
      searchMetaSnapshot.exists() &&
      isCloudSearchMetaInitialized(searchMetaSnapshot.data());

    return buildCloudSavedSearchesLoadResult({
      searches,
      hasSearchDocuments: !savedSearchesSnapshot.empty,
      isInitialized,
    });
  } catch (error) {
    throw new Error(
      getCloudSearchErrorMessage(
        error,
        "Cloud saved searches could not be loaded.",
      ),
    );
  }
}

export async function saveCloudSavedSearches(
  uid: string,
  searches: SavedSearch[],
): Promise<void> {
  const normalizedSearches = searches.map((search) =>
    normalizeCloudSavedSearch(uid, search),
  );

  if (!isSavedSearchArray(normalizedSearches)) {
    throw new Error("Saved search data is invalid and was not saved.");
  }

  try {
    const firestoreDb = getFirestoreDb();
    const savedSearchesRef = collection(
      firestoreDb,
      "users",
      uid,
      "savedSearches",
    );
    const searchMetaRef = doc(
      firestoreDb,
      "users",
      uid,
      "searchMeta",
      "current",
    );
    const existingSearchesSnapshot = await getDocs(savedSearchesRef);
    const nextSearchIds = new Set(
      normalizedSearches.map((search) => search.id),
    );
    const batch = writeBatch(firestoreDb);

    existingSearchesSnapshot.docs.forEach((searchDocument) => {
      if (!nextSearchIds.has(searchDocument.id)) {
        batch.delete(searchDocument.ref);
      }
    });

    normalizedSearches.forEach((search) => {
      batch.set(
        doc(savedSearchesRef, search.id),
        toFirestoreSavedSearch(search),
      );
    });

    batch.set(
      searchMetaRef,
      {
        initialized: true,
        updatedAt: serverTimestamp(),
      } satisfies SearchMetaPayload,
      { merge: true },
    );

    await batch.commit();
  } catch (error) {
    throw new Error(
      getCloudSearchErrorMessage(
        error,
        "Cloud saved searches could not be saved.",
      ),
    );
  }
}

export async function deleteCloudSavedSearch(
  uid: string,
  searchId: string,
): Promise<void> {
  try {
    const firestoreDb = getFirestoreDb();
    const savedSearchRef = doc(
      firestoreDb,
      "users",
      uid,
      "savedSearches",
      searchId,
    );
    const searchMetaRef = doc(
      firestoreDb,
      "users",
      uid,
      "searchMeta",
      "current",
    );
    const batch = writeBatch(firestoreDb);

    batch.delete(savedSearchRef);
    batch.set(
      searchMetaRef,
      {
        initialized: true,
        updatedAt: serverTimestamp(),
      } satisfies SearchMetaPayload,
      { merge: true },
    );

    await batch.commit();
  } catch (error) {
    throw new Error(
      getCloudSearchErrorMessage(
        error,
        "Cloud saved search could not be deleted.",
      ),
    );
  }
}

export async function loadCloudActiveSearch(
  uid: string,
): Promise<CloudActiveSearchLoadResult> {
  try {
    const firestoreDb = getFirestoreDb();
    const activeSearchRef = doc(
      firestoreDb,
      "users",
      uid,
      "activeSearch",
      "current",
    );
    const activeSearchSnapshot = await getDoc(activeSearchRef);
    const search = activeSearchSnapshot.exists()
      ? fromFirestoreActiveSearch(uid, activeSearchSnapshot.data())
      : null;

    return buildCloudActiveSearchLoadResult({
      search,
      hasActiveDocument: activeSearchSnapshot.exists(),
    });
  } catch (error) {
    throw new Error(
      getCloudSearchErrorMessage(
        error,
        "Cloud active search could not be loaded.",
      ),
    );
  }
}

export async function saveCloudActiveSearch(
  uid: string,
  search: SavedSearch,
): Promise<void> {
  const normalizedSearch = normalizeCloudSavedSearch(uid, search);

  if (!isSavedSearch(normalizedSearch)) {
    throw new Error("Active search data is invalid and was not saved.");
  }

  try {
    const firestoreDb = getFirestoreDb();
    const activeSearchRef = doc(
      firestoreDb,
      "users",
      uid,
      "activeSearch",
      "current",
    );

    await setDoc(activeSearchRef, toFirestoreSavedSearch(normalizedSearch));
  } catch (error) {
    throw new Error(
      getCloudSearchErrorMessage(
        error,
        "Cloud active search could not be saved.",
      ),
    );
  }
}

export async function clearCloudActiveSearch(uid: string): Promise<void> {
  try {
    const firestoreDb = getFirestoreDb();
    const activeSearchRef = doc(
      firestoreDb,
      "users",
      uid,
      "activeSearch",
      "current",
    );

    await deleteDoc(activeSearchRef);
  } catch (error) {
    throw new Error(
      getCloudSearchErrorMessage(
        error,
        "Cloud active search could not be cleared.",
      ),
    );
  }
}
