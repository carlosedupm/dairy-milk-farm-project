"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { AssistenteInput } from "@/components/assistente/AssistenteInput";
import { cn } from "@/lib/utils";
import { Menu, X } from "lucide-react";

export function Header() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path: string) =>
    pathname === path || pathname?.startsWith(path + "/");

  const navLinkClass = (path: string) =>
    cn(
      "text-sm hover:text-foreground transition-colors",
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
          <nav className="hidden lg:flex items-center gap-4">
            <Link href="/fazendas" className={navLinkClass("/fazendas")}>
              Fazendas
            </Link>
            {(user?.perfil === "ADMIN" || user?.perfil === "DEVELOPER") && (
              <Link href="/admin/usuarios" className={navLinkClass("/admin")}>
                Admin
              </Link>
            )}
            {user && user.perfil === "DEVELOPER" && (
              <Link href="/dev-studio" className={navLinkClass("/dev-studio")}>
                Dev Studio
              </Link>
            )}
          </nav>
        </div>

        {/* Desktop right block - hidden on mobile */}
        <div className="hidden lg:flex items-center gap-3 min-w-0 flex-1 justify-end max-w-md">
          <AssistenteInput />
          {user && (
            <span className="text-sm text-muted-foreground truncate">
              {user.email}
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
              <Link
                href="/fazendas"
                className={cn("py-2 px-3 rounded-md", navLinkClass("/fazendas"))}
                onClick={closeMobileMenu}
              >
                Fazendas
              </Link>
              {(user?.perfil === "ADMIN" || user?.perfil === "DEVELOPER") && (
                <Link
                  href="/admin/usuarios"
                  className={cn(
                    "py-2 px-3 rounded-md",
                    navLinkClass("/admin")
                  )}
                  onClick={closeMobileMenu}
                >
                  Admin
                </Link>
              )}
              {user && user.perfil === "DEVELOPER" && (
                <Link
                  href="/dev-studio"
                  className={cn(
                    "py-2 px-3 rounded-md",
                    navLinkClass("/dev-studio")
                  )}
                  onClick={closeMobileMenu}
                >
                  Dev Studio
                </Link>
              )}
              <div className="pt-2 mt-2 border-t">
                <AssistenteInput />
              </div>
              {user && (
                <p className="py-2 px-3 text-sm text-muted-foreground truncate">
                  {user.email}
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
