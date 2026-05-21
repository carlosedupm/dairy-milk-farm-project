"use client";

import Link from "next/link";
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

type Props = {
  items: IntegracaoCliente[];
};

export function IntegracaoTable({ items }: Props) {
  if (items.length === 0) {
    return (
      <p className="text-muted-foreground text-sm py-4">
        Nenhum cliente de integração cadastrado.
      </p>
    );
  }

  return (
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
            <TableCell>
              {c.revogado_em ? (
                <Badge variant="destructive">Revogado</Badge>
              ) : c.ativo ? (
                <Badge variant="default">Ativo</Badge>
              ) : (
                <Badge variant="secondary">Inativo</Badge>
              )}
            </TableCell>
            <TableCell className="text-right">
              <Button variant="outline" size="sm" asChild>
                <Link href={`/admin/integracoes/${c.id}`}>Detalhes</Link>
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
