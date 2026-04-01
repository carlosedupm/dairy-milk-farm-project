"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Props = {
  title: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
};

/**
 * Card de listagem com título e ação opcional (ex.: link Novo).
 */
export function ListCardLayout({ title, action, children }: Props) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle>{title}</CardTitle>
        {action ?? null}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
