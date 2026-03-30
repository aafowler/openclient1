import { describe, it, expect } from 'vitest'
import { parseSchemas } from '../../../src/features/specParsing/parseSchemas.js'

describe('parseSchemas', () => {
  describe('schema extraction', () => {
    it('extracts schemas from OpenAPI 3.x components.schemas', () => {
      const UserSchema = { type: 'object', properties: { id: { type: 'integer' } } }
      const spec = {
        openapi: '3.0.0',
        components: { schemas: { User: UserSchema } },
      }
      const { schemas } = parseSchemas(spec)
      expect(schemas).toHaveLength(1)
      expect(schemas[0].name).toBe('User')
      expect(schemas[0].schema).toBe(UserSchema)
    })

    it('extracts schemas from Swagger 2.0 definitions', () => {
      const PetSchema = { type: 'object', properties: { name: { type: 'string' } } }
      const spec = {
        swagger: '2.0',
        definitions: { Pet: PetSchema },
      }
      const { schemas } = parseSchemas(spec)
      expect(schemas).toHaveLength(1)
      expect(schemas[0].name).toBe('Pet')
      expect(schemas[0].schema).toBe(PetSchema)
    })

    it('extracts multiple schemas preserving insertion order', () => {
      const spec = {
        openapi: '3.0.0',
        components: {
          schemas: {
            Alpha: { type: 'string' },
            Beta: { type: 'integer' },
            Gamma: { type: 'boolean' },
          },
        },
      }
      const { schemas } = parseSchemas(spec)
      expect(schemas.map(s => s.name)).toEqual(['Alpha', 'Beta', 'Gamma'])
    })

    it('initializes usedBy as an empty array for each schema', () => {
      const spec = {
        openapi: '3.0.0',
        components: {
          schemas: {
            A: { type: 'object' },
            B: { type: 'object' },
          },
        },
      }
      const { schemas } = parseSchemas(spec)
      for (const schema of schemas) {
        expect(schema.usedBy).toEqual([])
      }
    })

    it('returns empty schemas array when no schemas exist', () => {
      const { schemas } = parseSchemas({ openapi: '3.0.0' })
      expect(schemas).toEqual([])
    })

    it('returns empty schemas when components exists but has no schemas', () => {
      const { schemas } = parseSchemas({ openapi: '3.0.0', components: {} })
      expect(schemas).toEqual([])
    })
  })

  describe('schemaNameMatcher', () => {
    it('returns the schema name for a known schema object', () => {
      const UserSchema = { type: 'object' }
      const spec = {
        openapi: '3.0.0',
        components: { schemas: { User: UserSchema } },
      }
      const { schemaNameMatcher } = parseSchemas(spec)
      expect(schemaNameMatcher(UserSchema)).toBe('User')
    })

    it('returns null for an unknown schema object', () => {
      const spec = {
        openapi: '3.0.0',
        components: { schemas: { User: { type: 'object' } } },
      }
      const { schemaNameMatcher } = parseSchemas(spec)
      expect(schemaNameMatcher({ type: 'object' })).toBeNull()
    })

    it('matches by object identity, not structural equality', () => {
      const schema = { type: 'object', properties: { id: { type: 'integer' } } }
      const identicalCopy = { type: 'object', properties: { id: { type: 'integer' } } }
      const spec = {
        openapi: '3.0.0',
        components: { schemas: { User: schema } },
      }
      const { schemaNameMatcher } = parseSchemas(spec)
      expect(schemaNameMatcher(schema)).toBe('User')
      expect(schemaNameMatcher(identicalCopy)).toBeNull()
    })

    it('returns null for null input', () => {
      const spec = {
        openapi: '3.0.0',
        components: { schemas: { User: { type: 'object' } } },
      }
      const { schemaNameMatcher } = parseSchemas(spec)
      expect(schemaNameMatcher(null)).toBeNull()
    })

    it('returns null for non-object input', () => {
      const spec = {
        openapi: '3.0.0',
        components: { schemas: { User: { type: 'object' } } },
      }
      const { schemaNameMatcher } = parseSchemas(spec)
      expect(schemaNameMatcher('User')).toBeNull()
      expect(schemaNameMatcher(42)).toBeNull()
      expect(schemaNameMatcher(undefined)).toBeNull()
    })

    it('works with multiple schemas', () => {
      const UserSchema = { type: 'object' }
      const PostSchema = { type: 'object' }
      const ErrorSchema = { type: 'object' }
      const spec = {
        openapi: '3.0.0',
        components: {
          schemas: { User: UserSchema, Post: PostSchema, Error: ErrorSchema },
        },
      }
      const { schemaNameMatcher } = parseSchemas(spec)
      expect(schemaNameMatcher(UserSchema)).toBe('User')
      expect(schemaNameMatcher(PostSchema)).toBe('Post')
      expect(schemaNameMatcher(ErrorSchema)).toBe('Error')
    })
  })

  describe('return shape', () => {
    it('returns { schemas, schemaNameMatcher }', () => {
      const result = parseSchemas({ openapi: '3.0.0' })
      expect(Object.keys(result).sort()).toEqual(['schemaNameMatcher', 'schemas'])
      expect(Array.isArray(result.schemas)).toBe(true)
      expect(typeof result.schemaNameMatcher).toBe('function')
    })
  })
})
