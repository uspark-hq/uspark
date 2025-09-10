import { describe, expect, it } from 'vitest'
import { geometryStyle } from '../utils'

describe('geometryStyle', () => {
  it('should return number width to css style', () => {
    expect(geometryStyle({ width: 100 })).toStrictEqual({
      width: '100px',
    })
  })
})
