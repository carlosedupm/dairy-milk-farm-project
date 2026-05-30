"use client";

import { useCallback, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useFazendaAtiva } from "@/contexts/FazendaContext";
import type { AppArea } from "@/config/appAccess";
import {
  getHeaderNavGroups,
  getNavAreaLabel,
  hasHeaderNav,
  type HeaderNavGroups,
} from "@/config/headerNav";

export function useMenuItems(): {
  groups: HeaderNavGroups;
  hasNav: boolean;
  getAreaLabel: (area: AppArea) => string;
  perfil: string | undefined;
} {
  const { user } = useAuth();
  const { fazendaAtiva } = useFazendaAtiva();
  const perfil = user?.perfil;

  const groups = useMemo(
    () => getHeaderNavGroups(perfil, fazendaAtiva?.id),
    [perfil, fazendaAtiva?.id]
  );

  const hasNav = useMemo(() => hasHeaderNav(groups), [groups]);

  const getAreaLabel = useCallback(
    (area: AppArea) => getNavAreaLabel(area, perfil),
    [perfil]
  );

  return { groups, hasNav, getAreaLabel, perfil };
}
