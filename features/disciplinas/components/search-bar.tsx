'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { useDebouncedValue } from '@/utils/use-debounced-value'

interface SearchBarProps {
  /** Valor inicial vindo dos searchParams da URL (Server Component pai). */
  defaultValue?: string
  placeholder?: string
}

export function SearchBar({
  defaultValue = '',
  placeholder = 'Busque por nome ou código da disciplina (ex: MATA37)',
}: SearchBarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [term, setTerm] = useState(defaultValue)
  const debouncedTerm = useDebouncedValue(term, 300)

  // Evita que o useEffect dispare no mount e cause navegações abortadas.
  // Só sincroniza a URL após a primeira interação real do usuário.
  const hasMounted = useRef(false)

  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true
      return
    }

    const params = new URLSearchParams(searchParams.toString())
    const trimmed = debouncedTerm.trim()

    if (trimmed.length > 0) {
      params.set('q', trimmed)
    } else {
      params.delete('q')
    }

    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    // searchParams intencionalmente omitido: usar snapshot estável evita loop infinito.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedTerm, pathname, router])

  function handleClear() {
    setTerm('')
  }

  return (
    <form
      role="search"
      onSubmit={(event) => event.preventDefault()}
      className="w-full"
    >
      <label htmlFor="disciplina-search" className="sr-only">
        Buscar disciplina
      </label>
      <div className="group relative rounded-2xl border-2 border-border bg-background shadow-positivus transition-transform focus-within:translate-x-[2px] focus-within:translate-y-[2px] focus-within:shadow-none">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-5 top-1/2 size-5 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          id="disciplina-search"
          name="q"
          type="search"
          autoComplete="off"
          spellCheck={false}
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder={placeholder}
          className="h-14 border-0 bg-transparent pl-14 pr-12 text-base shadow-none focus-visible:ring-0"
        />
        {term.length > 0 && (
          <button
            type="button"
            onClick={handleClear}
            aria-label="Limpar busca"
            className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        )}
      </div>
    </form>
  )
}
