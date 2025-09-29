import { vi } from 'vitest'

type Listener = () => void

interface ClerkSession {
  getToken: () => Promise<string | null>
}

interface ClerkUser {
  id: string
  [key: string]: unknown
}

export class MockClerk {
  private readonly listeners: Listener[] = []
  private static instance: MockClerk | null = null

  user: ClerkUser | null = null
  session: ClerkSession | null = null

  constructor(public publishableKey: string) {
    // Store reference to current instance
    MockClerk.instance = this
  }

  load() {
    return Promise.resolve()
  }

  addListener(callback: () => void): () => void {
    this.listeners.push(callback)
    return () => {
      const index = this.listeners.indexOf(callback)
      if (index !== -1) {
        this.listeners.splice(index, 1)
      }
    }
  }

  removeListener(callback: () => void): void {
    const index = this.listeners.indexOf(callback)
    if (index !== -1) {
      this.listeners.splice(index, 1)
    }
  }

  setSession(session: ClerkSession | null) {
    this.session = session
    this.notifyListeners()
  }

  setUser(user: ClerkUser | null) {
    this.user = user
    this.notifyListeners()
  }

  private notifyListeners() {
    for (const listener of this.listeners) {
      listener()
    }
  }

  static getInstance(): MockClerk | null {
    return MockClerk.instance
  }

  static resetInstance() {
    if (MockClerk.instance) {
      MockClerk.instance.user = null
      MockClerk.instance.session = null
    }
  }
}

export function setupMock() {
  vi.mock<typeof import('@clerk/clerk-js')>('@clerk/clerk-js', () => ({
    Clerk: MockClerk,
  }))
}

export function getMockClerk(): MockClerk | null {
  return MockClerk.getInstance()
}

export function resetMockAuth() {
  MockClerk.resetInstance()
}
