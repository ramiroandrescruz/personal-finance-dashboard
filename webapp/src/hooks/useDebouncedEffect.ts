import { type DependencyList, useEffect } from 'react'

export const useDebouncedEffect = (effect: () => void, delayMs: number, deps: DependencyList): void => {
  useEffect(() => {
    const timeout = window.setTimeout(effect, delayMs)
    return () => window.clearTimeout(timeout)
  }, [delayMs, ...deps])
}
