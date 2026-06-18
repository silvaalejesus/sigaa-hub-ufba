import { cn } from '@/lib/utils'

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('flex items-center gap-2', className)}>
      <span
        aria-hidden="true"
        className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground"
      >
        <svg
          viewBox="0 0 24 24"
          className="size-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 4h18l-3 7 3 7H3l3-7z" />
        </svg>
      </span>
      <span className="text-xl font-bold tracking-tight text-foreground">
        SIGAA Hub
      </span>
    </span>
  )
}
