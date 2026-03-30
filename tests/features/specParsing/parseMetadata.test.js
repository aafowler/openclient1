import { describe, it, expect } from 'vitest'
import { parseMetadata } from '../../../src/features/specParsing/parseMetadata.js'

describe('parseMetadata', () => {
  describe('metadata extraction', () => {
    it('extracts title and version from info', () => {
      const result = parseMetadata({
        openapi: '3.0.0',
        info: { title: 'My API', version: '2.0.0' },
        paths: {},
      })
      expect(result.metadata.title).toBe('My API')
      expect(result.metadata.version).toBe('2.0.0')
    })

    it('extracts description and termsOfService', () => {
      const result = parseMetadata({
        openapi: '3.0.0',
        info: {
          title: 'T',
          version: '1.0.0',
          description: 'A great API',
          termsOfService: 'https://example.com/tos',
        },
        paths: {},
      })
      expect(result.metadata.description).toBe('A great API')
      expect(result.metadata.termsOfService).toBe('https://example.com/tos')
    })

    it('extracts contact info when present', () => {
      const result = parseMetadata({
        openapi: '3.0.0',
        info: {
          title: 'T',
          version: '1.0.0',
          contact: { name: 'Alice', url: 'https://alice.dev', email: 'alice@example.com' },
        },
        paths: {},
      })
      expect(result.metadata.contact).toEqual({
        name: 'Alice',
        url: 'https://alice.dev',
        email: 'alice@example.com',
      })
    })

    it('returns null for contact when not present', () => {
      const result = parseMetadata({
        openapi: '3.0.0',
        info: { title: 'T', version: '1.0.0' },
        paths: {},
      })
      expect(result.metadata.contact).toBeNull()
    })

    it('extracts license info when present', () => {
      const result = parseMetadata({
        openapi: '3.0.0',
        info: {
          title: 'T',
          version: '1.0.0',
          license: { name: 'MIT', url: 'https://opensource.org/licenses/MIT' },
        },
        paths: {},
      })
      expect(result.metadata.license).toEqual({
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      })
    })

    it('returns null for license when not present', () => {
      const result = parseMetadata({
        openapi: '3.0.0',
        info: { title: 'T', version: '1.0.0' },
        paths: {},
      })
      expect(result.metadata.license).toBeNull()
    })

    it('defaults missing string fields to empty strings', () => {
      const result = parseMetadata({
        openapi: '3.0.0',
        info: { title: 'T', version: '1.0.0' },
        paths: {},
      })
      expect(result.metadata.description).toBe('')
      expect(result.metadata.termsOfService).toBe('')
    })

    it('defaults missing contact subfields to empty strings', () => {
      const result = parseMetadata({
        openapi: '3.0.0',
        info: { title: 'T', version: '1.0.0', contact: {} },
        paths: {},
      })
      expect(result.metadata.contact).toEqual({ name: '', url: '', email: '' })
    })

    it('defaults missing license subfields to empty strings', () => {
      const result = parseMetadata({
        openapi: '3.0.0',
        info: { title: 'T', version: '1.0.0', license: {} },
        paths: {},
      })
      expect(result.metadata.license).toEqual({ name: '', url: '' })
    })

    it('reads openApiVersion from openapi field', () => {
      const result = parseMetadata({
        openapi: '3.1.0',
        info: { title: 'T', version: '1.0.0' },
        paths: {},
      })
      expect(result.metadata.openApiVersion).toBe('3.1.0')
    })

    it('reads openApiVersion from swagger field for 2.0 specs', () => {
      const result = parseMetadata({
        swagger: '2.0',
        info: { title: 'T', version: '1.0.0' },
        paths: {},
      })
      expect(result.metadata.openApiVersion).toBe('2.0')
    })

    it('handles missing info object gracefully', () => {
      const result = parseMetadata({ openapi: '3.0.0', paths: {} })
      expect(result.metadata.title).toBe('')
      expect(result.metadata.version).toBe('')
      expect(result.metadata.contact).toBeNull()
      expect(result.metadata.license).toBeNull()
    })
  })

  describe('servers extraction', () => {
    it('extracts OpenAPI 3.x servers', () => {
      const result = parseMetadata({
        openapi: '3.0.0',
        info: { title: 'T', version: '1.0.0' },
        servers: [
          { url: 'https://api.example.com', description: 'Production' },
          { url: 'https://staging.example.com', description: 'Staging' },
        ],
        paths: {},
      })
      expect(result.servers).toEqual([
        { url: 'https://api.example.com', description: 'Production' },
        { url: 'https://staging.example.com', description: 'Staging' },
      ])
    })

    it('defaults missing server fields to empty strings', () => {
      const result = parseMetadata({
        openapi: '3.0.0',
        info: { title: 'T', version: '1.0.0' },
        servers: [{}],
        paths: {},
      })
      expect(result.servers).toEqual([{ url: '', description: '' }])
    })

    it('returns empty array when no servers defined', () => {
      const result = parseMetadata({
        openapi: '3.0.0',
        info: { title: 'T', version: '1.0.0' },
        paths: {},
      })
      expect(result.servers).toEqual([])
    })

    it('constructs server from Swagger 2.0 host and basePath', () => {
      const result = parseMetadata({
        swagger: '2.0',
        info: { title: 'T', version: '1.0.0' },
        host: 'api.example.com',
        basePath: '/v1',
        schemes: ['https'],
        paths: {},
      })
      expect(result.servers).toEqual([
        { url: 'https://api.example.com/v1', description: '' },
      ])
    })

    it('defaults Swagger 2.0 scheme to https when schemes is missing', () => {
      const result = parseMetadata({
        swagger: '2.0',
        info: { title: 'T', version: '1.0.0' },
        host: 'api.example.com',
        paths: {},
      })
      expect(result.servers[0].url).toBe('https://api.example.com')
    })

    it('uses first scheme from Swagger 2.0 schemes array', () => {
      const result = parseMetadata({
        swagger: '2.0',
        info: { title: 'T', version: '1.0.0' },
        host: 'api.example.com',
        schemes: ['http', 'https'],
        paths: {},
      })
      expect(result.servers[0].url).toMatch(/^http:\/\//)
    })

    it('handles Swagger 2.0 host without basePath', () => {
      const result = parseMetadata({
        swagger: '2.0',
        info: { title: 'T', version: '1.0.0' },
        host: 'api.example.com',
        schemes: ['https'],
        paths: {},
      })
      expect(result.servers[0].url).toBe('https://api.example.com')
    })
  })

  describe('tags extraction', () => {
    it('extracts tag names and descriptions', () => {
      const result = parseMetadata({
        openapi: '3.0.0',
        info: { title: 'T', version: '1.0.0' },
        tags: [
          { name: 'Users', description: 'User ops' },
          { name: 'Posts', description: 'Post ops' },
        ],
        paths: {},
      })
      expect(result.tags).toEqual([
        { name: 'Users', description: 'User ops' },
        { name: 'Posts', description: 'Post ops' },
      ])
    })

    it('returns empty array when no tags defined', () => {
      const result = parseMetadata({
        openapi: '3.0.0',
        info: { title: 'T', version: '1.0.0' },
        paths: {},
      })
      expect(result.tags).toEqual([])
    })

    it('defaults missing tag fields to empty strings', () => {
      const result = parseMetadata({
        openapi: '3.0.0',
        info: { title: 'T', version: '1.0.0' },
        tags: [{}],
        paths: {},
      })
      expect(result.tags).toEqual([{ name: '', description: '' }])
    })
  })

  describe('security extraction', () => {
    it('returns global security when defined', () => {
      const security = [{ bearerAuth: [] }]
      const result = parseMetadata({
        openapi: '3.0.0',
        info: { title: 'T', version: '1.0.0' },
        security,
        paths: {},
      })
      expect(result.security).toEqual(security)
    })

    it('returns null when no global security defined', () => {
      const result = parseMetadata({
        openapi: '3.0.0',
        info: { title: 'T', version: '1.0.0' },
        paths: {},
      })
      expect(result.security).toBeNull()
    })
  })

  describe('return shape', () => {
    it('returns { metadata, servers, tags, security }', () => {
      const result = parseMetadata({
        openapi: '3.0.0',
        info: { title: 'T', version: '1.0.0' },
        paths: {},
      })
      expect(Object.keys(result).sort()).toEqual(['metadata', 'security', 'servers', 'tags'])
    })
  })
})
