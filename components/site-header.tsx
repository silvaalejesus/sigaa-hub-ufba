import Link from 'next/link'
import { ArrowDown } from 'lucide-react'

import { Logo } from '@/components/logo'
import { ThemeToggle } from '@/components/theme-toggle'

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-3">
          <Logo />
          <span className="hidden text-sm font-medium text-muted-foreground sm:inline">
            UFBA · 2026.1
          </span>
        </Link>

        <nav className="flex items-center gap-2">
          <Link
            href="#footer"
            className="inline-flex h-9 items-center gap-2 rounded-full px-3 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            Rodapé
            <ArrowDown className="size-4" />
          </Link>

          <ThemeToggle />
        </nav>
      </div>
    </header>
  )
}
