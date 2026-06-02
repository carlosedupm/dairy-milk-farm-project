"use client";

import { useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useAnimalSearchDialog } from "@/contexts/AnimalSearchDialogContext";
import { HeaderBrand } from "@/components/layout/HeaderBrand";
import { HeaderNav } from "@/components/layout/HeaderNav";
import { HeaderBuscaTrigger } from "@/components/layout/HeaderBuscaTrigger";
import { HeaderActions } from "@/components/layout/HeaderActions";
import { HeaderBanners } from "@/components/layout/HeaderBanners";
import { HeaderMobileBar } from "@/components/layout/HeaderMobileBar";
import { HeaderMobileDrawer } from "@/components/layout/HeaderMobileDrawer";
import { useHeaderScrollState } from "@/hooks/useHeaderScrollState";
import { useHeaderVisibility } from "@/hooks/useHeaderVisibility";
import { useMenuItems } from "@/hooks/useMenuItems";

export function Header() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);
  const { headerClassName } = useHeaderScrollState();
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
    <header className={headerClassName}>
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

          <HeaderMobileBar
            showBuscaAnimal={showBuscaAnimal}
            user={user}
            mobileIdentityLabel={mobileIdentityLabel}
            menuOpen={mobileMenuOpen}
            onOpenMenu={() => setMobileMenuOpen(true)}
            menuTriggerRef={menuTriggerRef}
          />
        </div>

        <HeaderBanners />
      </div>

      <HeaderMobileDrawer
        open={mobileMenuOpen}
        onClose={closeMobileMenu}
        menuTriggerRef={menuTriggerRef}
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
