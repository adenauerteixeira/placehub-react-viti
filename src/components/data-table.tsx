import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { flexRender } from '@tanstack/react-table'
import {
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useLegacyTable,
  type LegacyColumnDef,
} from '@tanstack/react-table/legacy'
import type { RowData } from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

/** `any` como default de TValue (em vez do `unknown` da lib) — colunas
 * custom (Badge, avatar, moeda formatada) variam de tipo de valor entre si,
 * e essa tabela não precisa da inferência fina por coluna. */
export type DataTableColumn<TData extends RowData, TValue = any> = LegacyColumnDef<TData, TValue>

/** Tabela de listagem reutilizável (busca global + ordenação por coluna +
 * paginação client-side) sobre @tanstack/react-table — a lib já é padrão do
 * projeto (ver ARCHITECTURE.md). Usa a camada de compatibilidade v8
 * (`/legacy`) porque a API nova da v9 é baseada em atoms/store e ainda muito
 * recente; a camada legacy é mantida oficialmente e cobre exatamente o que
 * listagens client-side precisam (sort/filter/pagination), sem o risco de
 * lidar com uma arquitetura experimental numa tarefa de UI de baixo risco.
 * Os dados já vêm inteiros do Supabase (sem paginação no servidor), então
 * ordenar/filtrar/paginar em memória é apropriado — não é o gargalo aqui. */
export function DataTable<TData extends RowData>({
  columns,
  data,
  searchPlaceholder = 'Buscar...',
  pageSize = 10,
  toolbarEnd,
}: {
  columns: DataTableColumn<TData>[]
  data: TData[]
  searchPlaceholder?: string
  pageSize?: number
  /** Conteúdo extra (ex.: botão "Novo X") alinhado à direita, na mesma linha da busca. */
  toolbarEnd?: React.ReactNode
}) {
  const table = useLegacyTable({
    data,
    columns,
    globalFilterFn: 'includesString',
    initialState: { pagination: { pageIndex: 0, pageSize } },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  const state = table.getState()
  const rows = table.getRowModel().rows
  const totalRows = table.getFilteredRowModel().rows.length
  const from = totalRows === 0 ? 0 : state.pagination.pageIndex * state.pagination.pageSize + 1
  const to = Math.min(totalRows, (state.pagination.pageIndex + 1) * state.pagination.pageSize)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            value={state.globalFilter ?? ''}
            onChange={(e) => table.setGlobalFilter(e.target.value)}
            placeholder={searchPlaceholder}
            className="pl-8"
          />
        </div>
        {toolbarEnd}
      </div>

      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                const sortable = header.column.getCanSort()
                const sorted = header.column.getIsSorted()
                return (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : sortable ? (
                      <button
                        type="button"
                        onClick={header.column.getToggleSortingHandler()}
                        className="hover:text-foreground -mx-2 flex items-center gap-1 rounded px-2 py-1 transition-colors"
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {sorted === 'asc' && <ArrowUp className="size-3.5" />}
                        {sorted === 'desc' && <ArrowDown className="size-3.5" />}
                        {!sorted && <ArrowUpDown className="text-muted-foreground/40 size-3.5" />}
                      </button>
                    ) : (
                      flexRender(header.column.columnDef.header, header.getContext())
                    )}
                  </TableHead>
                )
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {rows.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className="text-muted-foreground h-24 text-center text-sm"
              >
                Nenhum resultado para essa busca.
              </TableCell>
            </TableRow>
          )}
          {rows.map((row) => (
            <TableRow key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {totalRows > 0 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {from}–{to} de {totalRows}
          </span>
          {table.getPageCount() > 1 && (
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                aria-label="Página anterior"
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                aria-label="Próxima página"
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
