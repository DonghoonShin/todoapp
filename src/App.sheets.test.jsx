import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { loadApp } from '@/test/loadApp'

const SHEETS_URL = 'https://script.google.com/macros/s/fake/exec'

function jsonResponse(data) {
  return Promise.resolve({ ok: true, json: async () => data })
}

describe('App with VITE_SHEETS_API_URL configured', () => {
  it('T3: loads todos from the sheet on mount and displays them', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(() =>
        jsonResponse([{ id: '1', text: 'From Sheet', completed: false }])
      )
    )

    const App = await loadApp({ sheetsUrl: SHEETS_URL })
    render(<App />)

    expect(await screen.findByText('From Sheet')).toBeInTheDocument()
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(fetch).toHaveBeenCalledWith(SHEETS_URL)
  })

  it('T4: on GET failure, keeps local todos and shows an error message', async () => {
    localStorage.setItem(
      'todos',
      JSON.stringify([{ id: '1', text: '로컬 할일', completed: false }])
    )
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network error')))

    const App = await loadApp({ sheetsUrl: SHEETS_URL })
    render(<App />)

    expect(screen.getByText('로컬 할일')).toBeInTheDocument()
    expect(
      await screen.findByText(
        '구글 시트를 불러오지 못했습니다. 로컬 데이터를 표시합니다.'
      )
    ).toBeInTheDocument()
  })

  it('T2: adding a todo sends a POST with the correct shape', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(() => jsonResponse([])))

    const App = await loadApp({ sheetsUrl: SHEETS_URL })
    render(<App />)

    await screen.findByText('No todos yet — add one above.')

    const user = userEvent.setup()
    await user.type(screen.getByPlaceholderText('Add a new todo...'), 'Buy milk')
    await user.click(screen.getByRole('button', { name: 'Add' }))

    expect(await screen.findByText('Buy milk')).toBeInTheDocument()
    expect(fetch).toHaveBeenCalledTimes(2)

    const [url, options] = fetch.mock.calls[1]
    expect(url).toBe(SHEETS_URL)
    expect(options.method).toBe('POST')
    expect(options.headers).toEqual({ 'Content-Type': 'text/plain;charset=utf-8' })
    expect(JSON.parse(options.body)).toEqual({
      action: 'add',
      id: expect.any(String),
      text: 'Buy milk',
      completed: false,
    })
  })

  it('T5: toggling a todo sends {action:"toggle", id} and does not roll back on failure', async () => {
    const fetchMock = vi.fn()
    fetchMock.mockImplementationOnce(() =>
      jsonResponse([{ id: '1', text: 'Toggle me', completed: false }])
    )
    fetchMock.mockImplementationOnce(() => Promise.reject(new Error('boom')))
    vi.stubGlobal('fetch', fetchMock)

    const App = await loadApp({ sheetsUrl: SHEETS_URL })
    render(<App />)

    const checkbox = await screen.findByRole('checkbox')
    const user = userEvent.setup()
    await user.click(checkbox)

    expect(checkbox).toHaveAttribute('data-state', 'checked')
    expect(fetch).toHaveBeenCalledTimes(2)
    const [url, options] = fetch.mock.calls[1]
    expect(url).toBe(SHEETS_URL)
    expect(JSON.parse(options.body)).toEqual({ action: 'toggle', id: '1' })

    expect(
      await screen.findByText('구글 시트에 저장하지 못했습니다.')
    ).toBeInTheDocument()
    // optimistic toggle stays applied even though the sync failed
    expect(checkbox).toHaveAttribute('data-state', 'checked')
  })

  it('T6: deleting a todo sends {action:"delete", id} and removes it optimistically', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(() =>
        jsonResponse([{ id: '1', text: 'Delete me', completed: false }])
      )
    )

    const App = await loadApp({ sheetsUrl: SHEETS_URL })
    render(<App />)

    await screen.findByText('Delete me')
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Delete todo' }))

    expect(screen.queryByText('Delete me')).not.toBeInTheDocument()
    expect(fetch).toHaveBeenCalledTimes(2)
    const [url, options] = fetch.mock.calls[1]
    expect(url).toBe(SHEETS_URL)
    expect(JSON.parse(options.body)).toEqual({ action: 'delete', id: '1' })
  })
})
