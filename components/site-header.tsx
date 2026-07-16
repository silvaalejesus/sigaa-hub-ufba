import Link from "next/link";

import { Logo } from "@/components/logo";
import { MobileNavigation } from "@/components/mobile-navigation";
import { SITE_NAVIGATION_ITEMS } from "@/components/site-navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { CURRENT_SEMESTER } from "@/lib/semester";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4">
        <Link
          href="/"
          className="flex min-w-0 shrink items-center gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Logo />

          <span className="hidden shrink-0 text-sm font-medium text-muted-foreground xl:inline">
            UFBA · {CURRENT_SEMESTER}
          </span>
        </Link>
        <div className="flex shrink-0 items-center gap-1">
          <nav
            aria-label="Navegação principal"
            className="hidden items-center gap-1 lg:flex"
          >
            {SITE_NAVIGATION_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="inline-flex h-9 items-center rounded-full px-3 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <ThemeToggle />
          <MobileNavigation />
        </div>
      </div>
    </header>
  );
}
