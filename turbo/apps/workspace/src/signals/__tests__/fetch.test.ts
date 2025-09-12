import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import { fetch$ } from '../fetch'
import { setOrigin } from '../location'
import { testContext } from './context'

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
    // Mock 全局 fetch 方法
    traceFetch = vi.fn().mockResolvedValue(new Response(null, { status: 200 }))
    vi.stubGlobal('fetch', traceFetch)
  })

  afterEach(() => {
    vi.restoreAllMocks()
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
  })
})
