import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import ComponentForm from '../ComponentForm'

let component: Record<string, unknown>

const speaker = {
  brand: 'KEF',
  name: 'LS50 Meta',
  category: 'speakers',
  price_new: 1500,
  crin_rank: 'A-',
  needs_amp: null,
}

let putBodies: Array<Record<string, unknown>>

beforeEach(() => {
  component = { ...speaker }
  putBodies = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      if (init?.method === 'PUT') {
        putBodies.push(JSON.parse(init.body as string))
        return new Response(JSON.stringify({ message: 'Saved' }), { status: 200 })
      }
      if (String(url).includes('check-duplicate')) {
        return new Response(JSON.stringify({ isDuplicate: false }), { status: 200 })
      }
      return new Response(JSON.stringify({ component }), { status: 200 })
    })
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
})

async function renderLoaded() {
  const view = render(<ComponentForm editComponentId="abc" />)
  await waitFor(() => expect(screen.getByDisplayValue('LS50 Meta')).toBeTruthy())
  return view
}

async function save(container: HTMLElement) {
  fireEvent.submit(container.querySelector('form') as HTMLFormElement)
  await waitFor(() => expect(putBodies).toHaveLength(1))
  return putBodies[0]
}

describe('ComponentForm in edit mode', () => {
  it('keeps a speaker category instead of blanking the select', async () => {
    const { container } = await renderLoaded()

    expect(container.querySelector<HTMLSelectElement>('#category')?.value).toBe('speakers')
    expect((await save(container)).category).toBe('speakers')
  })

  it('sends a letter-grade rank back unchanged', async () => {
    const { container } = await renderLoaded()

    expect((await save(container)).crin_rank).toBe('A-')
  })

  it('saves an unpriced speaker', async () => {
    component = { ...speaker, price_new: null }
    const { container } = await renderLoaded()

    expect((await save(container)).category).toBe('speakers')
  })

  it('only offers sound signatures the database accepts', async () => {
    const { container } = await renderLoaded()
    const offered = [...container.querySelectorAll('option')].map((o) => o.value)

    expect(offered).not.toContain('v-shaped')
    expect(offered).not.toContain('dark')
  })
})
