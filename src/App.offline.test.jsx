import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { loadApp } from '@/test/loadApp'

describe('App offline (no VITE_SHEETS_API_URL)', () => {
  it('shows localStorage todos and never calls fetch', async () => {
    localStorage.setItem(
      'todos',
      JSON.stringify([
        { id: '1', text: '우유 사기', completed: false },
        { id: '2', text: '청소하기', completed: true },
      ])
    )
    vi.stubGlobal('fetch', vi.fn())

    const App = await loadApp()
    render(<App />)

    expect(screen.getByText('우유 사기')).toBeInTheDocument()
    expect(screen.getByText('청소하기')).toBeInTheDocument()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('does not call fetch when adding a todo', async () => {
    vi.stubGlobal('fetch', vi.fn())
    const App = await loadApp()
    render(<App />)

    const user = userEvent.setup()
    await user.type(screen.getByPlaceholderText('Add a new todo...'), '운동하기')
    await user.click(screen.getByRole('button', { name: 'Add' }))

    expect(screen.getByText('운동하기')).toBeInTheDocument()
    expect(fetch).not.toHaveBeenCalled()
  })
})
