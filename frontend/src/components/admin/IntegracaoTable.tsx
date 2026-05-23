"use client";

import type { IntegracaoCliente } from "@/services/integracoes";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { MobileListCard } from "@/components/layout/list/MobileListCard";
import { ResponsiveListContainer } from "@/components/layout/list/ResponsiveListContainer";

type Props = {
  items: IntegracaoCliente[];
};

function estadoBadge(c: IntegracaoCliente) {
  if (c.revogado_em) {
    return <Badge variant="destructive">Revogado</Badge>;
  }
  if (c.ativo) {
    return <Badge variant="default">Ativo</Badge>;
  }
  return <Badge variant="secondary">Inativo</Badge>;
}

export function IntegracaoTable({ items }: Props) {
  if (items.length === 0) {
    return (
      <p className="text-muted-foreground text-sm py-4">
        Nenhum cliente de integração cadastrado.
      </p>
    );
  }

  return (
    <ResponsiveListContainer
      mobile={items.map((c) => (
        <MobileListCard
          key={c.id}
          href={`/admin/integracoes/${c.id}`}
          title={c.nome}
          subtitle={
            <code className="text-xs break-all">{c.key_prefix}…</code>
          }
          meta={estadoBadge(c)}
        />
      ))}
      desktop={
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Chave (prefixo)</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.nome}</TableCell>
                  <TableCell>
                    <code className="text-xs">{c.key_prefix}…</code>
                  </TableCell>
                  <TableCell>{estadoBadge(c)}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/admin/integracoes/${c.id}`}>Detalhes</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      }
    />
  );
}
