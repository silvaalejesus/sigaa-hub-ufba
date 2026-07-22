'use client'

import { useEffect } from 'react'

import {
  acquireBodyScrollLock,
  createBodyScrollLockState,
  releaseBodyScrollLock,
} from '@/lib/hooks/body-scroll-lock-state'

const lockState = createBodyScrollLockState()

interface StyleSnapshot {
  bodyOverflow: string
  bodyPosition: string
  bodyTop: string
  bodyLeft: string
  bodyRight: string
  bodyWidth: string
  bodyPaddingRight: string
  htmlOverflow: string
  htmlOverscrollBehavior: string
  scrollX: number
  scrollY: number
}

let snapshot: StyleSnapshot | null = null

function lockBody(): void {
  const body = document.body
  const html = document.documentElement
  const computedPaddingRight = Number.parseFloat(
    window.getComputedStyle(body).paddingRight,
  )
  const scrollbarWidth = Math.max(0, window.innerWidth - html.clientWidth)

  snapshot = {
    bodyOverflow: body.style.overflow,
    bodyPosition: body.style.position,
    bodyTop: body.style.top,
    bodyLeft: body.style.left,
    bodyRight: body.style.right,
    bodyWidth: body.style.width,
    bodyPaddingRight: body.style.paddingRight,
    htmlOverflow: html.style.overflow,
    htmlOverscrollBehavior: html.style.overscrollBehavior,
    scrollX: window.scrollX,
    scrollY: window.scrollY,
  }

  html.style.overflow = 'hidden'
  html.style.overscrollBehavior = 'none'
  body.style.overflow = 'hidden'
  body.style.position = 'fixed'
  body.style.top = `-${snapshot.scrollY}px`
  body.style.left = `-${snapshot.scrollX}px`
  body.style.right = '0'
  body.style.width = '100%'

  if (scrollbarWidth > 0) {
    body.style.paddingRight = `${computedPaddingRight + scrollbarWidth}px`
  }
}

function unlockBody(): void {
  if (!snapshot) return

  const body = document.body
  const html = document.documentElement
  const previous = snapshot
  snapshot = null

  body.style.overflow = previous.bodyOverflow
  body.style.position = previous.bodyPosition
  body.style.top = previous.bodyTop
  body.style.left = previous.bodyLeft
  body.style.right = previous.bodyRight
  body.style.width = previous.bodyWidth
  body.style.paddingRight = previous.bodyPaddingRight
  html.style.overflow = previous.htmlOverflow
  html.style.overscrollBehavior = previous.htmlOverscrollBehavior
  window.scrollTo(previous.scrollX, previous.scrollY)
}

function hasNativeModalScrollLock(): boolean {
  const bodyStyle = window.getComputedStyle(document.body)
  const htmlStyle = window.getComputedStyle(document.documentElement)
  const lockedOverflow = new Set(['hidden', 'clip'])

  return (
    document.body.style.position === 'fixed' ||
    lockedOverflow.has(bodyStyle.overflow) ||
    lockedOverflow.has(bodyStyle.overflowY) ||
    lockedOverflow.has(htmlStyle.overflow) ||
    lockedOverflow.has(htmlStyle.overflowY)
  )
}

export function useBodyScrollLock(enabled: boolean): void {
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return

    let released = false
    let acquiredFallback = false
    let firstFrame = 0
    let secondFrame = 0

    const acquireFallback = () => {
      if (released || acquiredFallback) return
      acquiredFallback = true
      if (acquireBodyScrollLock(lockState)) lockBody()
    }

    // Quando outro overlay já usa o fallback, este overlay entra no contador
    // imediatamente. Caso contrário, Base UI recebe dois frames para aplicar o
    // scroll lock modal nativo antes de ativarmos a estratégia iOS.
    if (snapshot) {
      acquireFallback()
    } else {
      firstFrame = window.requestAnimationFrame(() => {
        secondFrame = window.requestAnimationFrame(() => {
          if (!hasNativeModalScrollLock()) acquireFallback()
        })
      })
    }

    return () => {
      if (released) return
      released = true
      window.cancelAnimationFrame(firstFrame)
      window.cancelAnimationFrame(secondFrame)
      if (acquiredFallback && releaseBodyScrollLock(lockState)) unlockBody()
    }
  }, [enabled])
}
