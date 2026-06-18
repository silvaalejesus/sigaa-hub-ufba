import Link from 'next/link'
import { Logo } from '@/components/logo'
import { ThemeToggle } from '@/components/theme-toggle'

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b-2 border-border bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-20 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          href="/"
          className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <Logo />
        </Link>

        <nav className="flex items-center gap-3">
          <span className="hidden rounded-full bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground sm:inline-block">
            UFBA · 2026.1
          </span>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  )
}
