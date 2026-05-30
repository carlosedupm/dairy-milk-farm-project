"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useFazendaAtiva } from "@/contexts/FazendaContext";
import { isPathAllowedForPerfil } from "@/config/appAccess";
import { useMinhasFazendas } from "@/hooks/useMinhasFazendas";
import {
  userIdentityAriaLabel,
} from "@/components/layout/UserIdentitySummary";

export function useHeaderVisibility() {
  const { user, logout } = useAuth();
  const { fazendaAtiva } = useFazendaAtiva();
  const isAdmin = user?.perfil === "ADMIN" || user?.perfil === "DEVELOPER";
  const isProprietario = user?.perfil === "PROPRIETARIO";
  const { fazendas, isLoading: fazendasLoading, isSingleFazenda } =
    useMinhasFazendas({
      enabled: !!user && !isAdmin,
    });

  const fazendaNomeResumo = fazendaAtiva?.nome?.trim() || null;

  const showNavLinks =
    !!user &&
    (isAdmin ||
      (!fazendasLoading &&
        fazendas.length > 0 &&
        (isSingleFazenda || !!fazendaAtiva)));

  const showBuscaAnimal =
    !!user &&
    isPathAllowedForPerfil(user.perfil, "/animais") &&
    (isAdmin || !!fazendaAtiva);

  const showFazendaSelectorBlock =
    !!user &&
    !isAdmin &&
    (fazendasLoading || fazendas.length > 0 || isProprietario);

  const mobileIdentityLabel = user
    ? userIdentityAriaLabel(user, fazendaNomeResumo)
    : "";

  const fazendaAtivaNomePainel =
    isAdmin
      ? fazendaNomeResumo
      : fazendasLoading
        ? null
        : fazendas.length === 0
          ? fazendaNomeResumo
          : null;

  return {
    user,
    logout,
    isAdmin,
    isProprietario,
    fazendasLoading,
    fazendas,
    fazendaNomeResumo,
    fazendaAtivaNomePainel,
    showNavLinks,
    showBuscaAnimal,
    showFazendaSelectorBlock,
    mobileIdentityLabel,
  };
}
