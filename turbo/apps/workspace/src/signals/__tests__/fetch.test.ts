import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import { clerk$ } from '../auth'
import { fetch$ } from '../fetch'
import { setOrigin } from '../location'
import { getMockClerk, resetMockAuth, setupMock } from '../test-utils'
import { testContext } from './context'

// Setup Clerk mock
setupMock()

const context = testContext()
const TEST_API_BASE = 'http://localhost:3005'

beforeAll(() => {
  setOrigin(TEST_API_BASE)
})

function getLastRequestHeaders(
  traceFetch: ReturnType<typeof vi.fn>,
): Record<string, string> {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const [, init] = traceFetch.mock.calls[traceFetch.mock.calls.length - 1]
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  return init.headers as Record<string, string>
}

describe('fetch$ signal integration tests', () => {
  let traceFetch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks() // Clear all mocks to prevent state leakage
    // Mock 全局 fetch 方法
    traceFetch = vi.fn().mockResolvedValue(new Response(null, { status: 200 }))
    vi.stubGlobal('fetch', traceFetch)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    resetMockAuth()
  })

  describe('headers 处理', () => {
    it('应该正确处理传入的 headers (Headers 对象)', async () => {
      const fch = context.store.get(fetch$)
      const inputHeaders = new Headers({
        'Content-Type': 'application/json',
        'X-Custom': 'custom-value',
      })

      await fch('/test', {
        headers: inputHeaders,
      })

      const headers = getLastRequestHeaders(traceFetch)
      expect(headers['Content-Type']).toBe('application/json')
      expect(headers['X-Custom']).toBe('custom-value')
    })

    it('应该在有 session token 时添加 Authorization header', async () => {
      // Setup mock session with token
      const mockToken = 'test-jwt-token'
      const getTokenSpy = vi.fn().mockResolvedValue(mockToken)

      // Get the clerk$ signal to initialize MockClerk
      await context.store.get(clerk$)

      // Now get and configure the mock instance
      const mockClerk = getMockClerk()
      expect(mockClerk).toBeTruthy()

      if (mockClerk) {
        mockClerk.setUser({ id: 'user-123' })
        mockClerk.setSession({
          getToken: getTokenSpy,
        })
      }

      const fch = context.store.get(fetch$)
      await fch('/test')

      expect(traceFetch).toHaveBeenCalledWith(
        expect.stringContaining('/test'),
        expect.any(Object),
      )
      expect(getTokenSpy).toHaveBeenCalledWith()

      const headers = getLastRequestHeaders(traceFetch)
      expect(headers.Authorization).toBe(`Bearer ${mockToken}`)
    })

    it('应该在没有 session 时不添加 Authorization header', async () => {
      // Get the clerk$ signal to initialize MockClerk
      await context.store.get(clerk$)

      // MockClerk starts with null session by default
      const mockClerk = getMockClerk()
      expect(mockClerk).toBeTruthy()
      expect(mockClerk?.session).toBeNull()

      const fch = context.store.get(fetch$)
      await fch('/test')

      const headers = getLastRequestHeaders(traceFetch)
      expect(headers.Authorization).toBeUndefined()
    })

    it('应该同时处理 Authorization header 和用户传入的 headers', async () => {
      // Setup mock session with token
      const mockToken = 'test-jwt-token'
      const getTokenSpy = vi.fn().mockResolvedValue(mockToken)

      // Get the clerk$ signal to initialize MockClerk
      await context.store.get(clerk$)

      // Configure the mock instance
      const mockClerk = getMockClerk()
      if (mockClerk) {
        mockClerk.setUser({ id: 'user-123' })
        mockClerk.setSession({
          getToken: getTokenSpy,
        })
      }

      const fch = context.store.get(fetch$)
      const inputHeaders = {
        'Content-Type': 'application/json',
        'X-Custom': 'custom-value',
      }

      await fch('/test', {
        headers: inputHeaders,
      })

      const headers = getLastRequestHeaders(traceFetch)
      expect(headers.Authorization).toBe(`Bearer ${mockToken}`)
      expect(headers['Content-Type']).toBe('application/json')
      expect(headers['X-Custom']).toBe('custom-value')
    })

    it('用户传入的 Authorization header 应该覆盖自动添加的', async () => {
      // Setup mock session with token
      const mockToken = 'test-jwt-token'
      const getTokenSpy = vi.fn().mockResolvedValue(mockToken)

      // Get the clerk$ signal to initialize MockClerk
      await context.store.get(clerk$)

      // Configure the mock instance
      const mockClerk = getMockClerk()
      if (mockClerk) {
        mockClerk.setUser({ id: 'user-123' })
        mockClerk.setSession({
          getToken: getTokenSpy,
        })
      }

      const fch = context.store.get(fetch$)
      const customToken = 'custom-override-token'

      await fch('/test', {
        headers: {
          Authorization: `Bearer ${customToken}`,
        },
      })

      const headers = getLastRequestHeaders(traceFetch)
      // User-provided header should override the automatic one
      expect(headers.Authorization).toBe(`Bearer ${customToken}`)
    })
  })

  describe('url 处理', () => {
    it('应该为相对路径拼接 apiBase', async () => {
      const fch = context.store.get(fetch$)

      await fch('/users')

      expect(traceFetch).toHaveBeenCalledWith(
        `${TEST_API_BASE}/users`,
        expect.any(Object),
      )
    })

    it('应该为不带斜杠的相对路径拼接 apiBase', async () => {
      const fch = context.store.get(fetch$)

      await fch('users')

      expect(traceFetch).toHaveBeenCalledWith(
        `${TEST_API_BASE}/users`,
        expect.any(Object),
      )
    })

    it('应该保持绝对 URL 不变', async () => {
      const fch = context.store.get(fetch$)
      const absoluteUrl = 'https://external-api.com/data'

      await fch(absoluteUrl)

      expect(traceFetch).toHaveBeenCalledWith(absoluteUrl, expect.any(Object))
    })

    it('应该正确处理 URL 对象（相对路径）', async () => {
      const fch = context.store.get(fetch$)

      // 创建一个只有 pathname 的 URL 对象
      const url = new URL('/api/users?page=1', 'http://localhost')
      // 清除 host 信息模拟相对 URL
      Object.defineProperty(url, 'host', { value: '' })

      await fch(url)

      expect(traceFetch).toHaveBeenCalledWith(
        expect.any(URL),
        expect.any(Object),
      )

      const [finalUrl] = traceFetch.mock.calls[0] as [URL, RequestInit]
      expect(finalUrl.toString()).toBe(`${TEST_API_BASE}/api/users?page=1`)
    })
  })

  describe('其他 fetch 参数', () => {
    it('应该保持其他 RequestInit 参数不变', async () => {
      const fch = context.store.get(fetch$)

      await fch('/test', {
        method: 'POST',
        body: JSON.stringify({ data: 'test' }),
        mode: 'cors',
        credentials: 'include',
      })

      const [, init] = traceFetch.mock.calls[0] as [string, RequestInit]
      expect(init.method).toBe('POST')
      expect(init.body).toBe('{"data":"test"}')
      expect(init.mode).toBe('cors')
      expect(init.credentials).toBe('include')
      // fch no longer adds default Content-Type header
    })

    it('url 应该正确处理查询参数', async () => {
      const fch = context.store.get(fetch$)

      await fch('/api/users?page=1&size=10')

      expect(traceFetch).toHaveBeenCalledWith(
        `${TEST_API_BASE}/api/users?page=1&size=10`,
        expect.any(Object),
      )
    })

    it('should handle request object', async () => {
      const fch = context.store.get(fetch$)

      await fch(new Request('/api/users', { method: 'POST' }))

      const [processedRequest] = traceFetch.mock.calls[0] as [Request]

      expect(processedRequest.url).toBe(`${TEST_API_BASE}/api/users`)
    })

    it('应该为 Request 对象添加 Authorization header', async () => {
      // Setup mock session with token
      const mockToken = 'test-jwt-token'
      const getTokenSpy = vi.fn().mockResolvedValue(mockToken)

      // Get the clerk$ signal to initialize MockClerk
      await context.store.get(clerk$)

      // Configure the mock instance
      const mockClerk = getMockClerk()
      if (mockClerk) {
        mockClerk.setUser({ id: 'user-123' })
        mockClerk.setSession({
          getToken: getTokenSpy,
        })
      }

      const fch = context.store.get(fetch$)
      const request = new Request('http://localhost:3000/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      await fch(request)

      const [processedRequest] = traceFetch.mock.calls[0] as [Request]
      const headers = Object.fromEntries(processedRequest.headers.entries())

      expect(processedRequest.url).toBe(`${TEST_API_BASE}/api/users`)
      expect(headers.Authorization).toBe(`Bearer ${mockToken}`)
      expect(headers['Content-Type']).toBe('application/json')
    })
  })

  describe('api base replacement', () => {
    it('应该将 app. 替换为 www.', async () => {
      // Set origin with app subdomain
      setOrigin('https://app.example.com')

      const fch = context.store.get(fetch$)
      await fch('/api/test')

      // Should replace app. with www.
      expect(traceFetch).toHaveBeenCalledWith(
        'https://www.example.com/api/test',
        expect.any(Object),
      )

      // Reset origin
      setOrigin(TEST_API_BASE)
    })
  })
})
