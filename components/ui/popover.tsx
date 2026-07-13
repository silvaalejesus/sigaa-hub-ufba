'use client'

import * as React from 'react'

import { cn } from '@/lib/utils'

interface PopoverContextValue {
  open: boolean
  setOpen: (open: boolean) => void
}

const PopoverContext = React.createContext<PopoverContextValue | null>(null)

function usePopover() {
  const context = React.useContext(PopoverContext)

  if (!context) {
    throw new Error('Popover components must be used inside <Popover>.')
  }

  return context
}

interface PopoverProps {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}

function Popover({ open, defaultOpen = false, onOpenChange, children }: PopoverProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen)
  const isControlled = open !== undefined
  const currentOpen = isControlled ? Boolean(open) : uncontrolledOpen

  function setOpen(nextOpen: boolean) {
    if (!isControlled) {
      setUncontrolledOpen(nextOpen)
    }

    onOpenChange?.(nextOpen)
  }

  return (
    <PopoverContext.Provider value={{ open: currentOpen, setOpen }}>
      <div className="relative">{children}</div>
    </PopoverContext.Provider>
  )
}

interface PopoverTriggerProps {
  asChild?: boolean
  children: React.ReactElement
}

function PopoverTrigger({ asChild, children }: PopoverTriggerProps) {
  const { open, setOpen } = usePopover()

  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<any>

    return React.cloneElement(child, {
      onClick: (event: React.MouseEvent) => {
        if (typeof child.props.onClick === 'function') {
          child.props.onClick(event)
        }

        setOpen(!open)
      },
    })
  }

  return (
    <button type="button" onClick={() => setOpen(!open)}>
      {children}
    </button>
  )
}

interface PopoverContentProps extends React.HTMLAttributes<HTMLDivElement> {
  align?: 'start' | 'center' | 'end'
}

function PopoverContent({ className, align = 'center', ...props }: PopoverContentProps) {
  const { open } = usePopover()

  if (!open) {
    return null
  }

  return (
    <div
      className={cn(
        'absolute top-full z-50 mt-2 rounded-2xl border bg-popover text-popover-foreground shadow-xl',
        align === 'start' && 'left-0',
        align === 'center' && 'left-1/2 -translate-x-1/2',
        align === 'end' && 'right-0',
        className,
      )}
      {...props}
    />
  )
}

export { Popover, PopoverContent, PopoverTrigger }
