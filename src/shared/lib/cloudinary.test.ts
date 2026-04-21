import { describe, it, expect } from 'vitest'

import { getCloudinaryUrl } from './cloudinary'

describe('getCloudinaryUrl', () => {
  it('includes the public ID in the URL', () => {
    const url = getCloudinaryUrl('moves/spin_basic')
    expect(url).toContain('moves/spin_basic')
    expect(url).toContain('cloudinary.com')
  })

  it('applies width transformation when provided', () => {
    const url = getCloudinaryUrl('moves/spin_basic', { width: 400 })
    expect(url).toContain('w_400')
  })

  it('omits width when not provided', () => {
    const url = getCloudinaryUrl('moves/spin_basic')
    expect(url).not.toContain('w_')
  })
})
