import { describe, expect, it } from 'vitest'
import { createDeferredPromise } from '../promise'

describe('promise', () => {
  it('createDeferred', async () => {
    const defer = createDeferredPromise<number>(AbortSignal.any([]))

    expect(defer.settled()).toBeFalsy()

    defer.resolve(42)
    expect(defer.settled()).toBeTruthy()

    expect(await defer.promise).toBe(42)
  })
})
