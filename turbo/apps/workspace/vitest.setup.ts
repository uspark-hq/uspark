import '@testing-library/jest-dom/vitest'
import { afterEach, beforeAll, beforeEach, vi } from 'vitest'
import { setPathname, setSearch } from './src/signals/location'
import { resetLoggerForTest } from './src/signals/log'
import { resetMockAuth, setupMock } from './src/signals/test-utils'
import { clearAllDetached } from './src/signals/utils'

// Mock sonner globally
vi.mock<typeof import('sonner')>('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    loading: vi.fn(),
    promise: vi.fn(),
    custom: vi.fn(),
    message: vi.fn(),
    dismiss: vi.fn(),
  },
  Toaster: () => null,
}))

setupMock()

beforeAll(() => {
  process.env.VITE_CLERK_PUBLISHABLE_KEY = 'test_key'
})

beforeEach(() => {
  resetLoggerForTest()
  vi.spyOn(window.history, 'pushState').mockImplementation(
    (_state, _unused, url) => {
      const urlObj = new URL(url ?? '', 'http://localhost')
      setPathname(urlObj.pathname)
      setSearch(urlObj.search)
    },
  )
})

afterEach(() => {
  vi.restoreAllMocks()
  resetMockAuth()
})

afterEach(() => {
  return clearAllDetached()
})
