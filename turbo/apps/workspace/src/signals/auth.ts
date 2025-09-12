import { Clerk } from '@clerk/clerk-js'
import { command, computed, state } from 'ccstate'

const reload$ = state(0)

const clerk$ = computed(async () => {
  const publishableKey = import.meta.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY as
    | string
    | undefined
  if (!publishableKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY environment variable',
    )
  }

  const clerkInstance = new Clerk(publishableKey)
  await clerkInstance.load()
  return clerkInstance
})

export const setupClerk$ = command(
  async ({ set, get }, signal: AbortSignal) => {
    const clerk = await get(clerk$)
    signal.throwIfAborted()

    const unsubscribe = clerk.addListener(() => {
      set(reload$, (x) => x + 1)
    })
    signal.addEventListener('abort', unsubscribe)
  },
)

export const auth$ = computed(async (get) => {
  get(reload$)
  const clerk = await get(clerk$)

  return {
    userId: clerk.user?.id ?? null,
    sessionId: clerk.session?.id ?? null,
    sessionClaims: clerk.session?.publicUserData ?? null,
    isSignedIn: !!clerk.user,
    isLoaded: clerk.loaded,
  }
})
