import { vi } from 'vitest'

type Listener = () => void

// Track the current MockClerk instance for test access
// eslint-disable-next-line custom/no-package-variable
let currentMockClerk: MockClerk | null = null

interface ClerkSession {
  getToken: () => Promise<string | null>
}

interface ClerkUser {
  id: string
  [key: string]: unknown
}

export class MockClerk {
  private readonly listeners: Listener[] = []

  user: ClerkUser | null = null
  session: ClerkSession | null = null

  constructor(public publishableKey: string) {
    // Store reference to current instance
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    currentMockClerk = this
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
}

export function setupMock() {
  vi.mock<typeof import('@clerk/clerk-js')>('@clerk/clerk-js', () => ({
    Clerk: MockClerk,
  }))
}

export function getMockClerk(): MockClerk | null {
  return currentMockClerk
}

export function resetMockAuth() {
  if (currentMockClerk) {
    currentMockClerk.user = null
    currentMockClerk.session = null
  }
}
