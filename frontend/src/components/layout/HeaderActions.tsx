"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { HeaderAccountPopover } from "@/components/layout/HeaderAccountPopover";
import type { IdentityUser } from "@/components/layout/UserIdentitySummary";

type HeaderActionsProps = {
  user: IdentityUser | null;
  fazendaNomeResumo: string | null;
  fazendaAtivaNomePainel: string | null;
  showFazendaSelectorBlock: boolean;
  isProprietario: boolean;
  logout: () => void;
};

export function HeaderActions({
  user,
  fazendaNomeResumo,
  fazendaAtivaNomePainel,
  showFazendaSelectorBlock,
  isProprietario,
  logout,
}: HeaderActionsProps) {
  return (
    <>
      <ThemeToggle />
      {user ? (
        <HeaderAccountPopover
          user={user}
          fazendaNomeResumo={fazendaNomeResumo}
          fazendaAtivaNomePainel={fazendaAtivaNomePainel}
          showFazendaSelectorBlock={showFazendaSelectorBlock}
          isProprietario={isProprietario}
          onLogout={logout}
        />
      ) : (
        <>
          <Button size="sm" asChild>
            <Link href="/registro">Criar conta</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/login">Entrar</Link>
          </Button>
        </>
      )}
    </>
  );
}
