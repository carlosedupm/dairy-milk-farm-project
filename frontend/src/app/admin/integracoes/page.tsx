"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { listIntegracoes } from "@/services/integracoes";
import { RequireAdminRoute } from "@/components/layout/RequireAdminRoute";
import { PageContainer } from "@/components/layout/PageContainer";
import { BackLink } from "@/components/layout/BackLink";
import { ListCardLayout } from "@/components/layout/ListCardLayout";
import { QueryListContent } from "@/components/layout/QueryListContent";
import { IntegracaoTable } from "@/components/admin/IntegracaoTable";
import { Button } from "@/components/ui/button";
import { Plus, Plug } from "lucide-react";

function AdminIntegracoesContent() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "integracoes"],
    queryFn: () => listIntegracoes({ limit: 100, offset: 0 }),
  });

  const clientes = data?.clientes ?? [];
  const total = data?.total ?? 0;

  return (
    <PageContainer variant="default">
      <BackLink href="/admin/usuarios">Admin</BackLink>
      <ListCardLayout
        title={
          <span className="inline-flex items-center gap-2">
            <Plug className="h-5 w-5" />
            Integrações ({total})
          </span>
        }
        action={
          <Button asChild>
            <Link href="/admin/integracoes/novo">
              <Plus className="mr-2 h-4 w-4" />
              Novo cliente
            </Link>
          </Button>
        }
      >
        <QueryListContent
          isLoading={isLoading}
          error={error}
          errorFallback="Erro ao carregar integrações."
        >
          <IntegracaoTable items={clientes} />
        </QueryListContent>
      </ListCardLayout>
    </PageContainer>
  );
}

export default function AdminIntegracoesPage() {
  return (
    <RequireAdminRoute>
      <AdminIntegracoesContent />
    </RequireAdminRoute>
  );
}
