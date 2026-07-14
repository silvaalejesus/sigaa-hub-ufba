'use client'

import { Menu, X } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useId, useState } from 'react'

import { Button } from '@/components/ui/button'
import { SITE_NAVIGATION_ITEMS } from '@/components/site-navigation'

export function MobileNavigation() {
  const [open, setOpen] = useState(false)
  const menuId = useId()

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    if (!open) {
      return
    }

    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [open])

  return (
    <div className="lg:hidden">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={open ? 'Fechar menu de navegação' : 'Abrir menu de navegação'}
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((current) => !current)}
      >
        {open ? (
          <X className="size-5" aria-hidden="true" />
        ) : (
          <Menu className="size-5" aria-hidden="true" />
        )}
      </Button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Fechar menu de navegação"
            className="fixed inset-0 top-16 z-30 cursor-default bg-black/20 backdrop-blur-[1px]"
            onClick={() => setOpen(false)}
          />

          <nav
            id={menuId}
            aria-label="Navegação móvel"
            className="absolute inset-x-0 top-full z-40 border-b bg-background px-4 py-4 shadow-lg"
          >
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-1">
              {SITE_NAVIGATION_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex min-h-11 items-center rounded-xl px-4 py-3 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </nav>
        </>
      )}
    </div>
  )
}
