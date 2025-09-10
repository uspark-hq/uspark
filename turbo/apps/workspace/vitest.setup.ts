import '@testing-library/jest-dom/vitest'
import { afterEach, beforeEach, vi } from 'vitest'
import { setPathname, setSearch } from './src/signals/location'
import { resetLoggerForTest } from './src/signals/log'
import { clearAllDetached } from './src/signals/utils'

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
})

afterEach(() => {
  return clearAllDetached()
})
