import { Clerk } from '@clerk/clerk-js'
import { command, computed, state } from 'ccstate'

const reload$ = state(0)

/**
 * Clerk instance signal that initializes the Clerk SDK with the publishable key.
 * The VITE_CLERK_PUBLISHABLE_KEY environment variable must be set at build time
 * via .env.production.local file for production deployments.
 */
export const clerk$ = computed(async () => {
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

/**
 * Command to setup Clerk authentication listeners.
 * This command initializes the Clerk instance and sets up a listener
 * for authentication state changes.
 */
export const setupClerk$ = command(
  async ({ set, get }, signal: AbortSignal) => {
    const clerk = await get(clerk$)
    signal.throwIfAborted()

    // Set initial user
    const unsubscribe = clerk.addListener(() => {
      set(reload$, (x) => x + 1)
    })
    signal.addEventListener('abort', unsubscribe)
  },
)

/**
 * User signal that provides the current authenticated user from Clerk.
 * Returns undefined if no user is authenticated.
 */
export const user$ = computed(async (get) => {
  get(reload$)
  const clerk = await get(clerk$)
  return clerk.user ?? undefined
})
