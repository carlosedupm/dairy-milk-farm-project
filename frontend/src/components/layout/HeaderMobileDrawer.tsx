"use client";

import Link from "next/link";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { FazendaSelector } from "@/components/fazendas/FazendaSelector";
import { HeaderMobileNavSections } from "@/components/layout/HeaderMobileNavSections";
import { UserIdentitySummary } from "@/components/layout/UserIdentitySummary";
import type { HeaderNavGroups } from "@/config/headerNav";
import type { AppArea } from "@/config/appAccess";
import type { IdentityUser } from "@/components/layout/UserIdentitySummary";
import { X, Plus } from "lucide-react";

type HeaderMobileDrawerProps = {
  open: boolean;
  onClose: () => void;
  user: IdentityUser | null;
  isAdmin: boolean;
  isProprietario: boolean;
  fazendaNomeResumo: string | null;
  showBuscaAnimal: boolean;
  showNavLinks: boolean;
  groups: HeaderNavGroups;
  getAreaLabel: (area: AppArea) => string;
  onOpenSearch?: () => void;
  onLogout: () => void;
};

export function HeaderMobileDrawer({
  open,
  onClose,
  user,
  isAdmin,
  isProprietario,
  fazendaNomeResumo,
  showBuscaAnimal,
  showNavLinks,
  groups,
  getAreaLabel,
  onOpenSearch,
  onLogout,
}: HeaderMobileDrawerProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className="fixed inset-0 bg-black/50 z-40 lg:hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 duration-300"
        />
        <DialogPrimitive.Content
          className="fixed top-0 right-0 bottom-0 w-full max-w-sm bg-card border-l shadow-lg z-50 flex flex-col lg:hidden transition-transform duration-300 ease-in-out data-[state=closed]:translate-x-full data-[state=open]:translate-x-0"
          aria-label="Menu de navegação"
        >
          <div className="flex h-14 items-center justify-between px-4 border-b shrink-0">
            <span className="font-semibold">Menu</span>
            <DialogPrimitive.Close asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Fechar menu"
              >
                <X className="h-5 w-5" />
              </Button>
            </DialogPrimitive.Close>
          </div>
          <nav className="flex flex-col gap-1 p-4 overflow-auto flex-1 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
            {user ? (
              <section
                className="mb-2 space-y-3 border-b border-border pb-4"
                aria-label="Conta e fazenda"
              >
                <UserIdentitySummary
                  user={user}
                  variant="panel"
                  fazendaAtivaNome={fazendaNomeResumo}
                />
                {!isAdmin ? <FazendaSelector density="drawer" /> : null}
                {isProprietario ? (
                  <Link
                    href="/fazendas/criar-minha"
                    className="flex min-h-[44px] w-full items-center gap-2 rounded-md py-3 px-3 text-left text-foreground hover:bg-accent"
                    onClick={onClose}
                  >
                    <Plus
                      className="h-5 w-5 shrink-0 text-muted-foreground"
                      aria-hidden
                    />
                    Nova fazenda
                  </Link>
                ) : null}
              </section>
            ) : null}

            <div className="flex items-center gap-2 py-2 px-3">
              <ThemeToggle />
              <span className="text-sm text-muted-foreground">
                Alternar tema
              </span>
            </div>
            {showBuscaAnimal && onOpenSearch ? (
              <button
                type="button"
                className="flex min-h-[44px] w-full items-center gap-2 rounded-md py-3 px-3 text-left text-foreground hover:bg-accent"
                onClick={() => {
                  onClose();
                  onOpenSearch();
                }}
              >
                Ir para busca no topo
              </button>
            ) : null}
            {showNavLinks ? (
              <HeaderMobileNavSections
                groups={groups}
                getAreaLabel={getAreaLabel}
                onNavigate={onClose}
              />
            ) : null}
            {user ? (
              <Button
                variant="outline"
                size="sm"
                className="mt-2 justify-center"
                onClick={() => {
                  onClose();
                  onLogout();
                }}
              >
                Sair
              </Button>
            ) : (
              <div className="mt-2 flex flex-col gap-2">
                <Button
                  size="sm"
                  className="justify-center"
                  asChild
                  onClick={onClose}
                >
                  <Link href="/registro">Criar conta</Link>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="justify-center"
                  asChild
                  onClick={onClose}
                >
                  <Link href="/login">Entrar</Link>
                </Button>
              </div>
            )}
          </nav>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
