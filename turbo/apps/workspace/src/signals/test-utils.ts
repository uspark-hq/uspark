import { vi } from 'vitest'

type Listener = () => void

class MockClerk {
  private readonly listeners: Listener[] = []

  user = null
  session = null

  constructor(public publishableKey: string) {}

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
}

export function setupMock() {
  vi.mock<typeof import('@clerk/clerk-js')>('@clerk/clerk-js', () => ({
    Clerk: MockClerk,
  }))
}

export function resetMockAuth() {
  // Reset mock state if needed
}
