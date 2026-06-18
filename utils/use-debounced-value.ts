'use client'

import { useEffect, useState } from 'react'

/**
 * Retorna uma versão "atrasada" do valor, atualizada apenas após `delay` ms
 * sem mudanças. Útil para evitar excesso de chamadas ao banco na busca.
 */
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timeout)
  }, [value, delay])

  return debounced
}
