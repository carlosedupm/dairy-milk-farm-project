'use client'

import Link from 'next/link'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { ProducaoLeite } from '@/services/producao'
import { remove } from '@/services/producao'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

type Props = {
  items: ProducaoLeite[]
  showAnimal?: boolean
}

// Função para obter o badge de qualidade
function getQualidadeBadge(qualidade?: number | null) {
  if (!qualidade) return null
  
  let variant: 'default' | 'secondary' | 'destructive' | 'outline' = 'default'
  if (qualidade <= 3) variant = 'destructive'
  else if (qualidade <= 5) variant = 'secondary'
  else if (qualidade <= 7) variant = 'outline'
  else variant = 'default'
  
  return <Badge variant={variant}>{qualidade}/10</Badge>
}

export function ProducaoTable({ items, showAnimal = true }: Props) {
  const queryClient = useQueryClient()
  const deleteMutation = useMutation({
    mutationFn: remove,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['producao'] })
    },
  })

  const handleDelete = (id: number) => {
    deleteMutation.mutate(id)
  }

  const formatDateTime = (dateTime: string) => {
    const date = new Date(dateTime)
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatLitros = (litros: number) => {
    return litros.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  return (
    <div className="overflow-x-auto -mx-4 sm:mx-0">
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Data/Hora</TableHead>
          <TableHead className="text-right">Litros</TableHead>
          <TableHead>Qualidade</TableHead>
          <TableHead className="text-right">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.length === 0 ? (
          <TableRow>
            <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
              Nenhum registro de produção.
            </TableCell>
          </TableRow>
        ) : (
          items.map((p) => (
            <TableRow key={p.id}>
              <TableCell className="font-medium">{formatDateTime(p.data_hora)}</TableCell>
              <TableCell className="text-right font-mono">
                {formatLitros(p.quantidade)} L
              </TableCell>
              <TableCell>
                {getQualidadeBadge(p.qualidade) ?? '—'}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex flex-wrap justify-end gap-2">
                  <Button variant="outline" size="default" asChild>
                    <Link href={`/producao/${p.id}/editar`}>Editar</Link>
                  </Button>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="destructive" size="default">
                        Excluir
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Excluir registro</DialogTitle>
                        <DialogDescription>
                          Tem certeza que deseja excluir este registro de produção de {formatDateTime(p.data_hora)}? 
                          Esta ação não pode ser desfeita.
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter>
                        <DialogClose asChild>
                          <Button variant="outline">Cancelar</Button>
                        </DialogClose>
                        <Button
                          variant="destructive"
                          onClick={() => handleDelete(p.id)}
                          disabled={deleteMutation.isPending}
                        >
                          {deleteMutation.isPending ? 'Excluindo…' : 'Excluir'}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
    </div>
  )
}
