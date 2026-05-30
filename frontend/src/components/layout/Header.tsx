"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAnimalSearchDialog } from "@/contexts/AnimalSearchDialogContext";
import { AnimalSearchHeaderField } from "@/components/layout/AnimalSearchHeaderField";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { PWAInstallPrompt } from "@/components/layout/PWAInstallPrompt";
import { PushPermissionBanner } from "@/components/layout/PushPermissionBanner";
import { HeaderDesktopNav } from "@/components/layout/HeaderDesktopNav";
import { HeaderAccountPopover } from "@/components/layout/HeaderAccountPopover";
import { HeaderMobileDrawer } from "@/components/layout/HeaderMobileDrawer";
import { userIdentityInitials } from "@/components/layout/UserIdentitySummary";
import { useHeaderVisibility } from "@/hooks/useHeaderVisibility";
import { useMenuItems } from "@/hooks/useMenuItems";
import { Menu } from "lucide-react";

export function Header() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const visibility = useHeaderVisibility();
  const { groups, hasNav, getAreaLabel } = useMenuItems();
  const animalSearch = useAnimalSearchDialog();

  const {
    user,
    logout,
    isAdmin,
    isProprietario,
    fazendaNomeResumo,
    fazendaAtivaNomePainel,
    showNavLinks,
    showBuscaAnimal,
    showFazendaSelectorBlock,
    mobileIdentityLabel,
  } = visibility;

  const showNav = showNavLinks && hasNav;
  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <header className="border-b bg-card sticky top-0 z-50">
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex h-14 items-center gap-3">
          <Link href="/" className="font-semibold shrink-0">
            CeialMilk
          </Link>
          {showNav ? (
            <HeaderDesktopNav groups={groups} getAreaLabel={getAreaLabel} />
          ) : null}

          <div className="hidden lg:flex items-center gap-3 min-w-0 shrink-0 ml-auto">
            {showBuscaAnimal ? (
              <AnimalSearchHeaderField key={pathname} />
            ) : null}
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
          </div>

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

      <HeaderMobileDrawer
        open={mobileMenuOpen}
        onClose={closeMobileMenu}
        user={user}
        isAdmin={isAdmin}
        isProprietario={isProprietario}
        fazendaNomeResumo={fazendaNomeResumo}
        showBuscaAnimal={showBuscaAnimal}
        showNavLinks={showNav}
        groups={groups}
        getAreaLabel={getAreaLabel}
        onOpenSearch={
          animalSearch ? () => animalSearch.openSearch() : undefined
        }
        onLogout={logout}
      />
    </header>
  );
}
