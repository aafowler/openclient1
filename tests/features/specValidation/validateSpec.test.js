import { describe, it, expect } from 'vitest'
import { validateSpec } from '../../../src/features/specValidation/validateSpec.js'
import validSpec from '../../../test-fixtures/valid-spec.json'
import singleError from '../../../test-fixtures/single-error.json'
import multipleErrors from '../../../test-fixtures/multiple-errors.json'
import richSpec from '../../../test-fixtures/rich-spec.json'

// Minimal valid spec for building test cases without fixture baggage
function minimalSpec(overrides = {}) {
  return {
    openapi: '3.0.0',
    info: { title: 'Test', version: '1.0.0' },
    paths: {},
    ...overrides,
  }
}

describe('validateSpec', () => {
  describe('non-object inputs', () => {
    it('rejects null', async () => {
      const result = await validateSpec(null)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Specification must be a JSON/YAML object.')
    })

    it('rejects undefined', async () => {
      const result = await validateSpec(undefined)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Specification must be a JSON/YAML object.')
    })

    it('rejects a string', async () => {
      const result = await validateSpec('not an object')
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Specification must be a JSON/YAML object.')
    })

    it('rejects a number', async () => {
      const result = await validateSpec(42)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Specification must be a JSON/YAML object.')
    })

    it('rejects an array', async () => {
      // Arrays pass typeof === 'object' but are caught by structural checks
      const result = await validateSpec([{ openapi: '3.0.0' }])
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })
  })

  describe('structural checks', () => {
    it('requires openapi or swagger field', async () => {
      const result = await validateSpec({
        info: { title: 'Test', version: '1.0.0' },
        paths: {},
      })
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('"openapi" or "swagger"'))).toBe(true)
    })

    it('requires info object', async () => {
      const result = await validateSpec({ openapi: '3.0.0', paths: {} })
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('"info"'))).toBe(true)
    })

    it('requires info.title', async () => {
      const result = await validateSpec({
        openapi: '3.0.0',
        info: { version: '1.0.0' },
        paths: {},
      })
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('"info.title"'))).toBe(true)
    })

    it('requires info.version', async () => {
      const result = await validateSpec({
        openapi: '3.0.0',
        info: { title: 'Test' },
        paths: {},
      })
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('"info.version"'))).toBe(true)
    })

    it('requires at least one of paths, webhooks, or components', async () => {
      const result = await validateSpec({
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0.0' },
      })
      expect(result.valid).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0]).toContain('"paths"')
      expect(result.errors[0]).toContain('"webhooks"')
      expect(result.errors[0]).toContain('"components"')
    })

    it('passes structural checks with components alone but may fail schema validation', async () => {
      // The structural check allows components without paths, but swagger-parser
      // requires paths for OpenAPI 3.0 (only optional in 3.1).
      const result = await validateSpec({
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0.0' },
        components: { schemas: { Foo: { type: 'object' } } },
      })
      // Structural checks pass (no early return), so errors come from swagger-parser
      expect(result.errors.every(e => !e.includes('"paths"'))).toBe(true)
    })

    it('collects multiple structural errors at once', async () => {
      const result = await validateSpec({})
      expect(result.valid).toBe(false)
      expect(result.errors).toHaveLength(3)
      expect(result.errors[0]).toContain('"openapi" or "swagger"')
      expect(result.errors[1]).toContain('"info"')
      expect(result.errors[2]).toContain('"paths"')
    })

    it('returns early on structural errors without calling swagger-parser', async () => {
      const result = await validateSpec({})
      expect(result.valid).toBe(false)
      // No spec property should be present when structural checks fail
      expect(result.spec).toBeUndefined()
    })
  })

  describe('swagger-parser schema validation', () => {
    it('validates a correct OpenAPI 3.0 spec and returns dereferenced output', async () => {
      const result = await validateSpec(structuredClone(validSpec))
      expect(result.valid).toBe(true)
      expect(result.errors).toEqual([])
      // spec should be the dereferenced output — $refs resolved to actual objects
      expect(result.spec).toBeTypeOf('object')
      expect(result.spec.paths['/users'].get.responses['200']).toBeDefined()
    })

    it('validates the rich spec fixture and resolves refs', async () => {
      const result = await validateSpec(structuredClone(richSpec))
      expect(result.valid).toBe(true)
      expect(result.errors).toEqual([])
      // Verify $ref to User schema was resolved inline
      const postBody = result.spec.paths['/users'].post.requestBody
      expect(postBody.content['application/json'].schema.properties).toHaveProperty('name')
    })

    it('detects an unresolvable $ref', async () => {
      const result = await validateSpec(structuredClone(singleError))
      expect(result.valid).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0]).toMatch(/NonExistent/i)
    })

    it('detects multiple schema-level errors', async () => {
      const result = await validateSpec(structuredClone(multipleErrors))
      expect(result.valid).toBe(false)
      // Fixture has errors in two distinct paths — verify we surface more than one
      expect(result.errors.length).toBeGreaterThanOrEqual(2)
      // Errors should reference the locations in the spec where problems exist
      expect(result.errors.some(e => e.includes('/users'))).toBe(true)
      expect(result.errors.some(e => e.includes('/items'))).toBe(true)
    })

    it('deduplicates identical error messages', async () => {
      const result = await validateSpec(structuredClone(multipleErrors))
      const unique = new Set(result.errors)
      expect(result.errors.length).toBe(unique.size)
    })

    it('filters out oneOf noise from Ajv details', async () => {
      // oneOf errors are internal Ajv noise and should be filtered
      const result = await validateSpec(structuredClone(multipleErrors))
      const hasOneOf = result.errors.some(e => e.toLowerCase().includes('must match exactly one'))
      expect(hasOneOf).toBe(false)
    })
  })

  describe('swagger 2.0 support', () => {
    it('accepts a valid Swagger 2.0 spec', async () => {
      const swagger2 = {
        swagger: '2.0',
        info: { title: 'Swagger Test', version: '1.0.0' },
        paths: {
          '/ping': {
            get: {
              responses: {
                '200': { description: 'OK' },
              },
            },
          },
        },
      }
      const result = await validateSpec(swagger2)
      expect(result.valid).toBe(true)
      expect(result.spec).toBeDefined()
    })
  })

  describe('return shape', () => {
    it('valid result has { valid: true, errors: [], spec: object }', async () => {
      const result = await validateSpec(structuredClone(validSpec))
      expect(Object.keys(result).sort()).toEqual(['errors', 'spec', 'valid'])
      expect(result.valid).toBe(true)
      expect(result.errors).toEqual([])
      expect(result.spec).toBeTypeOf('object')
    })

    it('invalid result has { valid: false, errors: [...] } with no spec', async () => {
      const result = await validateSpec(null)
      expect(Object.keys(result).sort()).toEqual(['errors', 'valid'])
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.errors.every(e => typeof e === 'string')).toBe(true)
    })
  })

  describe('input isolation', () => {
    it('does not mutate the input spec', async () => {
      const original = structuredClone(validSpec)
      const snapshot = JSON.stringify(original)
      await validateSpec(original)
      expect(JSON.stringify(original)).toBe(snapshot)
    })
  })
})
