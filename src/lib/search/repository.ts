import {
  clearCloudActiveSearch,
  deleteCloudSavedSearch,
  loadCloudActiveSearch,
  loadCloudSavedSearches,
  saveCloudActiveSearch,
  saveCloudSavedSearches,
} from "@/lib/firebase/searches";
import {
  clearActiveSearch as clearLocalActiveSearch,
  hasStoredActiveSearch,
  loadActiveSearch,
  saveActiveSearch,
} from "@/lib/search/activeSearch";
import {
  deleteSavedSearch as deleteLocalSavedSearch,
  hasStoredSavedSearches,
  loadSavedSearches,
  saveSavedSearches,
} from "@/lib/search/storage";
import type { SavedSearch } from "@/types/search";

export type SearchSource = "local" | "cloud";

export interface SavedSearchesLoadResult {
  searches: SavedSearch[];
  hasStoredValue: boolean;
  source: SearchSource;
}

export interface ActiveSearchLoadResult {
  search: SavedSearch | null;
  hasStoredValue: boolean;
  source: SearchSource;
}

export interface SearchRepository {
  loadSavedSearches(): Promise<SavedSearchesLoadResult>;
  saveSavedSearches(searches: SavedSearch[]): Promise<void>;
  deleteSavedSearch(searchId: string): Promise<void>;
  loadActiveSearch(): Promise<ActiveSearchLoadResult>;
  saveActiveSearch(search: SavedSearch): Promise<void>;
  clearActiveSearch(): Promise<void>;
}

export function getSearchRepositorySource(
  uid: string | null | undefined,
): SearchSource {
  return uid ? "cloud" : "local";
}

export function createLocalSearchRepository(): SearchRepository {
  return {
    async loadSavedSearches() {
      return {
        searches: loadSavedSearches(),
        hasStoredValue: hasStoredSavedSearches(),
        source: "local",
      };
    },
    async saveSavedSearches(searches) {
      saveSavedSearches(searches);
    },
    async deleteSavedSearch(searchId) {
      saveSavedSearches(
        deleteLocalSavedSearch(loadSavedSearches(), searchId),
      );
    },
    async loadActiveSearch() {
      return {
        search: loadActiveSearch() ?? null,
        hasStoredValue: hasStoredActiveSearch(),
        source: "local",
      };
    },
    async saveActiveSearch(search) {
      saveActiveSearch(search);
    },
    async clearActiveSearch() {
      clearLocalActiveSearch();
    },
  };
}

export function createCloudSearchRepository(uid: string): SearchRepository {
  return {
    async loadSavedSearches() {
      return loadCloudSavedSearches(uid);
    },
    async saveSavedSearches(searches) {
      await saveCloudSavedSearches(uid, searches);
    },
    async deleteSavedSearch(searchId) {
      await deleteCloudSavedSearch(uid, searchId);
    },
    async loadActiveSearch() {
      return loadCloudActiveSearch(uid);
    },
    async saveActiveSearch(search) {
      await saveCloudActiveSearch(uid, search);
    },
    async clearActiveSearch() {
      await clearCloudActiveSearch(uid);
    },
  };
}

export function createSearchRepository(
  uid: string | null | undefined,
): SearchRepository {
  return uid ? createCloudSearchRepository(uid) : createLocalSearchRepository();
}
