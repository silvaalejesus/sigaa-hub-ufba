'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import {
  Building2,
  Check,
  ChevronsUpDown,
  Search,
  UsersRound,
  X,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { useDebouncedValue } from '@/utils/use-debounced-value'

interface SearchBarProps {
  defaultValue?: string
  defaultDepartamento?: string
  defaultApenasComGrupos?: boolean
  departamentos?: string[]
  placeholder?: string
}

export function SearchBar({
  defaultValue = '',
  defaultDepartamento = '',
  defaultApenasComGrupos = false,
  departamentos = [],
  placeholder = 'Busque por nome ou código da disciplina (ex: MATA37)',
}: SearchBarProps) {
  const router = useRouter()
  const pathname = usePathname()

  const [term, setTerm] = useState(defaultValue)
  const [departamento, setDepartamento] = useState(defaultDepartamento)
  const [apenasComGrupos, setApenasComGrupos] = useState(
    defaultApenasComGrupos,
  )
  const [openDepartamento, setOpenDepartamento] = useState(false)
  const [departamentoSearch, setDepartamentoSearch] = useState('')

  const debouncedTerm = useDebouncedValue(term, 300)
  const hasMounted = useRef(false)

  const departamentosFiltrados = useMemo(() => {
    const search = departamentoSearch.trim().toLowerCase()

    if (!search) {
      return departamentos
    }

    return departamentos.filter((item) => item.toLowerCase().includes(search))
  }, [departamentoSearch, departamentos])

  function syncUrl(nextValues: {
    q?: string
    departamento?: string
    apenasComGrupos?: boolean
  }) {
    const params = new URLSearchParams()

    const nextQuery = nextValues.q ?? term
    const nextDepartamento = nextValues.departamento ?? departamento
    const nextApenasComGrupos = nextValues.apenasComGrupos ?? apenasComGrupos

    if (nextQuery.trim().length > 0) {
      params.set('q', nextQuery.trim())
    }

    if (nextDepartamento.trim().length > 0) {
      params.set('departamento', nextDepartamento.trim())
    }

    if (nextApenasComGrupos) {
      params.set('grupos', '1')
    }

    const queryString = params.toString()

    router.replace(queryString ? `${pathname}?${queryString}` : pathname, {
      scroll: false,
    })
  }

  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true
      return
    }

    syncUrl({ q: debouncedTerm })

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedTerm, pathname, router])

  function handleClear() {
    setTerm('')
    syncUrl({ q: '' })
  }

  function handleSelectDepartamento(nextDepartamento: string) {
    setDepartamento(nextDepartamento)
    setOpenDepartamento(false)
    setDepartamentoSearch('')
    syncUrl({ departamento: nextDepartamento })
  }

  function handleApenasComGruposChange(nextValue: boolean) {
    setApenasComGrupos(nextValue)
    syncUrl({ apenasComGrupos: nextValue })
  }

  return (
    <div className="rounded-3xl border bg-background/80 p-4 shadow-sm backdrop-blur">
      <div className="space-y-4">
        <form
          onSubmit={(event) => event.preventDefault()}
          className="relative w-full rounded-2xl border bg-background"
        >
          <label htmlFor="disciplina-search" className="sr-only">
            Buscar disciplina
          </label>

          <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />

          <Input
            id="disciplina-search"
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder={placeholder}
            className="h-12 border-0 bg-transparent pl-12 pr-12 text-base shadow-none focus-visible:ring-0"
          />

          {term.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Limpar busca"
              className="absolute right-2 top-1/2 -translate-y-1/2"
              onClick={handleClear}
            >
              <X className="size-4" />
            </Button>
          )}
        </form>

        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
          <Popover open={openDepartamento} onOpenChange={setOpenDepartamento}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className="h-auto min-h-12 justify-between gap-3 rounded-2xl px-4 py-3 text-left"
                aria-expanded={openDepartamento}
              >
                <span className="flex min-w-0 items-center gap-3">
                  <Building2 className="size-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0">
                    <span className="block text-xs text-muted-foreground">
                      Instituto/Departamento
                    </span>
                    <span className="block truncate text-sm font-medium">
                      {departamento || 'Todos'}
                    </span>
                  </span>
                </span>
                <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
              </Button>
            </PopoverTrigger>

            <PopoverContent className="w-[min(92vw,460px)] p-0" align="start">
              <Command>
                <CommandInput
                  value={departamentoSearch}
                  onValueChange={setDepartamentoSearch}
                  placeholder="Pesquisar instituto/departamento..."
                />

                <CommandList>
                  <CommandGroup>
                    <CommandItem
                      value=""
                      onSelect={() => handleSelectDepartamento('')}
                    >
                      <Check
                        className={cn(
                          'size-4',
                          departamento === '' ? 'opacity-100' : 'opacity-0',
                        )}
                      />
                      Todos os institutos/departamentos
                    </CommandItem>

                    {departamentosFiltrados.map((item) => (
                      <CommandItem
                        key={item}
                        value={item}
                        onSelect={() => handleSelectDepartamento(item)}
                      >
                        <Check
                          className={cn(
                            'size-4 shrink-0',
                            departamento === item ? 'opacity-100' : 'opacity-0',
                          )}
                        />
                        <span className="truncate">{item}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>

                  {departamentosFiltrados.length === 0 && (
                    <CommandEmpty>Nenhum departamento encontrado.</CommandEmpty>
                  )}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl border bg-background px-4 py-3 text-sm">
            <Checkbox
              checked={apenasComGrupos}
              onCheckedChange={handleApenasComGruposChange}
              aria-label="Filtrar apenas disciplinas com grupos disponíveis"
            />
            <UsersRound className="size-4 text-muted-foreground" />
            <span className="font-medium">Apenas com grupos disponíveis</span>
          </label>
        </div>
      </div>
    </div>
  )
}
