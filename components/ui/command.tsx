'use client'

import * as React from 'react'

import { cn } from '@/lib/utils'

function Command({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('overflow-hidden rounded-2xl bg-popover', className)} {...props} />
}

interface CommandInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  onValueChange?: (value: string) => void
}

function CommandInput({ className, onValueChange, ...props }: CommandInputProps) {
  return (
    <div className="border-b px-3">
      <input
        className={cn(
          'h-11 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground',
          className,
        )}
        onChange={(event) => onValueChange?.(event.target.value)}
        {...props}
      />
    </div>
  )
}

function CommandList({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('max-h-72 overflow-y-auto p-1', className)} {...props} />
}

function CommandGroup({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('space-y-1', className)} {...props} />
}

interface CommandItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value?: string
  onSelect?: (value: string) => void
}

function CommandItem({ className, value = '', onSelect, children, ...props }: CommandItemProps) {
  return (
    <button
      type="button"
      className={cn(
        'flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm hover:bg-muted disabled:pointer-events-none disabled:opacity-50',
        className,
      )}
      onClick={(event) => {
        props.onClick?.(event)
        onSelect?.(value)
      }}
      {...props}
    >
      {children}
    </button>
  )
}

function CommandEmpty({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('px-3 py-6 text-center text-sm text-muted-foreground', className)}
      {...props}
    />
  )
}

export {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
}
