// Provide stub env values so server-only modules (Supabase, etc.) can be
// imported during tests without crashing at module load. Tests must not make
// real network calls — clients created with these stubs are inert.
process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'http://test.local'
process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'test-service-role-key'

import '@testing-library/jest-dom/vitest'

// Ensure localStorage is available in test environment
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = String(value) },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { store = {} },
    get length() { return Object.keys(store).length },
    key: (index: number) => Object.keys(store)[index] ?? null,
  }
})()

if (typeof globalThis.localStorage === 'undefined' || typeof globalThis.localStorage.clear !== 'function') {
  Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true })
}
