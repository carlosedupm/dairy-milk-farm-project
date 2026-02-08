"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useMinhasFazendas } from "@/hooks/useMinhasFazendas";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { AssistenteInput } from "@/components/assistente/AssistenteInput";
import { FazendaSelector } from "@/components/fazendas/FazendaSelector";
import { cn } from "@/lib/utils";
import { Building2, List, Droplets, Menu, Users, Code, X, MessageCircle } from "lucide-react";

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

  const isActive = (path: string) =>
    pathname === path || pathname?.startsWith(path + "/");

  const navLinkClass = (path: string) =>
    cn(
      "inline-flex items-center gap-2 text-base hover:text-foreground transition-colors min-h-[44px] py-2",
      isActive(path) ? "text-foreground font-medium" : "text-muted-foreground"
    );

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <header className="border-b bg-card sticky top-0 z-50">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4">
        <div className="flex items-center gap-4">
          <Link href="/" className="font-semibold shrink-0">
            CeialMilk
          </Link>
          {/* Desktop nav - hidden on mobile */}
          {showNavLinks && (
            <nav className="hidden lg:flex items-center gap-1">
              {isAdmin && (
                <Link href="/fazendas" className={navLinkClass("/fazendas")}>
                  <Building2 className="h-5 w-5 shrink-0" aria-hidden />
                  Fazendas
                </Link>
              )}
              <Link href="/animais" className={navLinkClass("/animais")}>
                <List className="h-5 w-5 shrink-0" aria-hidden />
                Animais
              </Link>
              <Link href="/producao" className={navLinkClass("/producao")}>
                <Droplets className="h-5 w-5 shrink-0" aria-hidden />
                Produção
              </Link>
              {(user?.perfil === "ADMIN" || user?.perfil === "DEVELOPER") && (
                <Link href="/admin/usuarios" className={navLinkClass("/admin")}>
                  <Users className="h-5 w-5 shrink-0" aria-hidden />
                  Admin
                </Link>
              )}
              {user && user.perfil === "DEVELOPER" && (
                <Link href="/dev-studio" className={navLinkClass("/dev-studio")}>
                  <Code className="h-5 w-5 shrink-0" aria-hidden />
                  Dev Studio
                </Link>
              )}
            </nav>
          )}
        </div>

        {/* Desktop right block - hidden on mobile */}
        <div className="hidden lg:flex items-center gap-3 min-w-0 flex-1 justify-end">
          <FazendaSelector />
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" title="Assistente em linguagem natural">
                <MessageCircle className="h-4 w-4 mr-1.5" aria-hidden />
                Assistente
              </Button>
            </DialogTrigger>
            <DialogContent
              className="sm:max-w-lg"
              onOpenAutoFocus={(e) => e.preventDefault()}
            >
              <DialogHeader>
                <DialogTitle>Assistente</DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground">
                  Digite ou fale o que você precisa. Ex: &quot;quantos animais tenho?&quot;, &quot;ver produção da fazenda&quot;, &quot;abrir fazenda X&quot;. Usa o contexto da sua fazenda ativa.
                </DialogDescription>
              </DialogHeader>
              <AssistenteInput />
            </DialogContent>
          </Dialog>
          <ThemeToggle />
          {user && (
            <span className="text-sm text-muted-foreground truncate">
              {user.nome?.trim() || user.email}
            </span>
          )}
          <Button variant="outline" size="sm" onClick={logout}>
            Sair
          </Button>
        </div>

        {/* Mobile: hamburger button */}
        <div className="flex lg:hidden items-center gap-2">
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
              <div className="py-2">
                <FazendaSelector />
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="justify-center gap-2 min-h-[44px]" title="Assistente">
                    <MessageCircle className="h-5 w-5 shrink-0" aria-hidden />
                    Assistente
                  </Button>
                </DialogTrigger>
                <DialogContent
                  className="sm:max-w-lg"
                  onOpenAutoFocus={(e) => e.preventDefault()}
                >
                  <DialogHeader>
                    <DialogTitle>Assistente</DialogTitle>
                    <DialogDescription className="text-sm text-muted-foreground">
                      Digite ou fale o que você precisa. Ex: &quot;quantos animais tenho?&quot;, &quot;ver produção da fazenda&quot;. Usa o contexto da sua fazenda ativa.
                    </DialogDescription>
                  </DialogHeader>
                  <AssistenteInput />
                </DialogContent>
              </Dialog>
              <div className="flex items-center gap-2 py-2 px-3">
                <ThemeToggle />
                <span className="text-sm text-muted-foreground">
                  Alternar tema
                </span>
              </div>
              {showNavLinks && (
                <>
                  {isAdmin && (
                    <Link
                      href="/fazendas"
                      className={cn(
                        "py-3 px-3 rounded-md min-h-[44px] flex items-center gap-2",
                        navLinkClass("/fazendas")
                      )}
                      onClick={closeMobileMenu}
                    >
                      <Building2 className="h-5 w-5 shrink-0" aria-hidden />
                      Fazendas
                    </Link>
                  )}
                  <Link
                    href="/animais"
                    className={cn(
                      "py-3 px-3 rounded-md min-h-[44px] flex items-center gap-2",
                      navLinkClass("/animais")
                    )}
                    onClick={closeMobileMenu}
                  >
                    <List className="h-5 w-5 shrink-0" aria-hidden />
                    Animais
                  </Link>
                  <Link
                    href="/producao"
                    className={cn(
                      "py-3 px-3 rounded-md min-h-[44px] flex items-center gap-2",
                      navLinkClass("/producao")
                    )}
                    onClick={closeMobileMenu}
                  >
                    <Droplets className="h-5 w-5 shrink-0" aria-hidden />
                    Produção
                  </Link>
                  {(user?.perfil === "ADMIN" || user?.perfil === "DEVELOPER") && (
                    <Link
                      href="/admin/usuarios"
                      className={cn(
                        "py-3 px-3 rounded-md min-h-[44px] flex items-center gap-2",
                        navLinkClass("/admin")
                      )}
                      onClick={closeMobileMenu}
                    >
                      <Users className="h-5 w-5 shrink-0" aria-hidden />
                      Admin
                    </Link>
                  )}
                  {user && user.perfil === "DEVELOPER" && (
                    <Link
                      href="/dev-studio"
                      className={cn(
                        "py-3 px-3 rounded-md min-h-[44px] flex items-center gap-2",
                        navLinkClass("/dev-studio")
                      )}
                      onClick={closeMobileMenu}
                    >
                      <Code className="h-5 w-5 shrink-0" aria-hidden />
                      Dev Studio
                    </Link>
                  )}
                </>
              )}
              {user && (
                <p className="py-2 px-3 text-sm text-muted-foreground truncate">
                  {user.nome?.trim() || user.email}
                </p>
              )}
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
            </nav>
          </div>
        </>
      )}
    </header>
  );
}
