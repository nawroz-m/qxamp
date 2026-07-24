"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  normalizeSearchIndex,
  scoreSearchResults,
  type ScoredSearchResult,
  type SearchIndexEntry,
} from "@/lib/search-index";

const DEBOUNCE_MS = 300;
const DROPDOWN_LIMIT = 6;

let searchIndexCache: SearchIndexEntry[] | null = null;

async function fetchSearchIndex(): Promise<SearchIndexEntry[]> {
  if (searchIndexCache) return searchIndexCache;

  const response = await fetch("/api/search", { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to load search index (${response.status})`);
  }

  const json = (await response.json()) as { entries?: unknown };
  const entries = Array.isArray(json.entries)
    ? (json.entries as SearchIndexEntry[])
    : normalizeSearchIndex(json);

  searchIndexCache = entries;
  return entries;
}

export function invalidateSearchIndexCache() {
  searchIndexCache = null;
}

export function useSearch() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const urlQuery = searchParams.get("q") ?? "";
  const urlTag = searchParams.get("tag") ?? "";

  const [inputValue, setInputValue] = useState(urlQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(urlQuery);
  const [tagFilter, setTagFilterState] = useState(urlTag);
  const [entries, setEntries] = useState<SearchIndexEntry[]>(
    searchIndexCache ?? [],
  );
  const [isLoading, setIsLoading] = useState(!searchIndexCache);
  const [error, setError] = useState<string | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setInputValue(urlQuery);
    setDebouncedQuery(urlQuery);
    setTagFilterState(urlTag);
  }, [urlQuery, urlTag]);

  useEffect(() => {
    let active = true;

    fetchSearchIndex()
      .then((next) => {
        if (active) {
          setEntries(next);
          setError(null);
        }
      })
      .catch((err) => {
        if (active) {
          setError(
            err instanceof Error ? err.message : "Failed to load search",
          );
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(inputValue);
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [inputValue]);

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    const nextQ = debouncedQuery.trim();
    const nextTag = tagFilter.trim();

    if (nextQ) params.set("q", nextQ);
    else params.delete("q");

    if (nextTag) params.set("tag", nextTag);
    else params.delete("tag");

    const next = params.toString();
    const current = searchParams.toString();
    if (next === current) return;

    const href = next ? `${pathname}?${next}` : pathname;
    // router.replace(href, { scroll: false, shallow: true });
  }, [debouncedQuery, tagFilter, pathname, searchParams]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setIsMobileSearchOpen(true);
        setIsPanelOpen(true);
        requestAnimationFrame(() => inputRef.current?.focus());
      }

      if (event.key === "Escape") {
        setIsPanelOpen(false);
        setIsMobileSearchOpen(false);
        inputRef.current?.blur();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const hasActiveSearch = Boolean(debouncedQuery.trim() || tagFilter.trim());
  const allResults: ScoredSearchResult[] = hasActiveSearch
    ? scoreSearchResults(entries, debouncedQuery, tagFilter)
    : [];
  const dropdownResults = allResults.slice(0, DROPDOWN_LIMIT);
  const isTruncated = allResults.length > DROPDOWN_LIMIT;

  function setQuery(value: string) {
    setInputValue(value);
    setIsPanelOpen(true);
  }

  function setTagFilter(value: string) {
    setTagFilterState(value.trim().toLowerCase().replace(/^#/, ""));
    setIsPanelOpen(true);
  }

  function clearSearch() {
    setInputValue("");
    setDebouncedQuery("");
    setTagFilterState("");
    setIsPanelOpen(false);
  }

  function focusSearch() {
    setIsMobileSearchOpen(true);
    setIsPanelOpen(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  return {
    inputRef,
    inputValue,
    setQuery,
    query: debouncedQuery,
    tagFilter,
    setTagFilter,
    clearSearch,
    focusSearch,
    results: allResults,
    dropdownResults,
    isTruncated,
    totalCount: allResults.length,
    isLoading,
    error,
    isPanelOpen,
    setIsPanelOpen,
    isMobileSearchOpen,
    setIsMobileSearchOpen,
    hasActiveSearch,
    dropdownLimit: DROPDOWN_LIMIT,
  };
}
