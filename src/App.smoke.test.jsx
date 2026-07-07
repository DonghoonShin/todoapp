import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'

import { loadApp } from '@/test/loadApp'

describe('App smoke test', () => {
  it('renders the Todo heading', async () => {
    const App = await loadApp()
    render(<App />)
    expect(screen.getByText('Todo')).toBeInTheDocument()
  })
})
