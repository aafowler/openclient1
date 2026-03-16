const HTTP_METHODS = ['get', 'post', 'put', 'delete', 'patch', 'options', 'head', 'trace']

/**
 * Extracts and flattens all API endpoints from a validated/dereferenced OpenAPI spec.
 *
 * Each path × method combination becomes one endpoint object. Path-level parameters
 * are merged with operation-level parameters (operation params take precedence).
 * Swagger 2.0 body/formData parameters are normalized into the requestBody structure.
 *
 * @param {object} spec - The validated, dereferenced OpenAPI spec
 * @param {function} schemaNameMatcher - Maps a schema object to its component name (or null)
 * @returns {Array} Flat array of endpoint objects, sorted by path then method
 */
export function parseEndpoints(spec, schemaNameMatcher) {
  const endpoints = []
  const paths = spec.paths || {}

  for (const [path, pathItem] of Object.entries(paths)) {
    // Path-level parameters are shared across all operations on this path.
    const pathParams = pathItem.parameters || []

    for (const method of HTTP_METHODS) {
      const operation = pathItem[method]
      if (!operation) continue

      // Merge path-level and operation-level parameters.
      // Operation params override path params with the same name + in.
      const mergedParams = mergeParameters(pathParams, operation.parameters || [])

      // Separate body/formData params (Swagger 2.0) from regular params.
      const { parameters, requestBody } = spec.swagger
        ? extractSwagger2Body(mergedParams, schemaNameMatcher)
        : { parameters: buildParameters(mergedParams, schemaNameMatcher), requestBody: buildRequestBody(operation.requestBody, schemaNameMatcher) }

      endpoints.push({
        id: `${method}-${path}`,
        path,
        method,
        summary: operation.summary || '',
        description: operation.description || '',
        operationId: operation.operationId || '',
        tags: operation.tags?.length ? operation.tags : ['Untagged'],
        deprecated: operation.deprecated || false,
        parameters,
        requestBody,
        responses: buildResponses(operation.responses, schemaNameMatcher),
        security: operation.security || null,
      })
    }
  }

  // Sort by path, then by method order.
  endpoints.sort((a, b) =>
    a.path.localeCompare(b.path) || HTTP_METHODS.indexOf(a.method) - HTTP_METHODS.indexOf(b.method)
  )

  return endpoints
}

/**
 * Merges path-level and operation-level parameters.
 * Operation params override path params that share the same name + in combination.
 */
function mergeParameters(pathParams, operationParams) {
  const merged = new Map()

  for (const param of pathParams) {
    merged.set(`${param.name}:${param.in}`, param)
  }
  for (const param of operationParams) {
    merged.set(`${param.name}:${param.in}`, param)
  }

  return Array.from(merged.values())
}

/**
 * Builds the normalized parameters array from merged OpenAPI 3.x parameters.
 */
function buildParameters(params, schemaNameMatcher) {
  return params.map((p) => ({
    name: p.name,
    in: p.in,
    required: p.required || false,
    description: p.description || '',
    schema: p.schema || null,
    schemaName: p.schema ? schemaNameMatcher(p.schema) : null,
  }))
}

/**
 * Builds the normalized requestBody object from an OpenAPI 3.x requestBody.
 */
function buildRequestBody(reqBody, schemaNameMatcher) {
  if (!reqBody) return null

  const content = {}
  for (const [mediaType, mediaObj] of Object.entries(reqBody.content || {})) {
    content[mediaType] = {
      schema: mediaObj.schema || null,
      schemaName: mediaObj.schema ? schemaNameMatcher(mediaObj.schema) : null,
      example: mediaObj.example || null,
    }
  }

  return {
    required: reqBody.required || false,
    description: reqBody.description || '',
    content,
  }
}

/**
 * Builds the normalized responses array from an OpenAPI responses object.
 */
function buildResponses(responses, schemaNameMatcher) {
  if (!responses) return []

  return Object.entries(responses).map(([statusCode, resp]) => {
    const content = {}
    for (const [mediaType, mediaObj] of Object.entries(resp.content || {})) {
      content[mediaType] = {
        schema: mediaObj.schema || null,
        schemaName: mediaObj.schema ? schemaNameMatcher(mediaObj.schema) : null,
        example: mediaObj.example || null,
      }
    }

    return {
      statusCode,
      description: resp.description || '',
      content,
      headers: resp.headers || null,
    }
  })
}

/**
 * Handles Swagger 2.0 specs where request bodies are defined as
 * body/formData parameters rather than a dedicated requestBody field.
 * Splits params into regular parameters and a normalized requestBody.
 */
function extractSwagger2Body(params, schemaNameMatcher) {
  const regularParams = []
  let bodySchema = null
  let bodyDescription = ''

  for (const param of params) {
    if (param.in === 'body') {
      bodySchema = param.schema || null
      bodyDescription = param.description || ''
    } else if (param.in !== 'formData') {
      regularParams.push(param)
    }
    // formData params are skipped for now - they don't map cleanly
    // to a single requestBody - can add later if wanted.
  }

  const parameters = buildParameters(regularParams, schemaNameMatcher)

  let requestBody = null
  if (bodySchema) {
    requestBody = {
      required: true,
      description: bodyDescription,
      content: {
        'application/json': {
          schema: bodySchema,
          schemaName: schemaNameMatcher(bodySchema),
          example: null,
        },
      },
    }
  }

  return { parameters, requestBody }
}
