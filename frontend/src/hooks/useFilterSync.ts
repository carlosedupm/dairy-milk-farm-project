"use client";

import { useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export type FilterFieldDef<T extends Record<string, unknown>> = {
  key: keyof T & string;
  param: string;
  parse: (raw: string | null, params: URLSearchParams) => T[keyof T];
  serialize: (value: T[keyof T], state: T) => string | null;
  isDefault: (value: T[keyof T]) => boolean;
};

export type UseFilterSyncConfig<T extends Record<string, unknown>> = {
  pathname: string;
  defaults: T;
  fields: FilterFieldDef<T>[];
  preserveParams?: string[];
};

function parseFiltersFromUrl<T extends Record<string, unknown>>(
  params: URLSearchParams,
  defaults: T,
  fields: FilterFieldDef<T>[],
): T {
  const next = { ...defaults };
  for (const field of fields) {
    (next as Record<string, unknown>)[field.key] = field.parse(
      params.get(field.param),
      params,
    );
  }
  return next;
}

function serializeFiltersToParams<T extends Record<string, unknown>>(
  state: T,
  fields: FilterFieldDef<T>[],
  preserveParams: string[],
  currentParams: URLSearchParams,
): URLSearchParams {
  const next = new URLSearchParams();
  for (const key of preserveParams) {
    const val = currentParams.get(key);
    if (val != null && val !== "") {
      next.set(key, val);
    }
  }
  for (const field of fields) {
    const value = state[field.key];
    if (field.isDefault(value)) continue;
    const serialized = field.serialize(value, state);
    if (serialized != null && serialized !== "") {
      next.set(field.param, serialized);
    }
  }
  return next;
}

export function useFilterSync<T extends Record<string, unknown>>(
  config: UseFilterSyncConfig<T>,
) {
  const { pathname, defaults, fields, preserveParams = [] } = config;
  const searchParams = useSearchParams();
  const router = useRouter();

  const filters = useMemo(
    () => parseFiltersFromUrl(searchParams, defaults, fields),
    [searchParams, defaults, fields],
  );

  const hasActiveFilters = useMemo(
    () => fields.some((f) => !f.isDefault(filters[f.key])),
    [fields, filters],
  );

  const replaceUrl = useCallback(
    (state: T) => {
      const params = serializeFiltersToParams(
        state,
        fields,
        preserveParams,
        searchParams,
      );
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, fields, preserveParams, searchParams, router],
  );

  const setFilter = useCallback(
    <K extends keyof T & string>(key: K, value: T[K]) => {
      replaceUrl({ ...filters, [key]: value });
    },
    [filters, replaceUrl],
  );

  const setFilters = useCallback(
    (partial: Partial<T> | ((prev: T) => T)) => {
      const next =
        typeof partial === "function"
          ? partial(filters)
          : { ...filters, ...partial };
      replaceUrl(next);
    },
    [filters, replaceUrl],
  );

  const clearFilters = useCallback(() => {
    const params = new URLSearchParams();
    for (const key of preserveParams) {
      const val = searchParams.get(key);
      if (val != null && val !== "") {
        params.set(key, val);
      }
    }
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [pathname, preserveParams, searchParams, router]);

  return {
    filters,
    setFilter,
    setFilters,
    clearFilters,
    hasActiveFilters,
    searchParams,
  };
}
