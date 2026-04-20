'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Category, Difficulty } from '@prisma/client'
import type { MoveFilters } from '../types'

const CATEGORIES = Object.values(Category)
const DIFFICULTIES = Object.values(Difficulty)

interface CatalogFiltersProps {
  filters: MoveFilters
}

export default function CatalogFilters({ filters }: CatalogFiltersProps) {
  const router = useRouter()
  const [searchValue, setSearchValue] = useState(filters.search ?? '')

  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams()
      if (filters.category) params.set('category', filters.category)
      if (filters.difficulty) params.set('difficulty', filters.difficulty)
      if (searchValue) params.set('search', searchValue)
      const query = params.toString()
      router.replace(`/catalog${query ? `?${query}` : ''}`)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchValue]) // eslint-disable-line react-hooks/exhaustive-deps

  const isActive = !!filters.category || !!filters.difficulty || !!filters.search

  return (
    <div className="p-4 flex flex-col gap-4">
      <input
        type="text"
        aria-label="Search moves"
        placeholder="Search moves..."
        value={searchValue}
        onChange={e => setSearchValue(e.target.value)}
        className="w-full bg-surface-high rounded-lg px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant"
      />

      <nav className="flex flex-col gap-1">
        {CATEGORIES.map(category => (
          <div key={category}>
            <button
              type="button"
              onClick={() => router.replace(`/catalog?category=${category}`)}
              className={`w-full text-left py-1.5 text-sm font-semibold font-sans ${
                filters.category === category ? 'text-primary' : 'text-on-surface'
              }`}
            >
              {category}
            </button>
            <div className="pl-4 flex flex-col">
              {DIFFICULTIES.map(difficulty => (
                <button
                  key={difficulty}
                  type="button"
                  onClick={() =>
                    router.replace(`/catalog?category=${category}&difficulty=${difficulty}`)
                  }
                  className={`text-left py-1 text-sm ${
                    filters.category === category && filters.difficulty === difficulty
                      ? 'text-primary'
                      : 'text-on-surface-variant'
                  }`}
                >
                  {difficulty}
                </button>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {isActive && (
        <button
          type="button"
          onClick={() => router.replace('/catalog')}
          className="text-sm text-on-surface-variant underline text-left"
        >
          Clear filters
        </button>
      )}
    </div>
  )
}
