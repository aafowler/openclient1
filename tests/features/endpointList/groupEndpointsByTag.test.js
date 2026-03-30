import { describe, it, expect } from 'vitest'
import { groupEndpointsByTag } from '../../../src/features/endpointList/groupEndpointsByTag.js'

// Helper to build minimal endpoint objects
function ep(id, tags) {
  return { id, tags, path: `/${id}`, method: 'get' }
}

describe('groupEndpointsByTag', () => {
  describe('basic grouping', () => {
    it('groups endpoints by their tags', () => {
      const endpoints = [
        ep('listUsers', ['Users']),
        ep('listPosts', ['Posts']),
        ep('createUser', ['Users']),
      ]
      const tags = [
        { name: 'Users', description: 'User ops' },
        { name: 'Posts', description: 'Post ops' },
      ]
      const groups = groupEndpointsByTag(endpoints, tags)
      expect(groups).toHaveLength(2)

      const usersGroup = groups.find(g => g.name === 'Users')
      expect(usersGroup.endpoints).toHaveLength(2)
      expect(usersGroup.description).toBe('User ops')

      const postsGroup = groups.find(g => g.name === 'Posts')
      expect(postsGroup.endpoints).toHaveLength(1)
    })

    it('returns empty array when no endpoints', () => {
      const tags = [{ name: 'Users', description: '' }]
      const groups = groupEndpointsByTag([], tags)
      expect(groups).toEqual([])
    })
  })

  describe('tag ordering', () => {
    it('preserves spec-defined tag order', () => {
      const endpoints = [
        ep('a', ['Beta']),
        ep('b', ['Alpha']),
      ]
      const tags = [
        { name: 'Alpha', description: '' },
        { name: 'Beta', description: '' },
      ]
      const groups = groupEndpointsByTag(endpoints, tags)
      expect(groups[0].name).toBe('Alpha')
      expect(groups[1].name).toBe('Beta')
    })

    it('places "Untagged" last', () => {
      const endpoints = [
        ep('health', ['Untagged']),
        ep('listUsers', ['Users']),
      ]
      const tags = [{ name: 'Users', description: '' }]
      const groups = groupEndpointsByTag(endpoints, tags)
      expect(groups[groups.length - 1].name).toBe('Untagged')
    })

    it('places ad-hoc tags after defined tags but before Untagged', () => {
      const endpoints = [
        ep('health', ['Untagged']),
        ep('listUsers', ['Users']),
        ep('misc', ['Experimental']),
      ]
      const tags = [{ name: 'Users', description: '' }]
      const groups = groupEndpointsByTag(endpoints, tags)
      expect(groups.map(g => g.name)).toEqual(['Users', 'Experimental', 'Untagged'])
    })
  })

  describe('multi-tag endpoints', () => {
    it('places endpoint in each of its tag groups', () => {
      const endpoints = [
        ep('deleteUser', ['Users', 'Admin']),
      ]
      const tags = [
        { name: 'Users', description: '' },
        { name: 'Admin', description: '' },
      ]
      const groups = groupEndpointsByTag(endpoints, tags)
      expect(groups).toHaveLength(2)
      expect(groups[0].endpoints).toHaveLength(1)
      expect(groups[1].endpoints).toHaveLength(1)
      // Same endpoint object in both groups
      expect(groups[0].endpoints[0]).toBe(groups[1].endpoints[0])
    })
  })

  describe('edge cases', () => {
    it('filters out empty groups from defined tags', () => {
      const endpoints = [ep('listUsers', ['Users'])]
      const tags = [
        { name: 'Users', description: '' },
        { name: 'EmptyTag', description: 'Has no endpoints' },
      ]
      const groups = groupEndpointsByTag(endpoints, tags)
      expect(groups).toHaveLength(1)
      expect(groups[0].name).toBe('Users')
    })

    it('creates ad-hoc group for tags not defined in spec', () => {
      const endpoints = [ep('secret', ['Internal'])]
      const tags = []
      const groups = groupEndpointsByTag(endpoints, tags)
      expect(groups).toHaveLength(1)
      expect(groups[0].name).toBe('Internal')
      expect(groups[0].description).toBe('')
    })

    it('handles all endpoints being Untagged', () => {
      const endpoints = [
        ep('a', ['Untagged']),
        ep('b', ['Untagged']),
      ]
      const groups = groupEndpointsByTag(endpoints, [])
      expect(groups).toHaveLength(1)
      expect(groups[0].name).toBe('Untagged')
      expect(groups[0].endpoints).toHaveLength(2)
    })

    it('preserves endpoint reference identity across groups', () => {
      const endpoint = ep('shared', ['A', 'B'])
      const groups = groupEndpointsByTag([endpoint], [
        { name: 'A', description: '' },
        { name: 'B', description: '' },
      ])
      // Both groups should hold the exact same object, not copies
      expect(groups[0].endpoints[0]).toBe(endpoint)
      expect(groups[1].endpoints[0]).toBe(endpoint)
    })
  })
})
