import { parseSchemas } from './parseSchemas'
import { parseMetadata } from './parseMetadata'
import { parseEndpoints } from './parseEndpoints'

/**
 * Transforms a validated/dereferenced OpenAPI spec into the application's
 * internal API model.
 *
 * @param {object} validatedSpec - The spec returned by SwaggerParser.validate()
 * @returns {object} The internal API model
 */
export function parseSpec(validatedSpec) {
  const { schemas, schemaNameMatcher } = parseSchemas(validatedSpec)
  const { metadata, servers, tags, security } = parseMetadata(validatedSpec)
  const endpoints = parseEndpoints(validatedSpec, schemaNameMatcher)

  // Populate each schema's usedBy array by walking through all endpoints
  // and finding where component schemas are referenced.
  populateSchemaUsage(schemas, endpoints)

  return { metadata, servers, tags, endpoints, schemas, security }
}

/**
 * Walks each endpoint's parameters, requestBody, and responses to find
 * component schema references, then pushes usage records into the
 * matching schema's usedBy array.
 */
function populateSchemaUsage(schemas, endpoints) {
  const schemasByName = new Map(schemas.map((s) => [s.name, s]))

  for (const endpoint of endpoints) {
    const { path, method } = endpoint

    // Check parameters
    for (const param of endpoint.parameters) {
      if (param.schemaName && schemasByName.has(param.schemaName)) {
        schemasByName.get(param.schemaName).usedBy.push({
          path, method, location: `parameter:${param.name}`,
        })
      }
    }

    // Check requestBody content types
    if (endpoint.requestBody) {
      for (const [, mediaObj] of Object.entries(endpoint.requestBody.content)) {
        if (mediaObj.schemaName && schemasByName.has(mediaObj.schemaName)) {
          schemasByName.get(mediaObj.schemaName).usedBy.push({
            path, method, location: 'requestBody',
          })
        }
      }
    }

    // Check response content types
    for (const resp of endpoint.responses) {
      for (const [, mediaObj] of Object.entries(resp.content)) {
        if (mediaObj.schemaName && schemasByName.has(mediaObj.schemaName)) {
          schemasByName.get(mediaObj.schemaName).usedBy.push({
            path, method, location: `response:${resp.statusCode}`,
          })
        }
      }
    }
  }
}
