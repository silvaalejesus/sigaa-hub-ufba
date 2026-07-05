'use client'

import * as React from 'react'
import { Check } from 'lucide-react'

import { cn } from '@/lib/utils'

interface CheckboxProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
}

function Checkbox({
  className,
  checked = false,
  onCheckedChange,
  ...props
}: CheckboxProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      data-state={checked ? 'checked' : 'unchecked'}
      className={cn(
        'flex size-5 shrink-0 items-center justify-center rounded-md border border-input bg-background text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
        checked && 'border-primary bg-primary text-primary-foreground',
        className,
      )}
      onClick={(event) => {
        props.onClick?.(event)
        onCheckedChange?.(!checked)
      }}
      {...props}
    >
      {checked && <Check className="size-3.5" />}
    </button>
  )
}

export { Checkbox }
