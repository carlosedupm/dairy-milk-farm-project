"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { getAreasMode, getDefaultLandingPath } from "@/config/appAccess";
import { PageContainer } from "@/components/layout/PageContainer";
import { LandingPage } from "@/components/landing/LandingPage";
import { Dashboard } from "@/components/dashboard/Dashboard";

export default function Home() {
  const { user, isAuthenticated, isReady } = useAuth();
  const router = useRouter();
  const hasRedirected = useRef(false);

  useEffect(() => {
    if (hasRedirected.current) return;
    if (!isReady || !isAuthenticated) return;
    
    // USER pendente usa "/" (Dashboard de provisão); não empurrar para /onboarding senão entra em ciclo com /fazendas.
    if (getAreasMode(user?.perfil) === "pending") {
      return;
    }
    const landing = getDefaultLandingPath(user?.perfil);
    if (landing !== "/") {
      hasRedirected.current = true;
      router.replace(landing);
    }
  }, [isReady, isAuthenticated, router, user?.perfil]);

  if (!isReady) {
    return (
      <PageContainer variant="centered">
        <p className="text-muted-foreground">Carregando…</p>
      </PageContainer>
    );
  }

  if (!isAuthenticated) {
    return <LandingPage />;
  }

  // Para usuários autenticados cujo default path é "/"
  return <Dashboard />;
}
