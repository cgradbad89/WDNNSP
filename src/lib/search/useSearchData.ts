"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  ACTIVE_SEARCH_CHANGED_EVENT,
} from "@/lib/search/activeSearch";
import {
  createSearchRepository,
  getSearchRepositorySource,
  type ActiveSearchLoadResult,
  type SavedSearchesLoadResult,
  type SearchSource,
} from "@/lib/search/repository";
import { SAVED_SEARCHES_CHANGED_EVENT } from "@/lib/search/storage";
import type { SavedSearch } from "@/types/search";

export interface UseSearchDataResult {
  savedSearches: SavedSearch[];
  activeSearch: SavedSearch | null;
  savedSearchesHaveStoredValue: boolean;
  activeSearchHasStoredValue: boolean;
  source: SearchSource;
  isLoading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  saveSavedSearches: (searches: SavedSearch[]) => Promise<void>;
  deleteSavedSearch: (searchId: string) => Promise<void>;
  saveActiveSearch: (search: SavedSearch) => Promise<void>;
  clearActiveSearch: () => Promise<void>;
}

type SearchDataSnapshot = {
  savedSearches: SavedSearch[];
  activeSearch: SavedSearch | null;
  savedSearchesHaveStoredValue: boolean;
  activeSearchHasStoredValue: boolean;
  source: SearchSource;
};

type SearchDataState = SearchDataSnapshot & {
  error: string | null;
  isLoading: boolean;
  key: string;
};

function getSearchStateKey(uid: string | null | undefined): string {
  return uid ? `cloud:${uid}` : "local";
}

function getLoadErrorMessage(source: SearchSource): string {
  return source === "cloud"
    ? "Cloud search data could not be loaded. Results will use the safe fallback until reload succeeds."
    : "This browser's saved searches could not be loaded.";
}

function getSaveErrorMessage(source: SearchSource): string {
  return source === "cloud"
    ? "Cloud search data could not be saved."
    : "This browser's search data could not be saved.";
}

async function loadSearchData(
  uid: string | null | undefined,
): Promise<SearchDataSnapshot> {
  const repository = createSearchRepository(uid);
  const [savedSearchesResult, activeSearchResult]: [
    SavedSearchesLoadResult,
    ActiveSearchLoadResult,
  ] = await Promise.all([
    repository.loadSavedSearches(),
    repository.loadActiveSearch(),
  ]);

  return {
    savedSearches: savedSearchesResult.searches,
    activeSearch: activeSearchResult.search,
    savedSearchesHaveStoredValue: savedSearchesResult.hasStoredValue,
    activeSearchHasStoredValue: activeSearchResult.hasStoredValue,
    source: savedSearchesResult.source,
  };
}

export function useSearchData(): UseSearchDataResult {
  const { isLoading: isAuthLoading, user } = useAuth();
  const targetSource = getSearchRepositorySource(user?.uid);
  const targetKey = getSearchStateKey(user?.uid);
  const loadIdRef = useRef(0);
  const [state, setState] = useState<SearchDataState>({
    activeSearch: null,
    activeSearchHasStoredValue: false,
    error: null,
    isLoading: true,
    key: "auth-loading",
    savedSearches: [],
    savedSearchesHaveStoredValue: false,
    source: "local",
  });

  const reload = useCallback(async () => {
    const loadId = loadIdRef.current + 1;
    loadIdRef.current = loadId;

    if (isAuthLoading) {
      setState({
        activeSearch: null,
        activeSearchHasStoredValue: false,
        error: null,
        isLoading: true,
        key: "auth-loading",
        savedSearches: [],
        savedSearchesHaveStoredValue: false,
        source: targetSource,
      });
      return;
    }

    setState((currentState) => ({
      ...currentState,
      activeSearch:
        currentState.key === targetKey ? currentState.activeSearch : null,
      activeSearchHasStoredValue:
        currentState.key === targetKey
          ? currentState.activeSearchHasStoredValue
          : false,
      error: null,
      isLoading: true,
      key: targetKey,
      savedSearches:
        currentState.key === targetKey ? currentState.savedSearches : [],
      savedSearchesHaveStoredValue:
        currentState.key === targetKey
          ? currentState.savedSearchesHaveStoredValue
          : false,
      source: targetSource,
    }));

    try {
      const snapshot = await loadSearchData(user?.uid);

      if (loadIdRef.current !== loadId) {
        return;
      }

      setState({
        ...snapshot,
        error: null,
        isLoading: false,
        key: targetKey,
      });
    } catch {
      if (loadIdRef.current !== loadId) {
        return;
      }

      setState({
        activeSearch: null,
        activeSearchHasStoredValue: false,
        error: getLoadErrorMessage(targetSource),
        isLoading: false,
        key: targetKey,
        savedSearches: [],
        savedSearchesHaveStoredValue: false,
        source: targetSource,
      });
    }
  }, [isAuthLoading, targetKey, targetSource, user?.uid]);

  const refreshAfterMutation = useCallback(async () => {
    const snapshot = await loadSearchData(user?.uid);

    setState({
      ...snapshot,
      error: null,
      isLoading: false,
      key: targetKey,
    });
  }, [targetKey, user?.uid]);

  const saveSavedSearches = useCallback(
    async (searches: SavedSearch[]) => {
      if (isAuthLoading) {
        throw new Error("Search data is still loading.");
      }

      try {
        const repository = createSearchRepository(user?.uid);
        await repository.saveSavedSearches(searches);
        await refreshAfterMutation();
      } catch (error) {
        setState((currentState) => ({
          ...currentState,
          error:
            error instanceof Error && error.message.trim() !== ""
              ? error.message
              : getSaveErrorMessage(targetSource),
          isLoading: false,
          key: targetKey,
          source: targetSource,
        }));
        throw error;
      }
    },
    [isAuthLoading, refreshAfterMutation, targetKey, targetSource, user?.uid],
  );

  const deleteSavedSearch = useCallback(
    async (searchId: string) => {
      if (isAuthLoading) {
        throw new Error("Search data is still loading.");
      }

      try {
        const repository = createSearchRepository(user?.uid);
        await repository.deleteSavedSearch(searchId);
        await refreshAfterMutation();
      } catch (error) {
        setState((currentState) => ({
          ...currentState,
          error:
            error instanceof Error && error.message.trim() !== ""
              ? error.message
              : getSaveErrorMessage(targetSource),
          isLoading: false,
          key: targetKey,
          source: targetSource,
        }));
        throw error;
      }
    },
    [isAuthLoading, refreshAfterMutation, targetKey, targetSource, user?.uid],
  );

  const saveActiveSearch = useCallback(
    async (search: SavedSearch) => {
      if (isAuthLoading) {
        throw new Error("Search data is still loading.");
      }

      try {
        const repository = createSearchRepository(user?.uid);
        await repository.saveActiveSearch(search);
        await refreshAfterMutation();
      } catch (error) {
        setState((currentState) => ({
          ...currentState,
          error:
            error instanceof Error && error.message.trim() !== ""
              ? error.message
              : getSaveErrorMessage(targetSource),
          isLoading: false,
          key: targetKey,
          source: targetSource,
        }));
        throw error;
      }
    },
    [isAuthLoading, refreshAfterMutation, targetKey, targetSource, user?.uid],
  );

  const clearActiveSearch = useCallback(async () => {
    if (isAuthLoading) {
      throw new Error("Search data is still loading.");
    }

    try {
      const repository = createSearchRepository(user?.uid);
      await repository.clearActiveSearch();
      await refreshAfterMutation();
    } catch (error) {
      setState((currentState) => ({
        ...currentState,
        error:
          error instanceof Error && error.message.trim() !== ""
            ? error.message
            : getSaveErrorMessage(targetSource),
        isLoading: false,
        key: targetKey,
        source: targetSource,
      }));
      throw error;
    }
  }, [isAuthLoading, refreshAfterMutation, targetKey, targetSource, user?.uid]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (isAuthLoading || user) {
      return;
    }

    function handleLocalSearchChange(): void {
      void reload();
    }

    window.addEventListener("focus", handleLocalSearchChange);
    window.addEventListener("storage", handleLocalSearchChange);
    window.addEventListener(
      SAVED_SEARCHES_CHANGED_EVENT,
      handleLocalSearchChange,
    );
    window.addEventListener(
      ACTIVE_SEARCH_CHANGED_EVENT,
      handleLocalSearchChange,
    );

    return () => {
      window.removeEventListener("focus", handleLocalSearchChange);
      window.removeEventListener("storage", handleLocalSearchChange);
      window.removeEventListener(
        SAVED_SEARCHES_CHANGED_EVENT,
        handleLocalSearchChange,
      );
      window.removeEventListener(
        ACTIVE_SEARCH_CHANGED_EVENT,
        handleLocalSearchChange,
      );
    };
  }, [isAuthLoading, reload, user]);

  const isStateCurrent = state.key === targetKey;

  return {
    activeSearch: isStateCurrent ? state.activeSearch : null,
    activeSearchHasStoredValue: isStateCurrent
      ? state.activeSearchHasStoredValue
      : false,
    clearActiveSearch,
    deleteSavedSearch,
    error: isStateCurrent ? state.error : null,
    isLoading: isAuthLoading || !isStateCurrent || state.isLoading,
    reload,
    saveActiveSearch,
    saveSavedSearches,
    savedSearches: isStateCurrent ? state.savedSearches : [],
    savedSearchesHaveStoredValue: isStateCurrent
      ? state.savedSearchesHaveStoredValue
      : false,
    source: isStateCurrent ? state.source : targetSource,
  };
}
