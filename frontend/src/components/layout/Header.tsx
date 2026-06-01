"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useAnimalSearchDialog } from "@/contexts/AnimalSearchDialogContext";
import { Button } from "@/components/ui/button";
import { PWAInstallPrompt } from "@/components/layout/PWAInstallPrompt";
import { PushPermissionBanner } from "@/components/layout/PushPermissionBanner";
import { HeaderBrand } from "@/components/layout/HeaderBrand";
import { HeaderNav } from "@/components/layout/HeaderNav";
import { HeaderBuscaTrigger } from "@/components/layout/HeaderBuscaTrigger";
import { HeaderActions } from "@/components/layout/HeaderActions";
import { HeaderMobileDrawer } from "@/components/layout/HeaderMobileDrawer";
import { userIdentityInitials } from "@/components/layout/UserIdentitySummary";
import { useHeaderVisibility } from "@/hooks/useHeaderVisibility";
import { useMenuItems } from "@/hooks/useMenuItems";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";

export function Header() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const visibility = useHeaderVisibility();
  const { groups, hasNav, getAreaLabel } = useMenuItems();
  const animalSearch = useAnimalSearchDialog();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 0);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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
    <header
      className={cn(
        "sticky top-0 z-50 w-full border-b transition-all duration-200",
        scrolled
          ? "bg-card/80 backdrop-blur-md shadow-sm border-border"
          : "bg-card border-border"
      )}
    >
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex h-14 items-center gap-3">
          <HeaderBrand />
          <HeaderNav showNav={showNav} groups={groups} getAreaLabel={getAreaLabel} />

          <div className="hidden lg:flex items-center gap-3 min-w-0 shrink-0 ml-auto">
            {showBuscaAnimal ? <HeaderBuscaTrigger key={pathname} /> : null}
            <HeaderActions
              user={user}
              fazendaNomeResumo={fazendaNomeResumo}
              fazendaAtivaNomePainel={fazendaAtivaNomePainel}
              showFazendaSelectorBlock={showFazendaSelectorBlock}
              isProprietario={isProprietario}
              logout={logout}
            />
          </div>

          <div className="flex lg:hidden min-w-0 flex-1 items-center gap-1 ml-auto">
            {showBuscaAnimal ? <HeaderBuscaTrigger key={pathname} compact /> : null}
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
        onOpenSearch={animalSearch ? () => animalSearch.openSearch() : undefined}
        onLogout={logout}
      />
    </header>
  );
}
