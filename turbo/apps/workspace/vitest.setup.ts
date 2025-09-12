import '@testing-library/jest-dom/vitest'
import { afterEach, beforeAll, beforeEach, vi } from 'vitest'
import { setPathname, setSearch } from './src/signals/location'
import { resetLoggerForTest } from './src/signals/log'
import { resetMockAuth, setupMock } from './src/signals/test-utils'
import { clearAllDetached } from './src/signals/utils'

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
