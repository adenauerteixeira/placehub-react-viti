import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

/** Esqueleto com a mesma forma do `DataTable` (busca + cabeçalho + linhas) —
 * substitui um bloco cinza genérico, que não guarda relação nenhuma com a
 * altura/formato real da tabela e faz o conteúdo "pular" quando os dados
 * chegam. */
export function TableSkeleton({
  columns = 4,
  rows = 5,
  search = true,
}: {
  columns?: number
  rows?: number
  /** Desliga a barra de busca do topo — para tabelas embutidas (sem `DataTable`). */
  search?: boolean
}) {
  return (
    <div className="flex flex-col gap-3">
      {search && <Skeleton className="h-9 w-full max-w-sm" />}
      <Table>
        <TableHeader>
          <TableRow>
            {Array.from({ length: columns }).map((_, i) => (
              <TableHead key={i}>
                <Skeleton className="h-4 w-20" />
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: rows }).map((_, r) => (
            <TableRow key={r}>
              {Array.from({ length: columns }).map((_, c) => (
                <TableCell key={c}>
                  <Skeleton className="h-4 w-full max-w-32" />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
