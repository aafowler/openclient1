import { describe, it, expect } from 'vitest'
import { parseEndpoints } from '../../../src/features/specParsing/parseEndpoints.js'

// Stub matcher that always returns null (no schema name resolution)
const noopMatcher = () => null

// Helper to build a matcher that recognizes specific schema objects
function buildMatcher(schemaMap) {
  const map = new WeakMap()
  for (const [name, obj] of Object.entries(schemaMap)) {
    map.set(obj, name)
  }
  return (obj) => (obj && typeof obj === 'object' ? map.get(obj) || null : null)
}

describe('parseEndpoints', () => {
  describe('basic extraction', () => {
    it('extracts a single GET endpoint', () => {
      const spec = {
        openapi: '3.0.0',
        paths: {
          '/users': {
            get: {
              summary: 'List users',
              responses: { '200': { description: 'OK' } },
            },
          },
        },
      }
      const endpoints = parseEndpoints(spec, noopMatcher)
      expect(endpoints).toHaveLength(1)
      expect(endpoints[0].id).toBe('get-/users')
      expect(endpoints[0].path).toBe('/users')
      expect(endpoints[0].method).toBe('get')
      expect(endpoints[0].summary).toBe('List users')
    })

    it('extracts multiple methods on the same path', () => {
      const spec = {
        openapi: '3.0.0',
        paths: {
          '/items': {
            get: { responses: { '200': { description: 'OK' } } },
            post: { responses: { '201': { description: 'Created' } } },
          },
        },
      }
      const endpoints = parseEndpoints(spec, noopMatcher)
      expect(endpoints).toHaveLength(2)
      expect(endpoints[0].method).toBe('get')
      expect(endpoints[1].method).toBe('post')
    })

    it('ignores non-HTTP-method keys on path items', () => {
      const spec = {
        openapi: '3.0.0',
        paths: {
          '/items': {
            summary: 'Item operations',
            description: 'Not an HTTP method',
            get: { responses: { '200': { description: 'OK' } } },
          },
        },
      }
      const endpoints = parseEndpoints(spec, noopMatcher)
      expect(endpoints).toHaveLength(1)
    })

    it('returns empty array when no paths', () => {
      const endpoints = parseEndpoints({ openapi: '3.0.0' }, noopMatcher)
      expect(endpoints).toEqual([])
    })

    it('returns empty array for empty paths object', () => {
      const endpoints = parseEndpoints({ openapi: '3.0.0', paths: {} }, noopMatcher)
      expect(endpoints).toEqual([])
    })
  })

  describe('endpoint fields', () => {
    it('extracts all standard fields', () => {
      const spec = {
        openapi: '3.0.0',
        paths: {
          '/things': {
            get: {
              summary: 'Get things',
              description: 'Returns all things',
              operationId: 'getThings',
              tags: ['Things'],
              deprecated: true,
              security: [{ apiKey: [] }],
              responses: { '200': { description: 'OK' } },
            },
          },
        },
      }
      const ep = parseEndpoints(spec, noopMatcher)[0]
      expect(ep.summary).toBe('Get things')
      expect(ep.description).toBe('Returns all things')
      expect(ep.operationId).toBe('getThings')
      expect(ep.tags).toEqual(['Things'])
      expect(ep.deprecated).toBe(true)
      expect(ep.security).toEqual([{ apiKey: [] }])
    })

    it('defaults missing optional fields', () => {
      const spec = {
        openapi: '3.0.0',
        paths: {
          '/minimal': {
            get: { responses: { '200': { description: 'OK' } } },
          },
        },
      }
      const ep = parseEndpoints(spec, noopMatcher)[0]
      expect(ep.summary).toBe('')
      expect(ep.description).toBe('')
      expect(ep.operationId).toBe('')
      expect(ep.deprecated).toBe(false)
      expect(ep.security).toBeNull()
    })

    it('assigns "Untagged" when operation has no tags', () => {
      const spec = {
        openapi: '3.0.0',
        paths: {
          '/health': {
            get: { responses: { '200': { description: 'OK' } } },
          },
        },
      }
      const ep = parseEndpoints(spec, noopMatcher)[0]
      expect(ep.tags).toEqual(['Untagged'])
    })

    it('assigns "Untagged" when tags array is empty', () => {
      const spec = {
        openapi: '3.0.0',
        paths: {
          '/health': {
            get: { tags: [], responses: { '200': { description: 'OK' } } },
          },
        },
      }
      const ep = parseEndpoints(spec, noopMatcher)[0]
      expect(ep.tags).toEqual(['Untagged'])
    })
  })

  describe('parameter handling', () => {
    it('extracts operation-level parameters', () => {
      const spec = {
        openapi: '3.0.0',
        paths: {
          '/users': {
            get: {
              parameters: [
                { name: 'page', in: 'query', required: false, description: 'Page num', schema: { type: 'integer' } },
              ],
              responses: { '200': { description: 'OK' } },
            },
          },
        },
      }
      const ep = parseEndpoints(spec, noopMatcher)[0]
      expect(ep.parameters).toHaveLength(1)
      expect(ep.parameters[0]).toEqual({
        name: 'page',
        in: 'query',
        required: false,
        description: 'Page num',
        schema: { type: 'integer' },
        schemaName: null,
      })
    })

    it('inherits path-level parameters', () => {
      const spec = {
        openapi: '3.0.0',
        paths: {
          '/users/{id}': {
            parameters: [
              { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
            ],
            get: {
              responses: { '200': { description: 'OK' } },
            },
          },
        },
      }
      const ep = parseEndpoints(spec, noopMatcher)[0]
      expect(ep.parameters).toHaveLength(1)
      expect(ep.parameters[0].name).toBe('id')
      expect(ep.parameters[0].in).toBe('path')
    })

    it('operation parameters override path parameters with same name+in', () => {
      const spec = {
        openapi: '3.0.0',
        paths: {
          '/users/{id}': {
            parameters: [
              { name: 'id', in: 'path', required: true, description: 'path-level', schema: { type: 'string' } },
            ],
            get: {
              parameters: [
                { name: 'id', in: 'path', required: true, description: 'operation-level', schema: { type: 'integer' } },
              ],
              responses: { '200': { description: 'OK' } },
            },
          },
        },
      }
      const ep = parseEndpoints(spec, noopMatcher)[0]
      expect(ep.parameters).toHaveLength(1)
      expect(ep.parameters[0].description).toBe('operation-level')
      expect(ep.parameters[0].schema).toEqual({ type: 'integer' })
    })

    it('merges path and operation parameters with different name+in', () => {
      const spec = {
        openapi: '3.0.0',
        paths: {
          '/users/{id}': {
            parameters: [
              { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
            ],
            get: {
              parameters: [
                { name: 'include', in: 'query', schema: { type: 'string' } },
              ],
              responses: { '200': { description: 'OK' } },
            },
          },
        },
      }
      const ep = parseEndpoints(spec, noopMatcher)[0]
      expect(ep.parameters).toHaveLength(2)
      expect(ep.parameters.map(p => p.name).sort()).toEqual(['id', 'include'])
    })

    it('resolves schema names via the matcher', () => {
      const UserSchema = { type: 'object' }
      const matcher = buildMatcher({ User: UserSchema })
      const spec = {
        openapi: '3.0.0',
        paths: {
          '/users': {
            get: {
              parameters: [
                { name: 'filter', in: 'query', schema: UserSchema },
              ],
              responses: { '200': { description: 'OK' } },
            },
          },
        },
      }
      const ep = parseEndpoints(spec, matcher)[0]
      expect(ep.parameters[0].schemaName).toBe('User')
    })

    it('sets schemaName to null for parameters without schema', () => {
      const spec = {
        openapi: '3.0.0',
        paths: {
          '/users': {
            get: {
              parameters: [{ name: 'q', in: 'query' }],
              responses: { '200': { description: 'OK' } },
            },
          },
        },
      }
      const ep = parseEndpoints(spec, noopMatcher)[0]
      expect(ep.parameters[0].schema).toBeNull()
      expect(ep.parameters[0].schemaName).toBeNull()
    })
  })

  describe('requestBody handling', () => {
    it('extracts OpenAPI 3.x requestBody', () => {
      const bodySchema = { type: 'object', properties: { name: { type: 'string' } } }
      const spec = {
        openapi: '3.0.0',
        paths: {
          '/users': {
            post: {
              requestBody: {
                required: true,
                description: 'User to create',
                content: {
                  'application/json': { schema: bodySchema, example: { name: 'Alice' } },
                },
              },
              responses: { '201': { description: 'Created' } },
            },
          },
        },
      }
      const ep = parseEndpoints(spec, noopMatcher)[0]
      expect(ep.requestBody).toEqual({
        required: true,
        description: 'User to create',
        content: {
          'application/json': {
            schema: bodySchema,
            schemaName: null,
            example: { name: 'Alice' },
          },
        },
      })
    })

    it('returns null requestBody when not present', () => {
      const spec = {
        openapi: '3.0.0',
        paths: {
          '/users': {
            get: { responses: { '200': { description: 'OK' } } },
          },
        },
      }
      const ep = parseEndpoints(spec, noopMatcher)[0]
      expect(ep.requestBody).toBeNull()
    })

    it('resolves schema name in requestBody content', () => {
      const UserSchema = { type: 'object' }
      const matcher = buildMatcher({ User: UserSchema })
      const spec = {
        openapi: '3.0.0',
        paths: {
          '/users': {
            post: {
              requestBody: {
                content: { 'application/json': { schema: UserSchema } },
              },
              responses: { '201': { description: 'Created' } },
            },
          },
        },
      }
      const ep = parseEndpoints(spec, matcher)[0]
      expect(ep.requestBody.content['application/json'].schemaName).toBe('User')
    })
  })

  describe('response handling', () => {
    it('extracts responses with status codes and content', () => {
      const spec = {
        openapi: '3.0.0',
        paths: {
          '/users': {
            get: {
              responses: {
                '200': {
                  description: 'Success',
                  content: {
                    'application/json': {
                      schema: { type: 'array' },
                      example: [{ id: 1 }],
                    },
                  },
                },
                '404': { description: 'Not found' },
              },
            },
          },
        },
      }
      const ep = parseEndpoints(spec, noopMatcher)[0]
      expect(ep.responses).toHaveLength(2)
      expect(ep.responses[0].statusCode).toBe('200')
      expect(ep.responses[0].description).toBe('Success')
      expect(ep.responses[0].content['application/json'].schema).toEqual({ type: 'array' })
      expect(ep.responses[0].content['application/json'].example).toEqual([{ id: 1 }])
      expect(ep.responses[1].statusCode).toBe('404')
      expect(ep.responses[1].description).toBe('Not found')
      expect(ep.responses[1].content).toEqual({})
    })

    it('returns empty array when responses is missing', () => {
      const spec = {
        openapi: '3.0.0',
        paths: {
          '/users': {
            get: {},
          },
        },
      }
      const ep = parseEndpoints(spec, noopMatcher)[0]
      expect(ep.responses).toEqual([])
    })

    it('includes headers in response when present', () => {
      const headers = { 'X-Rate-Limit': { schema: { type: 'integer' } } }
      const spec = {
        openapi: '3.0.0',
        paths: {
          '/users': {
            get: {
              responses: {
                '200': { description: 'OK', headers },
              },
            },
          },
        },
      }
      const ep = parseEndpoints(spec, noopMatcher)[0]
      expect(ep.responses[0].headers).toBe(headers)
    })

    it('resolves schema name in response content', () => {
      const ErrorSchema = { type: 'object' }
      const matcher = buildMatcher({ Error: ErrorSchema })
      const spec = {
        openapi: '3.0.0',
        paths: {
          '/users': {
            get: {
              responses: {
                '400': {
                  description: 'Bad request',
                  content: { 'application/json': { schema: ErrorSchema } },
                },
              },
            },
          },
        },
      }
      const ep = parseEndpoints(spec, matcher)[0]
      expect(ep.responses[0].content['application/json'].schemaName).toBe('Error')
    })
  })

  describe('sorting', () => {
    it('sorts endpoints by path first, then by HTTP method order', () => {
      const spec = {
        openapi: '3.0.0',
        paths: {
          '/z': {
            post: { responses: { '201': { description: 'Created' } } },
            get: { responses: { '200': { description: 'OK' } } },
          },
          '/a': {
            delete: { responses: { '204': { description: 'Deleted' } } },
            get: { responses: { '200': { description: 'OK' } } },
          },
        },
      }
      const endpoints = parseEndpoints(spec, noopMatcher)
      expect(endpoints.map(e => e.id)).toEqual([
        'get-/a',
        'delete-/a',
        'get-/z',
        'post-/z',
      ])
    })
  })

  describe('Swagger 2.0 body parameter normalization', () => {
    it('converts body parameter into requestBody', () => {
      const bodySchema = { type: 'object', properties: { name: { type: 'string' } } }
      const spec = {
        swagger: '2.0',
        paths: {
          '/users': {
            post: {
              parameters: [
                { name: 'body', in: 'body', description: 'User object', schema: bodySchema },
              ],
              responses: { '201': { description: 'Created' } },
            },
          },
        },
      }
      const ep = parseEndpoints(spec, noopMatcher)[0]
      expect(ep.requestBody).toEqual({
        required: true,
        description: 'User object',
        content: {
          'application/json': {
            schema: bodySchema,
            schemaName: null,
            example: null,
          },
        },
      })
      // Body parameter should not appear in regular parameters
      expect(ep.parameters).toEqual([])
    })

    it('separates regular params from body params in Swagger 2.0', () => {
      const spec = {
        swagger: '2.0',
        paths: {
          '/users': {
            post: {
              parameters: [
                { name: 'page', in: 'query', schema: { type: 'integer' } },
                { name: 'body', in: 'body', schema: { type: 'object' } },
              ],
              responses: { '201': { description: 'Created' } },
            },
          },
        },
      }
      const ep = parseEndpoints(spec, noopMatcher)[0]
      expect(ep.parameters).toHaveLength(1)
      expect(ep.parameters[0].name).toBe('page')
      expect(ep.requestBody).not.toBeNull()
    })

    it('skips formData parameters', () => {
      const spec = {
        swagger: '2.0',
        paths: {
          '/upload': {
            post: {
              parameters: [
                { name: 'file', in: 'formData', type: 'file' },
                { name: 'name', in: 'query', schema: { type: 'string' } },
              ],
              responses: { '200': { description: 'OK' } },
            },
          },
        },
      }
      const ep = parseEndpoints(spec, noopMatcher)[0]
      expect(ep.parameters).toHaveLength(1)
      expect(ep.parameters[0].name).toBe('name')
      expect(ep.requestBody).toBeNull()
    })

    it('returns null requestBody when no body parameter in Swagger 2.0', () => {
      const spec = {
        swagger: '2.0',
        paths: {
          '/users': {
            get: {
              parameters: [{ name: 'q', in: 'query', schema: { type: 'string' } }],
              responses: { '200': { description: 'OK' } },
            },
          },
        },
      }
      const ep = parseEndpoints(spec, noopMatcher)[0]
      expect(ep.requestBody).toBeNull()
    })
  })
})
