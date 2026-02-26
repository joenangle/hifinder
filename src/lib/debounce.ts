/**
 * Minimal debounce utility to replace lodash/debounce.
 * Saves ~15-20KB from the client bundle.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFunction = (...args: any[]) => any

interface DebouncedFunction<T extends AnyFunction> {
  (...args: Parameters<T>): void
  cancel: () => void
}

export function debounce<T extends AnyFunction>(
  fn: T,
  delay: number
): DebouncedFunction<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  const debounced = (...args: Parameters<T>) => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId)
    }
    timeoutId = setTimeout(() => {
      timeoutId = null
      fn(...args)
    }, delay)
  }

  debounced.cancel = () => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId)
      timeoutId = null
    }
  }

  return debounced as DebouncedFunction<T>
}
