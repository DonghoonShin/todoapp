import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { loadApp } from '@/test/loadApp'

const SHEETS_URL = 'https://script.google.com/macros/s/fake/exec'

function jsonResponse(data) {
  return Promise.resolve({ ok: true, json: async () => data })
}

describe('App race condition: local mutation during in-flight initial GET', () => {
  it('T7: does not lose a todo added while the mount GET is still pending', async () => {
    let resolveGet
    const fetchMock = vi.fn()
    fetchMock.mockImplementationOnce(
      () => new Promise((resolve) => { resolveGet = resolve })
    )
    fetchMock.mockImplementation(() => jsonResponse({ ok: true }))
    vi.stubGlobal('fetch', fetchMock)

    const App = await loadApp({ sheetsUrl: SHEETS_URL })
    render(<App />)

    // GET is still in flight — user adds a todo before it resolves.
    const user = userEvent.setup()
    await user.type(screen.getByPlaceholderText('Add a new todo...'), 'Local add')
    await user.click(screen.getByRole('button', { name: 'Add' }))
    expect(screen.getByText('Local add')).toBeInTheDocument()

    // Stale server snapshot arrives — it doesn't know about "Local add" yet.
    resolveGet(await jsonResponse([{ id: 'server-1', text: 'From Sheet', completed: false }]))

    // Flush the resolved promise chain (no visible change is expected: the
    // stale snapshot must be discarded once a local mutation has happened).
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(screen.getByText('Local add')).toBeInTheDocument()
    expect(screen.queryByText('From Sheet')).not.toBeInTheDocument()
  })

  it('T8 (regression): with no local mutation, the fetched snapshot still replaces state', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(() =>
        jsonResponse([{ id: 'server-1', text: 'From Sheet', completed: false }])
      )
    )

    const App = await loadApp({ sheetsUrl: SHEETS_URL })
    render(<App />)

    expect(await screen.findByText('From Sheet')).toBeInTheDocument()
  })
})
