/**
 * Extracts component schemas from a validated/dereferenced OpenAPI spec
 * and builds a WeakMap-based name matcher for O(1) schema identification.
 *
 * swagger-parser's validate() replaces $ref pointers with direct object
 * references, so two places referencing the same component schema point
 * to the same JS object in memory. The WeakMap exploits this for fast
 * lookups during endpoint parsing.
 *
 * @param {object} spec - The validated, dereferenced OpenAPI spec
 * @returns {{ schemas: Array, schemaNameMatcher: function }}
 */
export function parseSchemas(spec) {
  const schemas = []
  const identityMap = new WeakMap()

  // OpenAPI 3.x uses components.schemas; Swagger 2.0 uses definitions.
  const rawSchemas = spec.components?.schemas || spec.definitions || {}

  for (const [name, schema] of Object.entries(rawSchemas)) {
    schemas.push({
      name,
      schema,
      usedBy: [], // populated later by the orchestrator
    })

    // Map the schema object reference to its component name.
    if (schema && typeof schema === 'object') {
      identityMap.set(schema, name)
    }
  }

  /**
   * Given a dereferenced schema object, returns the component schema name
   * if it matches a known component, or null otherwise.
   */
  function schemaNameMatcher(schemaObj) {
    if (!schemaObj || typeof schemaObj !== 'object') return null
    return identityMap.get(schemaObj) || null
  }

  return { schemas, schemaNameMatcher }
}
