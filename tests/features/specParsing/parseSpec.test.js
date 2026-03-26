import { describe, it, expect } from 'vitest'
import { parseSpec } from '../../../src/features/specParsing/parseSpec.js'
import { validateSpec } from '../../../src/features/specValidation/validateSpec.js'
import richSpec from '../../../test-fixtures/rich-spec.json'
import validSpec from '../../../test-fixtures/valid-spec.json'

describe('parseSpec', () => {
  describe('integration with validated specs', () => {
    it('produces a complete apiModel from valid-spec.json', async () => {
      const { spec } = await validateSpec(structuredClone(validSpec))
      const model = parseSpec(spec)

      expect(model).toHaveProperty('metadata')
      expect(model).toHaveProperty('servers')
      expect(model).toHaveProperty('tags')
      expect(model).toHaveProperty('endpoints')
      expect(model).toHaveProperty('schemas')
      expect(model).toHaveProperty('security')
    })

    it('extracts metadata from rich-spec.json', async () => {
      const { spec } = await validateSpec(structuredClone(richSpec))
      const model = parseSpec(spec)

      expect(model.metadata.title).toBe('Rich Example API')
      expect(model.metadata.version).toBe('2.1.0')
      expect(model.metadata.description).toContain('feature-rich')
    })

    it('extracts all tags from rich-spec.json', async () => {
      const { spec } = await validateSpec(structuredClone(richSpec))
      const model = parseSpec(spec)

      expect(model.tags).toHaveLength(3)
      expect(model.tags.map(t => t.name)).toEqual(['Users', 'Posts', 'Admin'])
    })

    it('extracts all endpoints from rich-spec.json', async () => {
      const { spec } = await validateSpec(structuredClone(richSpec))
      const model = parseSpec(spec)

      // 8 endpoints: GET/POST /users, GET/DELETE /users/{userId},
      // GET/POST /posts, GET /admin/stats, GET /health
      expect(model.endpoints).toHaveLength(8)
    })

    it('extracts all schemas from rich-spec.json', async () => {
      const { spec } = await validateSpec(structuredClone(richSpec))
      const model = parseSpec(spec)

      expect(model.schemas.map(s => s.name).sort()).toEqual(['Error', 'Post', 'User'])
    })
  })

  describe('schema usage population', () => {
    it('tracks schema usage in response content', async () => {
      const { spec } = await validateSpec(structuredClone(richSpec))
      const model = parseSpec(spec)

      // rich-spec.json: GET /users/{userId} 200 returns $ref User directly
      const userSchema = model.schemas.find(s => s.name === 'User')
      expect(userSchema.usedBy.length).toBeGreaterThan(0)
      expect(userSchema.usedBy.some(u => u.location.startsWith('response:'))).toBe(true)
    })

    it('tracks schema usage in requestBody', async () => {
      const { spec } = await validateSpec(structuredClone(richSpec))
      const model = parseSpec(spec)

      // rich-spec.json: POST /users has requestBody with $ref User
      const userSchema = model.schemas.find(s => s.name === 'User')
      const requestBodyUsages = userSchema.usedBy.filter(u => u.location === 'requestBody')
      expect(requestBodyUsages.length).toBeGreaterThan(0)
      expect(requestBodyUsages.some(u => u.path === '/users' && u.method === 'post')).toBe(true)
    })

    it('tracks Error schema across multiple endpoints', async () => {
      const { spec } = await validateSpec(structuredClone(richSpec))
      const model = parseSpec(spec)

      // Error schema is used in 400/404/403 responses across many endpoints
      const errorSchema = model.schemas.find(s => s.name === 'Error')
      expect(errorSchema.usedBy.length).toBeGreaterThanOrEqual(5)
    })

    it('records correct path and method in usage entries', async () => {
      const { spec } = await validateSpec(structuredClone(richSpec))
      const model = parseSpec(spec)

      const postSchema = model.schemas.find(s => s.name === 'Post')
      for (const usage of postSchema.usedBy) {
        expect(usage).toHaveProperty('path')
        expect(usage).toHaveProperty('method')
        expect(usage).toHaveProperty('location')
        expect(usage.path).toMatch(/^\//)
      }
    })

    it('does not add usage for inline schemas (not component refs)', async () => {
      const { spec } = await validateSpec(structuredClone(richSpec))
      const model = parseSpec(spec)

      const allUsages = model.schemas.flatMap(s => s.usedBy)

      // /admin/stats has an inline 200 response schema and an Error 403 ref
      const statsUsages = allUsages.filter(u => u.path === '/admin/stats')
      expect(statsUsages).toHaveLength(1)
      expect(statsUsages[0].location).toBe('response:403')

      // /health has only inline schemas — no component refs at all
      const healthUsages = allUsages.filter(u => u.path === '/health')
      expect(healthUsages).toHaveLength(0)
    })
  })

  describe('Swagger 2.0 integration', () => {
    it('parses a Swagger 2.0 spec through the full pipeline', async () => {
      const swagger2 = {
        swagger: '2.0',
        info: { title: 'Legacy API', version: '1.0.0' },
        host: 'api.legacy.com',
        basePath: '/v1',
        schemes: ['https'],
        paths: {
          '/items': {
            get: {
              responses: { '200': { description: 'OK' } },
            },
          },
        },
        definitions: {
          Item: { type: 'object', properties: { id: { type: 'integer' } } },
        },
      }
      const { spec } = await validateSpec(swagger2)
      const model = parseSpec(spec)

      expect(model.metadata.openApiVersion).toBe('2.0')
      expect(model.servers[0].url).toBe('https://api.legacy.com/v1')
      expect(model.schemas).toHaveLength(1)
      expect(model.schemas[0].name).toBe('Item')
      expect(model.endpoints).toHaveLength(1)
    })
  })
})
