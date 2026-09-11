import { useEffect, useId, useRef, useState } from 'react'
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
 * Para listagens remotas, a busca é atrasada brevemente para não gerar uma
 * consulta ao Supabase a cada tecla digitada. */
export function DataTable<TData extends RowData>({
  columns,
  data,
  searchPlaceholder = 'Buscar...',
  pageSize = 10,
  toolbarEnd,
  ariaLabel = 'Tabela de resultados',
  remote,
}: {
  columns: DataTableColumn<TData>[]
  data: TData[]
  searchPlaceholder?: string
  pageSize?: number
  /** Conteúdo extra (ex.: botão "Novo X") alinhado à direita, na mesma linha da busca. */
  toolbarEnd?: React.ReactNode
  /** Nome anunciado por leitor de tela para diferenciar tabelas na página. */
  ariaLabel?: string
  /** Quando os dados já vêm paginados do servidor, evita filtrar/ordenar só
   * a página visível e delega busca/navegação ao pai. */
  remote?: {
    pageIndex: number
    totalRows: number
    search: string
    onPageChange: (page: number) => void
    onSearchChange: (search: string) => void
  }
}) {
  const [remoteSearchInput, setRemoteSearchInput] = useState(remote?.search ?? '')
  const searchTimeout = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(searchTimeout.current), [])

  function changeSearch(value: string) {
    if (!remote) {
      table.setGlobalFilter(value)
      return
    }

    setRemoteSearchInput(value)
    window.clearTimeout(searchTimeout.current)
    searchTimeout.current = window.setTimeout(() => remote.onSearchChange(value), 300)
  }

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
  const rows = remote ? table.getCoreRowModel().rows : table.getRowModel().rows
  const totalRows = remote ? remote.totalRows : table.getFilteredRowModel().rows.length
  const pageIndex = remote?.pageIndex ?? state.pagination.pageIndex
  const from = totalRows === 0 ? 0 : pageIndex * state.pagination.pageSize + 1
  const to = remote ? Math.min(totalRows, from + rows.length - 1) : Math.min(totalRows, (pageIndex + 1) * state.pagination.pageSize)
  const searchId = useId()

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        {/* Chrome/Edge ignoram autocomplete="off" sozinho quando acham (por
         * heurística) que um campo é de login — SPA sem reload de verdade
         * entre a tela de login e a autenticada agrava isso. form próprio +
         * autoComplete="off" nos dois níveis + name/id estáveis (não
         * "search" genérico) + data-1p-ignore/data-lpignore (gerenciadores
         * de senha de extensão) é a combinação que de fato segura. */}
        <form
          autoComplete="off"
          onSubmit={(e) => e.preventDefault()}
          role="search"
          aria-label={`Buscar em ${ariaLabel}`}
          className="relative max-w-sm flex-1"
        >
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            type="search"
            id={searchId}
            name={`table-filter-${searchId}`}
            autoComplete="off"
            data-1p-ignore
            data-lpignore="true"
            value={remote ? remoteSearchInput : state.globalFilter ?? ''}
            onChange={(e) => changeSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="pl-8"
          />
        </form>
        {toolbarEnd}
      </div>

      <div className="overflow-x-auto rounded-md">
      <Table>
        <caption className="sr-only">{ariaLabel}</caption>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                const sortable = !remote && header.column.getCanSort()
                const sorted = header.column.getIsSorted()
                return (
                  <TableHead
                    key={header.id}
                    scope="col"
                    aria-sort={sorted === 'asc' ? 'ascending' : sorted === 'desc' ? 'descending' : 'none'}
                  >
                    {header.isPlaceholder ? null : sortable ? (
                      <button
                        type="button"
                        onClick={header.column.getToggleSortingHandler()}
                        aria-label={`Ordenar por ${String(header.column.columnDef.header)}`}
                        className="hover:text-foreground focus-visible:ring-ring -mx-2 flex items-center gap-1 rounded px-2 py-1 transition-colors focus-visible:ring-2"
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
      </div>

      {totalRows > 0 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {from}–{to} de {totalRows}
          </span>
          {(remote ? totalRows > state.pagination.pageSize : table.getPageCount() > 1) && (
            <nav className="flex items-center gap-1" aria-label={`Paginação de ${ariaLabel}`}>
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => remote ? remote.onPageChange(pageIndex - 1) : table.previousPage()}
                disabled={remote ? pageIndex === 0 : !table.getCanPreviousPage()}
                aria-label="Página anterior"
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => remote ? remote.onPageChange(pageIndex + 1) : table.nextPage()}
                disabled={remote ? to >= totalRows : !table.getCanNextPage()}
                aria-label="Próxima página"
              >
                <ChevronRight className="size-4" />
              </Button>
            </nav>
          )}
        </div>
      )}
    </div>
  )
}
