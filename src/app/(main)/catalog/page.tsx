import { Category, Difficulty } from '@prisma/client'
import PageShell from '@/shared/components/PageShell'
import { getMovesAction, CatalogFilters, MoveGrid } from '@/features/catalog'
import type { MoveFilters } from '@/shared/types'

type SearchParams = Promise<{
  category?: string
  difficulty?: string
  search?: string
}>

const validCategories = new Set<string>(Object.values(Category))
const validDifficulties = new Set<string>(Object.values(Difficulty))

export default async function CatalogPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams

  const filters: MoveFilters = {
    category: validCategories.has(params.category ?? '')
      ? (params.category as Category)
      : undefined,
    difficulty: validDifficulties.has(params.difficulty ?? '')
      ? (params.difficulty as Difficulty)
      : undefined,
    search: params.search || undefined,
  }

  const result = await getMovesAction({ ...filters, page: 1, pageSize: 12 })
  const initialHasMore = result.total > result.items.length

  return (
    <PageShell aside={<CatalogFilters filters={filters} />}>
      <MoveGrid
        key={JSON.stringify(filters)}
        initialMoves={result.items}
        initialHasMore={initialHasMore}
        filters={filters}
      />
    </PageShell>
  )
}
