"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  type ReactNode,
} from "react";

export type AnimalSearchFieldHandle = {
  openSearch: () => void;
};

type Ctx = {
  openSearch: () => void;
  /** @deprecated Use openSearch */
  openDialog: () => void;
  registerSearchField: (handle: AnimalSearchFieldHandle | null) => void;
};

const AnimalSearchDialogContext = createContext<Ctx | null>(null);

export function useAnimalSearchDialog(): Ctx | null {
  return useContext(AnimalSearchDialogContext);
}

export function AnimalSearchDialogProvider({ children }: { children: ReactNode }) {
  const fieldRef = useRef<AnimalSearchFieldHandle | null>(null);

  const registerSearchField = useCallback(
    (handle: AnimalSearchFieldHandle | null) => {
      fieldRef.current = handle;
    },
    [],
  );

  const openSearch = useCallback(() => {
    fieldRef.current?.openSearch();
  }, []);

  const value = useMemo(
    () => ({
      openSearch,
      openDialog: openSearch,
      registerSearchField,
    }),
    [openSearch, registerSearchField],
  );

  return (
    <AnimalSearchDialogContext.Provider value={value}>
      {children}
    </AnimalSearchDialogContext.Provider>
  );
}
