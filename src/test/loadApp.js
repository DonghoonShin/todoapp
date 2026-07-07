import { vi } from 'vitest'

export async function loadApp({ sheetsUrl = '' } = {}) {
  vi.resetModules()
  vi.stubEnv('VITE_SHEETS_API_URL', sheetsUrl)
  const { default: App } = await import('@/App.jsx')
  return App
}
