export type BodyScrollLockState = {
  activeLocks: number
}

export function createBodyScrollLockState(): BodyScrollLockState {
  return { activeLocks: 0 }
}

export function acquireBodyScrollLock(state: BodyScrollLockState): boolean {
  state.activeLocks += 1
  return state.activeLocks === 1
}

export function releaseBodyScrollLock(state: BodyScrollLockState): boolean {
  state.activeLocks = Math.max(0, state.activeLocks - 1)
  return state.activeLocks === 0
}
