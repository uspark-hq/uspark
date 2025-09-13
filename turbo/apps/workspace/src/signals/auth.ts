import { Clerk } from '@clerk/clerk-js'
import { command, computed, state } from 'ccstate'

const reload$ = state(0)

interface User {
  id: string
  username: string | null
  firstName: string | null
  lastName: string | null
  fullName: string | null
  imageUrl: string
  primaryEmailAddress?: {
    emailAddress: string
  } | null
}

// Store the current user in a state
const currentUser$ = state<User | null | undefined>(undefined)

// Clerk instance only needs to be created and loaded once
const clerk$ = computed(async () => {
  const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as
    | string
    | undefined
  if (!publishableKey) {
    throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY environment variable')
  }

  const clerkInstance = new Clerk(publishableKey)
  await clerkInstance.load()
  return clerkInstance
})

// Sync user computed signal for React components
export const user$ = computed((get) => {
  get(reload$) // Subscribe to reload changes
  return get(currentUser$)
})

export const setupClerk$ = command(
  async ({ set, get }, signal: AbortSignal) => {
    const clerk = await get(clerk$)
    signal.throwIfAborted()

    // Set initial user
    set(currentUser$, clerk.user as User | null)

    const unsubscribe = clerk.addListener(() => {
      set(reload$, (x) => x + 1)
      set(currentUser$, clerk.user as User | null)
    })
    signal.addEventListener('abort', unsubscribe)
  },
)

export const auth$ = computed(async (get) => {
  get(reload$) // Subscribe to reload changes
  const clerk = await get(clerk$)

  return {
    userId: clerk.user?.id ?? null,
    sessionId: clerk.session?.id ?? null,
    sessionClaims: clerk.session?.publicUserData ?? null,
    isSignedIn: !!clerk.user,
    isLoaded: clerk.loaded,
  }
})
