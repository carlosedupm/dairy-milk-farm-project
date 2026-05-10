"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useAnimalSearchDialog } from "@/contexts/AnimalSearchDialogContext";
import { useMinhasFazendas } from "@/hooks/useMinhasFazendas";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { PWAInstallPrompt } from "@/components/layout/PWAInstallPrompt";
import { FazendaSelector } from "@/components/fazendas/FazendaSelector";
import { cn } from "@/lib/utils";
import {
  Building2,
  List,
  Droplets,
  Layers,
  ClipboardList,
  Menu,
  Users,
  Code,
  X,
  Wheat,
  CalendarDays,
  Search,
  type LucideIcon,
} from "lucide-react";
import {
  getNavAreasForPerfil,
  getAreaHref,
  AREA_LABEL,
  isPathAllowedForPerfil,
  type AppArea,
} from "@/config/appAccess";

const AREA_ICON: Record<AppArea, LucideIcon> = {
  fazendas: Building2,
  animais: List,
  producao: Droplets,
  lotes: Layers,
  agricultura: Wheat,
  gestao: ClipboardList,
  folgas: CalendarDays,
};

export function Header() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isAdmin = user?.perfil === "ADMIN" || user?.perfil === "DEVELOPER";
  const { fazendas, isLoading: fazendasLoading } = useMinhasFazendas({
    enabled: !!user && !isAdmin,
  });
  const showNavLinks =
    !!user && (isAdmin || (!fazendasLoading && fazendas.length > 0));

  const navAreas = getNavAreasForPerfil(user?.perfil);
  const showBuscaAnimal =
    !!user && isPathAllowedForPerfil(user.perfil, "/animais");
  const animalSearch = useAnimalSearchDialog();

  const isActive = (path: string) =>
    pathname === path || pathname?.startsWith(path + "/");

  const navLinkClass = (path: string) =>
    cn(
      "inline-flex items-center gap-2 text-base hover:text-foreground transition-colors min-h-[44px] py-2",
      isActive(path) ? "text-foreground font-medium" : "text-muted-foreground"
    );

  const closeMobileMenu = () => setMobileMenuOpen(false);

  const renderMainNavLinks = (opts: { onNavigate?: () => void }) => {
    const onNav = opts.onNavigate ?? (() => {});
    return (
      <>
        {isAdmin && (
          <Link
            href="/fazendas"
            className={cn(
              opts.onNavigate &&
                "py-3 px-3 rounded-md min-h-[44px] flex items-center gap-2",
              navLinkClass("/fazendas")
            )}
            onClick={onNav}
          >
            <Building2 className="h-5 w-5 shrink-0" aria-hidden />
            {AREA_LABEL.fazendas}
          </Link>
        )}
        {navAreas.map((area) => {
          const pathPrefix = getAreaHref(area);
          const Icon = AREA_ICON[area];
          return (
            <Link
              key={area}
              href={pathPrefix}
              className={cn(
                opts.onNavigate &&
                  "py-3 px-3 rounded-md min-h-[44px] flex items-center gap-2",
                navLinkClass(pathPrefix)
              )}
              onClick={onNav}
            >
              <Icon className="h-5 w-5 shrink-0" aria-hidden />
              {AREA_LABEL[area]}
            </Link>
          );
        })}
        {(user?.perfil === "ADMIN" || user?.perfil === "DEVELOPER") && (
          <Link
            href="/admin/usuarios"
            className={cn(
              opts.onNavigate &&
                "py-3 px-3 rounded-md min-h-[44px] flex items-center gap-2",
              navLinkClass("/admin")
            )}
            onClick={onNav}
          >
            <Users className="h-5 w-5 shrink-0" aria-hidden />
            Admin
          </Link>
        )}
        {user && user.perfil === "DEVELOPER" && (
          <Link
            href="/dev-studio"
            className={cn(
              opts.onNavigate &&
                "py-3 px-3 rounded-md min-h-[44px] flex items-center gap-2",
              navLinkClass("/dev-studio")
            )}
            onClick={onNav}
          >
            <Code className="h-5 w-5 shrink-0" aria-hidden />
            Dev Studio
          </Link>
        )}
      </>
    );
  };

  return (
    <header className="border-b bg-card sticky top-0 z-50">
      <div className="mx-auto max-w-5xl px-4">
        <div className="flex h-14 items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="font-semibold shrink-0">
              CeialMilk
            </Link>
            {/* Desktop nav - hidden on mobile */}
            {showNavLinks && (
              <nav className="hidden lg:flex items-center gap-1">
                {renderMainNavLinks({})}
              </nav>
            )}
          </div>

          {/* Desktop right block - hidden on mobile */}
          <div className="hidden lg:flex items-center gap-3 min-w-0 flex-1 justify-end">
            {showBuscaAnimal && animalSearch ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Buscar animal por identificação"
                onClick={() => animalSearch.openDialog()}
              >
                <Search className="h-5 w-5" />
              </Button>
            ) : null}
            <ThemeToggle />
            {user ? (
              <>
                <FazendaSelector />
                <span className="text-sm text-muted-foreground truncate">
                  {user.nome?.trim() || user.email}
                </span>
                <Button variant="outline" size="sm" onClick={logout}>
                  Sair
                </Button>
              </>
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

          {/* Mobile: busca rápida a animais + menu */}
          <div className="flex lg:hidden items-center gap-1">
            {showBuscaAnimal && animalSearch ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Buscar animal por identificação"
                onClick={() => animalSearch.openDialog()}
              >
                <Search className="h-5 w-5" />
              </Button>
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
                    animalSearch.openDialog();
                  }}
                >
                  <Search
                    className="h-5 w-5 shrink-0 text-muted-foreground"
                    aria-hidden
                  />
                  Buscar animal
                </button>
              ) : null}
              {showNavLinks && (
                <>
                  {renderMainNavLinks({ onNavigate: closeMobileMenu })}
                </>
              )}
              {user ? (
                <>
                  <div className="py-2">
                    <FazendaSelector />
                  </div>
                  <p className="py-2 px-3 text-sm text-muted-foreground truncate">
                    {user.nome?.trim() || user.email}
                  </p>
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
                </>
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
