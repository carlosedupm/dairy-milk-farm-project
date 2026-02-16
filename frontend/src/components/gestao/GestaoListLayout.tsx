"use client";

import Link from "next/link";
import { PageContainer } from "@/components/layout/PageContainer";
import { BackLink } from "@/components/layout/BackLink";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

type Props = {
  title: string;
  backHref: string;
  newHref?: string;
  children: React.ReactNode;
};

export function GestaoListLayout({ title, backHref, newHref, children }: Props) {
  return (
    <PageContainer variant="default">
      <BackLink href={backHref}>Voltar à Gestão</BackLink>
      <Card className="mt-4">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle>{title}</CardTitle>
          {newHref && (
            <Button asChild>
              <Link href={newHref}>
                <Plus className="mr-2 h-4 w-4" />
                Novo
              </Link>
            </Button>
          )}
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </PageContainer>
  );
}
