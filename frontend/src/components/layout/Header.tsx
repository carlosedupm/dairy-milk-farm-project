"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useFazendaAtiva } from "@/contexts/FazendaContext";
import { useAnimalSearchDialog } from "@/contexts/AnimalSearchDialogContext";
import { AnimalSearchHeaderField } from "@/components/layout/AnimalSearchHeaderField";
import { useMinhasFazendas } from "@/hooks/useMinhasFazendas";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { PWAInstallPrompt } from "@/components/layout/PWAInstallPrompt";
import { PushPermissionBanner } from "@/components/layout/PushPermissionBanner";
import { FazendaSelector } from "@/components/fazendas/FazendaSelector";
import { HeaderDesktopNav } from "@/components/layout/HeaderDesktopNav";
import { HeaderMobileNavSections } from "@/components/layout/HeaderMobileNavSections";
import {
  UserIdentitySummary,
  userIdentityAriaLabel,
  userIdentityInitials,
} from "@/components/layout/UserIdentitySummary";
import { isPathAllowedForPerfil } from "@/config/appAccess";
import { Menu, X, Plus, ChevronDown } from "lucide-react";

export function Header() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { fazendaAtiva } = useFazendaAtiva();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isAdmin = user?.perfil === "ADMIN" || user?.perfil === "DEVELOPER";
  const { fazendas, isLoading: fazendasLoading } = useMinhasFazendas({
    enabled: !!user && !isAdmin,
  });
  const showNavLinks =
    !!user && (isAdmin || (!fazendasLoading && fazendas.length > 0));
  const isProprietario = user?.perfil === "PROPRIETARIO";

  const showBuscaAnimal =
    !!user && isPathAllowedForPerfil(user.perfil, "/animais");
  const animalSearch = useAnimalSearchDialog();

  const fazendaNomeResumo = fazendaAtiva?.nome?.trim() || null;
  const mobileIdentityLabel = user
    ? userIdentityAriaLabel(user, fazendaNomeResumo)
    : "";

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <header className="border-b bg-card sticky top-0 z-50">
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex h-14 items-center gap-3">
          <Link href="/" className="font-semibold shrink-0">
            CeialMilk
          </Link>
          {showNavLinks ? <HeaderDesktopNav perfil={user?.perfil} /> : null}

          {/* Desktop right block */}
          <div className="hidden lg:flex items-center gap-3 min-w-0 shrink-0 ml-auto">
            {showBuscaAnimal ? (
              <AnimalSearchHeaderField key={pathname} />
            ) : null}
            <ThemeToggle />
            {user ? (
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
                      fazendaAtivaNome={
                        isAdmin
                          ? fazendaNomeResumo
                          : fazendasLoading
                            ? null
                            : fazendas.length === 0
                              ? fazendaNomeResumo
                              : null
                      }
                      withAccessibleLabel={false}
                    />
                    {!isAdmin &&
                    (fazendasLoading ||
                      fazendas.length > 0 ||
                      isProprietario) ? (
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
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-10 w-full"
                      onClick={() => {
                        void logout();
                      }}
                    >
                      Sair
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
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
          </div>

          {/* Mobile: busca + identidade compacta + menu */}
          <div className="flex lg:hidden min-w-0 flex-1 items-center gap-1 ml-auto">
            {showBuscaAnimal ? (
              <AnimalSearchHeaderField key={pathname} compact />
            ) : null}
            {user ? (
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-semibold uppercase text-foreground"
                aria-label={mobileIdentityLabel}
                title={mobileIdentityLabel}
              >
                {userIdentityInitials(user)}
              </div>
            ) : null}
            <Button
              variant="ghost"
              size="icon"
              aria-label="Abrir menu"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <PWAInstallPrompt />
        <PushPermissionBanner />
      </div>

      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            aria-hidden
            onClick={closeMobileMenu}
          />
          <div
            className="fixed top-0 right-0 bottom-0 w-full max-w-sm bg-card border-l shadow-lg z-50 flex flex-col lg:hidden"
            role="dialog"
            aria-label="Menu de navegação"
          >
            <div className="flex h-14 items-center justify-between px-4 border-b">
              <span className="font-semibold">Menu</span>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Fechar menu"
                onClick={closeMobileMenu}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <nav className="flex flex-col gap-1 p-4 overflow-auto">
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
                  {!isAdmin ? (
                    <FazendaSelector density="drawer" />
                  ) : null}
                  {isProprietario ? (
                    <Link
                      href="/fazendas/criar-minha"
                      className="flex min-h-[44px] w-full items-center gap-2 rounded-md py-3 px-3 text-left text-foreground hover:bg-accent"
                      onClick={closeMobileMenu}
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
              {showBuscaAnimal && animalSearch ? (
                <button
                  type="button"
                  className="flex min-h-[44px] w-full items-center gap-2 rounded-md py-3 px-3 text-left text-foreground hover:bg-accent"
                  onClick={() => {
                    closeMobileMenu();
                    animalSearch.openSearch();
                  }}
                >
                  Ir para busca no topo
                </button>
              ) : null}
              {showNavLinks ? (
                <HeaderMobileNavSections
                  perfil={user?.perfil}
                  onNavigate={closeMobileMenu}
                />
              ) : null}
              {user ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 justify-center"
                  onClick={() => {
                    closeMobileMenu();
                    logout();
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
                    onClick={closeMobileMenu}
                  >
                    <Link href="/registro">Criar conta</Link>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="justify-center"
                    asChild
                    onClick={closeMobileMenu}
                  >
                    <Link href="/login">Entrar</Link>
                  </Button>
                </div>
              )}
            </nav>
          </div>
        </>
      )}
    </header>
  );
}
