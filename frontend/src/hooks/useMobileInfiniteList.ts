"use client";

import { useEffect, useRef, useMemo } from "react";
import {
  useInfiniteQuery,
  type QueryFunctionContext,
  type QueryKey,
} from "@tanstack/react-query";
import { useMediaQuery } from "@/hooks/useMediaQuery";

export type ClientPagesConfig<T> = {
  items: T[];
  isLoading: boolean;
};

export type UseMobileInfiniteListOptions<T, P> = {
  queryKey: QueryKey;
  enabled?: boolean;
  pageSize: number;
  queryFn: (ctx: QueryFunctionContext<QueryKey, number>) => Promise<P>;
  getItemsFromPage?: (page: P) => T[];
  getTotalFromPage?: (page: P) => number;
  getNextPageParam?: (
    lastPage: P,
    allPages: P[],
    helpers: {
      pageSize: number;
      getItemsFromPage: (page: P) => T[];
    },
  ) => number | undefined;
  clientPages?: ClientPagesConfig<T>;
  resetDeps?: unknown[];
};

function defaultGetItemsFromPage<T, P>(page: P): T[] {
  const record = page as { items?: T[]; animais?: T[]; alertas?: T[] };
  if (Array.isArray(record.items)) return record.items;
  if (Array.isArray(record.animais)) return record.animais;
  if (Array.isArray(record.alertas)) return record.alertas;
  return [];
}

function defaultGetTotalFromPage<P>(page: P): number {
  const record = page as { total?: number };
  return record.total ?? 0;
}

function defaultGetNextPageParam<T, P>(
  lastPage: P,
  allPages: P[],
  pageSize: number,
  getItemsFromPage: (page: P) => T[],
): number | undefined {
  const total = defaultGetTotalFromPage(lastPage);
  const loaded = allPages.reduce(
    (sum, page) => sum + getItemsFromPage(page).length,
    0,
  );
  if (loaded >= total) return undefined;
  if (getItemsFromPage(lastPage).length < pageSize) return undefined;
  return loaded;
}

export function useMobileInfiniteList<T, P>({
  queryKey,
  enabled = true,
  pageSize,
  queryFn,
  getItemsFromPage = defaultGetItemsFromPage,
  getTotalFromPage = defaultGetTotalFromPage,
  getNextPageParam,
  clientPages,
  resetDeps = [],
}: UseMobileInfiniteListOptions<T, P>) {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const sentinelRef = useRef<HTMLDivElement>(null);

  const infiniteEnabled =
    enabled && !isDesktop && (clientPages ? !clientPages.isLoading : true);

  const clientQueryFn = async ({
    pageParam,
  }: QueryFunctionContext<QueryKey, number>): Promise<P> => {
    const source = clientPages!.items;
    const slice = source.slice(pageParam, pageParam + pageSize);
    return {
      items: slice,
      total: source.length,
    } as P;
  };

  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    refetch,
  } = useInfiniteQuery({
    queryKey,
    queryFn: clientPages ? clientQueryFn : queryFn,
    initialPageParam: 0,
    enabled: infiniteEnabled,
    getNextPageParam: (lastPage, allPages) => {
      if (getNextPageParam) {
        return getNextPageParam(lastPage, allPages, {
          pageSize,
          getItemsFromPage,
        });
      }
      return defaultGetNextPageParam(
        lastPage,
        allPages,
        pageSize,
        getItemsFromPage,
      );
    },
  });

  const items =
    data?.pages.flatMap((page) => getItemsFromPage(page)) ?? [];
  const total = data?.pages[0] ? getTotalFromPage(data.pages[0]) : 0;
  const allLoaded = !hasNextPage && items.length > 0;
  const resetKey = useMemo(() => JSON.stringify(resetDeps), [resetDeps]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasNextPage || isFetchingNextPage || isDesktop) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void fetchNextPage();
        }
      },
      { root: null, rootMargin: "200px", threshold: 0 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isDesktop,
    items.length,
    resetKey,
  ]);

  const prevResetKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (isDesktop) return;
    if (prevResetKeyRef.current === null) {
      prevResetKeyRef.current = resetKey;
      return;
    }
    if (prevResetKeyRef.current !== resetKey) {
      prevResetKeyRef.current = resetKey;
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [resetKey, isDesktop]);

  return {
    isDesktop,
    items,
    total,
    isLoading: infiniteEnabled && isLoading,
    isError,
    error,
    refetch,
    isFetchingNextPage,
    hasNextPage: hasNextPage ?? false,
    allLoaded,
    sentinelRef,
  };
}
