import { describe, it, expect, vi, beforeEach } from 'vitest'

const from = vi.fn()
vi.mock('./supabase', () => ({
  supabase: { from: (...args) => from(...args) },
}))

const {
  extractHashtags,
  isFollowing,
  followUser,
  unfollowUser,
  getFollowingIds,
  getBookmarkedIds,
  toggleBookmark,
  createNotification,
  reportContent,
  blockUser,
  getBlockedIds,
} = await import('./social')

// Minimal chainable stand-in for the Supabase query builder: every filter
// method returns itself, and the chain resolves to `result` whether it's
// awaited directly or via .single()/.maybeSingle().
function chain(result) {
  const builder = {
    select: () => builder,
    insert: () => builder,
    delete: () => builder,
    update: () => builder,
    eq: () => builder,
    or: () => builder,
    order: () => builder,
    limit: () => builder,
    maybeSingle: () => Promise.resolve(result),
    single: () => Promise.resolve(result),
    then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
  }
  return builder
}

beforeEach(() => {
  from.mockReset()
})

describe('extractHashtags', () => {
  it('extracts, lowercases, and dedupes hashtags', () => {
    expect(extractHashtags('Loved this #Chess night, another #chess and #Travel')).toEqual([
      'chess',
      'travel',
    ])
  })

  it('ignores plain text with no hashtags', () => {
    expect(extractHashtags('just a normal caption')).toEqual([])
  })

  it('caps at 10 hashtags', () => {
    const text = Array.from({ length: 15 }, (_, i) => `#tag${i}`).join(' ')
    expect(extractHashtags(text)).toHaveLength(10)
  })

  it('handles unicode letters', () => {
    expect(extractHashtags('#जयपुर is home')).toEqual(['जयपुर'])
  })
})

describe('isFollowing', () => {
  it('short-circuits false when either id is missing, without a network call', async () => {
    expect(await isFollowing(null, 'x')).toBe(false)
    expect(await isFollowing('x', null)).toBe(false)
    expect(from).not.toHaveBeenCalled()
  })

  it('returns true when a follow row exists', async () => {
    from.mockReturnValue(chain({ data: { id: 'f1' }, error: null }))
    expect(await isFollowing('a', 'b')).toBe(true)
  })

  it('returns false when no follow row exists', async () => {
    from.mockReturnValue(chain({ data: null, error: null }))
    expect(await isFollowing('a', 'b')).toBe(false)
  })
})

describe('followUser', () => {
  it('inserts a follow row and notifies the followed user on success', async () => {
    from.mockImplementation(() => chain({ error: null }))
    const ok = await followUser('me', 'them')
    expect(ok).toBe(true)
    expect(from).toHaveBeenCalledWith('follows')
    expect(from).toHaveBeenCalledWith('notifications')
  })

  it('does not notify when the insert fails', async () => {
    from.mockImplementation(() => chain({ error: { message: 'duplicate' } }))
    const ok = await followUser('me', 'them')
    expect(ok).toBe(false)
    expect(from).toHaveBeenCalledTimes(1)
    expect(from).not.toHaveBeenCalledWith('notifications')
  })
})

describe('unfollowUser', () => {
  it('returns true on success, false on error', async () => {
    from.mockReturnValue(chain({ error: null }))
    expect(await unfollowUser('me', 'them')).toBe(true)

    from.mockReturnValue(chain({ error: { message: 'nope' } }))
    expect(await unfollowUser('me', 'them')).toBe(false)
  })
})

describe('getFollowingIds / getBookmarkedIds', () => {
  it('return [] without a network call when userId is missing', async () => {
    expect(await getFollowingIds(null)).toEqual([])
    expect(await getBookmarkedIds(undefined)).toEqual([])
    expect(from).not.toHaveBeenCalled()
  })

  it('maps rows to their id field', async () => {
    from.mockReturnValue(chain({ data: [{ following_id: 'a' }, { following_id: 'b' }], error: null }))
    expect(await getFollowingIds('me')).toEqual(['a', 'b'])

    from.mockReturnValue(chain({ data: [{ video_id: 'v1' }], error: null }))
    expect(await getBookmarkedIds('me')).toEqual(['v1'])
  })
})

describe('toggleBookmark', () => {
  it('deletes when currently bookmarked', async () => {
    from.mockReturnValue(chain({ error: null }))
    expect(await toggleBookmark('v1', 'me', true)).toBe(true)
    expect(from).toHaveBeenCalledWith('video_bookmarks')
  })

  it('inserts when not currently bookmarked', async () => {
    from.mockReturnValue(chain({ error: null }))
    expect(await toggleBookmark('v1', 'me', false)).toBe(true)
  })

  it('returns false on error either way', async () => {
    from.mockReturnValue(chain({ error: { message: 'x' } }))
    expect(await toggleBookmark('v1', 'me', true)).toBe(false)
  })
})

describe('createNotification', () => {
  it('never notifies yourself', async () => {
    await createNotification({ userId: 'me', actorId: 'me', type: 'follow' })
    expect(from).not.toHaveBeenCalled()
  })

  it('skips when userId or actorId is missing', async () => {
    await createNotification({ userId: null, actorId: 'me', type: 'follow' })
    await createNotification({ userId: 'me', actorId: null, type: 'follow' })
    expect(from).not.toHaveBeenCalled()
  })

  it('inserts a notification row otherwise', async () => {
    from.mockReturnValue(chain({ error: null }))
    await createNotification({ userId: 'a', actorId: 'b', type: 'like', entityId: 'v1' })
    expect(from).toHaveBeenCalledWith('notifications')
  })
})

describe('reportContent / blockUser', () => {
  it('return true on success, false on error', async () => {
    from.mockReturnValue(chain({ error: null }))
    expect(await reportContent({ reporterId: 'me', targetType: 'video', targetId: 'v1' })).toBe(true)
    expect(await blockUser('me', 'them')).toBe(true)

    from.mockReturnValue(chain({ error: { message: 'x' } }))
    expect(await reportContent({ reporterId: 'me', targetType: 'video', targetId: 'v1' })).toBe(false)
    expect(await blockUser('me', 'them')).toBe(false)
  })
})

describe('getBlockedIds', () => {
  it('returns [] without a network call when userId is missing', async () => {
    expect(await getBlockedIds(null)).toEqual([])
    expect(from).not.toHaveBeenCalled()
  })

  it('maps each row to the other party, deduped, regardless of direction', async () => {
    from.mockReturnValue(chain({
      data: [
        { blocker_id: 'me', blocked_id: 'x' },   // I blocked x
        { blocker_id: 'y', blocked_id: 'me' },   // y blocked me
        { blocker_id: 'me', blocked_id: 'x' },   // duplicate row
      ],
      error: null,
    }))
    expect(await getBlockedIds('me')).toEqual(['x', 'y'])
  })
})
