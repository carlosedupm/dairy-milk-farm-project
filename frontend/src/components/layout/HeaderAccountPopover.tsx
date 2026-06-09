"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getAreasMode } from "@/config/appAccess";
import {
  resetAnimalFichaTour,
  resetDashboardTour,
} from "@/lib/onboardingStorage";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { FazendaSelector } from "@/components/fazendas/FazendaSelector";
import {
  UserIdentitySummary,
  userIdentityAriaLabel,
  userIdentityInitials,
} from "@/components/layout/UserIdentitySummary";
import type { IdentityUser } from "@/components/layout/UserIdentitySummary";
import { ChevronDown, Plus } from "lucide-react";

type HeaderAccountPopoverProps = {
  user: IdentityUser;
  fazendaNomeResumo: string | null;
  fazendaAtivaNomePainel: string | null;
  showFazendaSelectorBlock: boolean;
  isProprietario: boolean;
  onLogout: () => void;
};

export function HeaderAccountPopover({
  user,
  fazendaNomeResumo,
  fazendaAtivaNomePainel,
  showFazendaSelectorBlock,
  isProprietario,
  onLogout,
}: HeaderAccountPopoverProps) {
  const router = useRouter();
  const showTourReset =
    user.id != null && getAreasMode(user.perfil) !== "pending";

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="inline-flex h-9 max-w-[min(240px,28vw)] shrink-0 items-center gap-2 px-2 font-normal min-w-0"
          aria-label={userIdentityAriaLabel(user, fazendaNomeResumo)}
          aria-haspopup="dialog"
        >
          <span
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold uppercase text-foreground"
            aria-hidden
          >
            {userIdentityInitials(user)}
          </span>
          <span className="min-w-0 truncate text-left text-sm">
            {user.nome?.trim() || user.email}
          </span>
          <ChevronDown
            className="h-4 w-4 shrink-0 opacity-60"
            aria-hidden
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="z-50 w-[min(20rem,calc(100vw-2rem))] max-h-[min(32rem,72dvh)] overflow-y-auto p-4"
      >
        <h2 className="sr-only">Conta e fazenda</h2>
        <div className="flex flex-col gap-4">
          <UserIdentitySummary
            user={user}
            variant="panel"
            fazendaAtivaNome={fazendaAtivaNomePainel}
            withAccessibleLabel={false}
          />
          {showFazendaSelectorBlock ? (
            <>
              <FazendaSelector density="drawer" />
              {isProprietario ? (
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="h-10 w-full justify-center gap-1.5"
                >
                  <Link href="/fazendas/criar-minha">
                    <Plus className="h-4 w-4 shrink-0" aria-hidden />
                    Nova fazenda
                  </Link>
                </Button>
              ) : null}
            </>
          ) : null}
          {showTourReset ? (
            <>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-10 w-full justify-center text-muted-foreground"
                onClick={() => {
                  resetDashboardTour(user.id);
                  router.push("/");
                }}
              >
                Ver tour do início novamente
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-10 w-full justify-center text-muted-foreground"
                onClick={() => {
                  resetAnimalFichaTour(user.id);
                  const onAnimalFicha = /^\/animais\/\d+/.test(
                    window.location.pathname,
                  );
                  if (!onAnimalFicha) {
                    router.push("/animais");
                  }
                }}
              >
                Ver tour da ficha novamente
              </Button>
            </>
          ) : null}
          <Button
            variant="outline"
            size="sm"
            className="h-10 w-full"
            onClick={() => {
              void onLogout();
            }}
          >
            Sair
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
