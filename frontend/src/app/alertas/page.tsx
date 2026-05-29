"use client";

import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useFazendaAtiva } from "@/contexts/FazendaContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  alertasListQueryKey,
  createAlertaManual,
  deleteAlerta,
  listAlertas,
  SEVERIDADE_ALERTA_LABELS,
  SEVERIDADES_ALERTA,
  STATUS_ALERTA,
  STATUS_ALERTA_LABELS,
  TIPOS_ALERTA,
  TIPO_ALERTA_LABELS,
  updateAlertaStatus,
  type Alerta,
  type SeveridadeAlerta,
  type StatusAlerta,
  type TipoAlerta,
} from "@/services/alertas";
import {
  canCriarAlertaManual,
  canExcluirAlerta,
  canMarcarAlertaEmAndamento,
  canResolverAlerta,
} from "@/config/appAccess";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { PageContainer } from "@/components/layout/PageContainer";
import { ListCardLayout } from "@/components/layout/ListCardLayout";
import { QueryListContent } from "@/components/layout/QueryListContent";
import { ResponsiveListContainer } from "@/components/layout/list/ResponsiveListContainer";
import { MobileListCard } from "@/components/layout/list/MobileListCard";
import {
  ListRowActionsMenu,
  type ListRowActionItem,
} from "@/components/layout/list/ListRowActionsMenu";
import { DeleteRecordDialog } from "@/components/layout/list/DeleteRecordDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ListPaginationBar } from "@/components/ui/pagination";
import { Textarea } from "@/components/ui/textarea";
import { getApiErrorMessage } from "@/lib/errors";
import { formatDatePtBr } from "@/lib/format";
import { Plus } from "lucide-react";

const PAGE_SIZE = 25;
const FILTER_ALL = "__all__";

const SEVERIDADE_VARIANT: Record<
  string,
  "destructive" | "secondary" | "outline" | "default"
> = {
  CRITICA: "destructive",
  ALTA: "destructive",
  MEDIA: "secondary",
  BAIXA: "outline",
};

function tipoLabel(t: string): string {
  return TIPO_ALERTA_LABELS[t as TipoAlerta] ?? t;
}

function severidadeLabel(s: string): string {
  return SEVERIDADE_ALERTA_LABELS[s as SeveridadeAlerta] ?? s;
}

function statusLabel(s: string): string {
  return STATUS_ALERTA_LABELS[s as StatusAlerta] ?? s;
}

function isValidTipoFilter(t: string): t is TipoAlerta {
  return (TIPOS_ALERTA as readonly string[]).includes(t);
}

function AlertasContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { fazendaAtiva } = useFazendaAtiva();
  const { user } = useAuth();
  const perfil = user?.perfil;
  const queryClient = useQueryClient();
  const fazendaId = fazendaAtiva?.id ?? 0;

  const tipoParam = searchParams.get("tipo");
  const tipoFromUrl =
    tipoParam && isValidTipoFilter(tipoParam) ? tipoParam : null;

  const [statusFilter, setStatusFilter] = useState<string>(FILTER_ALL);
  const [tipoFilter, setTipoFilter] = useState<string>(FILTER_ALL);
  const [severidadeFilter, setSeveridadeFilter] = useState<string>(FILTER_ALL);
  const activeTipoFilter = tipoFromUrl ?? tipoFilter;
  const [offset, setOffset] = useState(0);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [formTitulo, setFormTitulo] = useState("");
  const [formDescricao, setFormDescricao] = useState("");
  const [formSeveridade, setFormSeveridade] = useState<SeveridadeAlerta>("MEDIA");
  const [formAnimalId, setFormAnimalId] = useState("");
  const [formDataPrevista, setFormDataPrevista] = useState("");

  const listParams = useMemo(
    () => ({
      status: statusFilter === FILTER_ALL ? undefined : statusFilter,
      tipo: activeTipoFilter === FILTER_ALL ? undefined : activeTipoFilter,
      severidade: severidadeFilter === FILTER_ALL ? undefined : severidadeFilter,
      limit: PAGE_SIZE,
      offset,
    }),
    [statusFilter, activeTipoFilter, severidadeFilter, offset]
  );

  const filterKey = `${statusFilter}|${activeTipoFilter}|${severidadeFilter}`;
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (prevFilterKey !== filterKey) {
    setPrevFilterKey(filterKey);
    setOffset(0);
  }

  const { data, isLoading, error } = useQuery({
    queryKey: alertasListQueryKey(fazendaId, listParams),
    queryFn: () => listAlertas(fazendaId, listParams),
    enabled: fazendaId > 0,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["alertas", fazendaId] });
  };

  const statusMutation = useMutation({
    mutationFn: ({
      alertaId,
      status,
    }: {
      alertaId: number;
      status: StatusAlerta;
    }) => updateAlertaStatus(fazendaId, alertaId, status),
    onSuccess: invalidate,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createAlertaManual(fazendaId, {
        tipo: "MANUAL",
        titulo: formTitulo.trim(),
        descricao: formDescricao.trim() || null,
        severidade: formSeveridade,
        animal_id: formAnimalId ? Number(formAnimalId) : null,
        data_prevista: formDataPrevista || null,
      }),
    onSuccess: () => {
      invalidate();
      setCreateOpen(false);
      setFormTitulo("");
      setFormDescricao("");
      setFormSeveridade("MEDIA");
      setFormAnimalId("");
      setFormDataPrevista("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (alertaId: number) => deleteAlerta(fazendaId, alertaId),
    onSuccess: () => {
      invalidate();
      setDeleteId(null);
    },
  });

  const canCreate = canCriarAlertaManual(perfil);
  const canResolve = canResolverAlerta(perfil);
  const canEmAndamento = canMarcarAlertaEmAndamento(perfil);
  const canDelete = canExcluirAlerta(perfil);

  const menuItems = (item: Alerta): ListRowActionItem[] => {
    const actions: ListRowActionItem[] = [];
    if (
      canEmAndamento &&
      item.status === "ABERTO"
    ) {
      actions.push({
        label: "Marcar em andamento",
        onSelect: () =>
          statusMutation.mutate({
            alertaId: item.id,
            status: "EM_ANDAMENTO",
          }),
      });
    }
    if (canResolve && !["RESOLVIDO", "IGNORADO"].includes(item.status)) {
      actions.push({
        label: "Resolver",
        onSelect: () =>
          statusMutation.mutate({ alertaId: item.id, status: "RESOLVIDO" }),
      });
      actions.push({
        label: "Ignorar",
        onSelect: () =>
          statusMutation.mutate({ alertaId: item.id, status: "IGNORADO" }),
      });
    }
    if (canDelete && item.tipo === "MANUAL") {
      actions.push({
        label: "Excluir",
        variant: "destructive",
        onSelect: () => setDeleteId(item.id),
      });
    }
    return actions;
  };

  const renderMeta = (item: Alerta) => (
    <div className="flex flex-wrap gap-1.5 mt-1">
      <Badge variant={SEVERIDADE_VARIANT[item.severidade] ?? "outline"}>
        {severidadeLabel(item.severidade)}
      </Badge>
      <Badge variant="outline">{statusLabel(item.status)}</Badge>
      <Badge variant="secondary">{tipoLabel(item.tipo)}</Badge>
    </div>
  );

  if (!fazendaAtiva) {
    return (
      <PageContainer variant="default">
        <p className="text-muted-foreground">Selecione uma fazenda.</p>
      </PageContainer>
    );
  }

  const alertas = data?.alertas ?? [];
  const total = data?.total ?? 0;

  return (
    <PageContainer variant="default">
      <ListCardLayout
        title={`Alertas – ${fazendaAtiva.nome}`}
        action={
          canCreate ? (
            <Button type="button" size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-1" aria-hidden />
              Novo alerta
            </Button>
          ) : null
        }
      >
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <div className="space-y-1">
            <Label htmlFor="filtro-status">Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger id="filtro-status">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={FILTER_ALL}>Todos</SelectItem>
                {STATUS_ALERTA.map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATUS_ALERTA_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="filtro-tipo">Tipo</Label>
            <Select
              value={activeTipoFilter}
              onValueChange={(value) => {
                setTipoFilter(value);
                if (tipoFromUrl) {
                  router.replace("/alertas", { scroll: false });
                }
              }}
            >
              <SelectTrigger id="filtro-tipo">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={FILTER_ALL}>Todos</SelectItem>
                {TIPOS_ALERTA.map((t) => (
                  <SelectItem key={t} value={t}>
                    {TIPO_ALERTA_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="filtro-severidade">Severidade</Label>
            <Select value={severidadeFilter} onValueChange={setSeveridadeFilter}>
              <SelectTrigger id="filtro-severidade">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={FILTER_ALL}>Todas</SelectItem>
                {SEVERIDADES_ALERTA.map((s) => (
                  <SelectItem key={s} value={s}>
                    {SEVERIDADE_ALERTA_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <QueryListContent
          isLoading={isLoading}
          error={error}
          errorFallback="Erro ao carregar alertas."
        >
          {!isLoading && !error && alertas.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              Nenhum alerta encontrado para os filtros selecionados.
            </p>
          ) : (
            <>
          <ResponsiveListContainer
            mobile={alertas.map((item) => (
              <MobileListCard
                key={item.id}
                title={item.titulo}
                subtitle={
                  item.animal_identificacao
                    ? `Animal: ${item.animal_identificacao}`
                    : undefined
                }
                meta={
                  <>
                    {renderMeta(item)}
                    {item.data_prevista && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Previsto: {formatDatePtBr(item.data_prevista)}
                      </p>
                    )}
                    {item.descricao?.trim() && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {item.descricao.trim()}
                      </p>
                    )}
                  </>
                }
                href={
                  item.animal_id
                    ? `/animais/${item.animal_id}`
                    : undefined
                }
                actions={
                  menuItems(item).length > 0 ? (
                    <ListRowActionsMenu items={menuItems(item)} />
                  ) : undefined
                }
              />
            ))}
            desktop={
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Título</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Severidade</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Animal</TableHead>
                    <TableHead>Previsto</TableHead>
                    <TableHead className="w-[52px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {alertas.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium max-w-[200px]">
                        <div className="min-w-0">
                          <p className="truncate">{item.titulo}</p>
                          {item.descricao?.trim() && (
                            <p className="text-xs text-muted-foreground truncate">
                              {item.descricao.trim()}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{tipoLabel(item.tipo)}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            SEVERIDADE_VARIANT[item.severidade] ?? "outline"
                          }
                        >
                          {severidadeLabel(item.severidade)}
                        </Badge>
                      </TableCell>
                      <TableCell>{statusLabel(item.status)}</TableCell>
                      <TableCell>
                        {item.animal_id && item.animal_identificacao ? (
                          <Link
                            href={`/animais/${item.animal_id}`}
                            className="text-primary underline-offset-4 hover:underline"
                          >
                            {item.animal_identificacao}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
                        {item.data_prevista
                          ? formatDatePtBr(item.data_prevista)
                          : "—"}
                      </TableCell>
                      <TableCell>
                        {menuItems(item).length > 0 ? (
                          <ListRowActionsMenu items={menuItems(item)} />
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            }
          />

          {total > 0 && (
            <ListPaginationBar
              total={total}
              pageSize={PAGE_SIZE}
              offset={offset}
              onOffsetChange={setOffset}
            />
          )}
            </>
          )}
        </QueryListContent>

        {statusMutation.error && (
          <p className="text-sm text-destructive mt-2">
            {getApiErrorMessage(
              statusMutation.error,
              "Erro ao atualizar status."
            )}
          </p>
        )}
      </ListCardLayout>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Novo alerta manual</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="alerta-titulo">Título</Label>
              <Input
                id="alerta-titulo"
                value={formTitulo}
                onChange={(e) => setFormTitulo(e.target.value)}
                maxLength={200}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="alerta-descricao">Descrição</Label>
              <Textarea
                id="alerta-descricao"
                value={formDescricao}
                onChange={(e) => setFormDescricao(e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="alerta-severidade">Severidade</Label>
              <Select
                value={formSeveridade}
                onValueChange={(v) =>
                  setFormSeveridade(v as SeveridadeAlerta)
                }
              >
                <SelectTrigger id="alerta-severidade">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SEVERIDADES_ALERTA.map((s) => (
                    <SelectItem key={s} value={s}>
                      {SEVERIDADE_ALERTA_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="alerta-animal">ID do animal (opcional)</Label>
              <Input
                id="alerta-animal"
                type="number"
                min={1}
                value={formAnimalId}
                onChange={(e) => setFormAnimalId(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="alerta-data">Data prevista (opcional)</Label>
              <Input
                id="alerta-data"
                type="date"
                value={formDataPrevista}
                onChange={(e) => setFormDataPrevista(e.target.value)}
              />
            </div>
            {createMutation.error && (
              <p className="text-sm text-destructive">
                {getApiErrorMessage(createMutation.error, "Erro ao criar alerta.")}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setCreateOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={!formTitulo.trim() || createMutation.isPending}
              onClick={() => createMutation.mutate()}
            >
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteRecordDialog
        open={deleteId != null}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Excluir alerta"
        description={
          <>
            Este alerta manual será removido permanentemente.
            {deleteMutation.error && (
              <p className="text-destructive mt-2 text-sm">
                {getApiErrorMessage(deleteMutation.error, "Erro ao excluir.")}
              </p>
            )}
          </>
        }
        onConfirm={() => deleteId != null && deleteMutation.mutate(deleteId)}
        isPending={deleteMutation.isPending}
      />
    </PageContainer>
  );
}

export default function AlertasPage() {
  return (
    <ProtectedRoute>
      <Suspense
        fallback={
          <PageContainer>
            <p className="text-muted-foreground text-sm">A carregar…</p>
          </PageContainer>
        }
      >
        <AlertasContent />
      </Suspense>
    </ProtectedRoute>
  );
}
