// Owner: Unassigned@paraflow.com
import { command } from 'ccstate'
import { describe, expect, it, vi } from 'vitest'
import { mockLocation } from '../location'
import {
  initRoutes$,
  navigate$,
  pathname$,
  pathParams$,
  searchParams$,
  updateSearchParams$,
} from '../route'
import { testContext } from './context'

const context = testContext()

describe('route', () => {
  describe('searchParams$', () => {
    it('should return current URL search parameters', () => {
      const { store, signal } = context
      mockLocation(
        { pathname: '/test-path', search: '?key=value&test=123' },
        signal,
      )

      const params = store.get(searchParams$)
      expect(params.get('key')).toBe('value')
      expect(params.get('test')).toBe('123')
    })

    it('should return empty URLSearchParams when URL has no search parameters', () => {
      const { store, signal } = context
      mockLocation({ pathname: '/test-path', search: '' }, signal)

      const params = store.get(searchParams$)
      expect([...params.entries()]).toHaveLength(0)
    })
  })

  describe('updateSearchParams$', () => {
    it('should update URL search parameters', () => {
      const { store } = context

      mockLocation({ pathname: '/test-path', search: '' }, context.signal)
      const params = new URLSearchParams()
      params.set('foo', 'bar')
      params.set('id', '123')

      store.set(updateSearchParams$, params)

      expect(store.get(pathname$)).toBe('/test-path')
    })
  })

  describe('navigate$', () => {
    it('should navigate to new path', async () => {
      const { store, signal } = context

      const mockSetup = vi.fn()

      // Initialize routes
      await store.set(
        initRoutes$,
        [
          {
            path: '/',
            setup: command(() => void 0),
          },
          {
            path: '/home',
            setup: command(() => {
              mockSetup()
            }),
          },
        ],
        signal,
      )

      // Navigate to /home
      await store.set(navigate$, '/home', {}, signal)

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(window.history.pushState).toHaveBeenCalledWith({}, '', '/home')
      expect(store.get(pathname$)).toBe('/home')
      expect(mockSetup).toHaveBeenCalledWith()
    })

    it('should throw error when navigating to non-existent route', async () => {
      const { store, signal } = context
      const mockSetup$ = command(() => void 0)

      // Initialize routes
      await store.set(
        initRoutes$,
        [
          {
            path: '/',
            setup: command(() => void 0),
          },
          { path: '/home', setup: mockSetup$ },
        ],
        signal,
      )

      // Navigate to non-existent path
      await expect(
        store.set(navigate$, '/non-existent', {}, signal),
      ).rejects.toThrow('No route matches')
    })

    it('should navigate to new path and update search parameters', async () => {
      const { store, signal } = context

      const mockSetup = vi.fn()

      // Initialize routes
      await store.set(
        initRoutes$,
        [
          {
            path: '/',
            setup: command(() => void 0),
          },
          {
            path: '/home',
            setup: command(() => {
              mockSetup()
            }),
          },
        ],
        signal,
      )

      // Navigate to /home
      await store.set(
        navigate$,
        '/home',
        { searchParams: new URLSearchParams('foo=bar') },
        signal,
      )

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(window.history.pushState).toHaveBeenCalledWith(
        {},
        '',
        '/home?foo=bar',
      )
      expect(store.get(pathname$)).toBe('/home')
      expect(store.get(searchParams$)).toStrictEqual(
        new URLSearchParams('foo=bar'),
      )
      expect(mockSetup).toHaveBeenCalledWith()
    })
  })

  describe('initRoutes$', () => {
    it('should initialize routes and execute setup function of matching route', async () => {
      const { store, signal } = context
      const trace = vi.fn()

      mockLocation({ pathname: '/dashboard', search: '' }, signal)
      let calledSignal: AbortSignal | undefined

      await store.set(
        initRoutes$,
        [
          { path: '/', setup: command(() => void 0) },
          {
            path: '/dashboard',
            setup: command((_, signal: AbortSignal) => {
              trace(signal)
              calledSignal = signal
            }),
          },
          { path: '/settings', setup: command(() => void 0) },
        ],
        signal,
      )

      expect(trace).toHaveBeenCalledWith(expect.any(AbortSignal))
      expect(calledSignal).instanceOf(AbortSignal)
      expect(calledSignal?.aborted).toBeFalsy()

      mockLocation({ pathname: '/settings', search: '' }, signal)
      window.dispatchEvent(new PopStateEvent('popstate'))

      expect(calledSignal?.aborted).toBeTruthy()
    })

    it('should initialize parameterized routes', async () => {
      const { store, signal } = context
      mockLocation({ pathname: '/dashboard/1/edit', search: '' }, signal)

      const trace = vi.fn()

      await store.set(
        initRoutes$,
        [
          {
            path: '/dashboard/:id/edit',
            setup: command((_, signal: AbortSignal) => {
              trace(signal)
              return Promise.resolve()
            }),
          },
        ],
        signal,
      )

      expect(trace).toHaveBeenCalledWith(expect.any(AbortSignal))
      expect(store.get(pathParams$)).toHaveProperty('id', '1')
    })

    it('should navigate to root path when current path has no matching route', async () => {
      const { store, signal } = context
      const trace = vi.fn()

      mockLocation({ pathname: '/non-existent', search: '' }, signal)

      await store.set(
        initRoutes$,
        [
          {
            path: '/',
            setup: command(() => {
              trace()
              return Promise.resolve()
            }),
          },
          { path: '/dashboard', setup: command(() => void 0) },
        ],
        signal,
      )

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(window.history.pushState).toHaveBeenCalledWith({}, '', '/')
      expect(store.get(pathname$)).toBe('/')
      expect(trace).toHaveBeenCalledWith()
    })

    it('should handle popstate events', async () => {
      const { store, signal } = context
      const traceDashboard = vi.fn()
      const traceSettings = vi.fn()

      mockLocation({ pathname: '/dashboard', search: '' }, signal)

      await store.set(
        initRoutes$,
        [
          { path: '/', setup: command(() => void 0) },
          {
            path: '/dashboard',
            setup: command(() => {
              traceDashboard()
              return Promise.resolve()
            }),
          },
          {
            path: '/settings',
            setup: command(() => {
              traceSettings()
              return Promise.resolve()
            }),
          },
        ],
        signal,
      )

      expect(traceDashboard).toHaveBeenCalledTimes(1)
      expect(traceSettings).toHaveBeenCalledTimes(0)

      // Simulate browser history navigation
      mockLocation({ pathname: '/settings', search: '' }, signal)
      window.dispatchEvent(new PopStateEvent('popstate'))

      await vi.waitFor(() => {
        expect(traceSettings).toHaveBeenCalledTimes(1)
      })
    })
  })
})
