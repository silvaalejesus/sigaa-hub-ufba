import Link from 'next/link'

import { Logo } from '@/components/logo'
import { ThemeToggle } from '@/components/theme-toggle'

const navigationItems = [
  {
    label: 'Links úteis',
    compactLabel: 'Links',
    href: '#links-uteis',
  },
  {
    label: 'Sobre',
    compactLabel: 'Sobre',
    href: '#sobre',
  },
  {
    label: 'Feedback e sugestões',
    compactLabel: 'Feedback',
    href: '#feedback',
  },
] as const

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-2 px-4">
        <Link href="/" className="flex shrink-0 items-center gap-3">
          <Logo />
          <span className="hidden text-sm font-medium text-muted-foreground xl:inline">
            UFBA · 2026.1
          </span>
        </Link>

        <nav
          aria-label="Navegação da página"
          className="flex min-w-0 items-center gap-1"
        >
          {navigationItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              className="inline-flex h-9 shrink-0 items-center rounded-full px-2 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:px-3 sm:text-sm"
            >
              <span className="hidden lg:inline">{item.label}</span>
              <span aria-hidden="true" className="lg:hidden">
                {item.compactLabel}
              </span>
            </Link>
          ))}

          <ThemeToggle />
        </nav>
      </div>
    </header>
  )
}
