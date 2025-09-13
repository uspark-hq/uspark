import { Clerk } from '@clerk/clerk-js'
import { command, computed, state } from 'ccstate'

const reload$ = state(0)

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

export const user$ = computed(async (get) => {
  get(reload$)
  const clerk = await get(clerk$)
  return clerk.user ?? undefined
})
