'use client'

import { useEffect, useState } from 'react'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { useDebouncedValue } from '@/utils/use-debounced-value'

interface SearchBarProps {
  /** Disparado com o termo já tratado pelo debounce (300ms). */
  onSearch?: (term: string) => void
  placeholder?: string
}

export function SearchBar({
  onSearch,
  placeholder = 'Busque por nome ou código da disciplina (ex: MATA37)',
}: SearchBarProps) {
  const [term, setTerm] = useState('')
  const debouncedTerm = useDebouncedValue(term, 300)

  useEffect(() => {
    // Ainda não integrado ao banco: apenas propaga o termo já debounced.
    onSearch?.(debouncedTerm.trim())
  }, [debouncedTerm, onSearch])

  return (
    <form
      role="search"
      onSubmit={(event) => event.preventDefault()}
      className="w-full"
    >
      <label htmlFor="disciplina-search" className="sr-only">
        Buscar disciplina
      </label>
      <div className="group relative rounded-2xl bg-background shadow-positivus transition-transform focus-within:translate-x-[2px] focus-within:translate-y-[2px] focus-within:shadow-none">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-5 top-1/2 size-5 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          id="disciplina-search"
          name="disciplina"
          type="search"
          autoComplete="off"
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder={placeholder}
          className="h-14 border-2 border-border pl-14 pr-4 text-base"
        />
      </div>
    </form>
  )
}
