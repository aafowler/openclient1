import SwaggerParser from '@apidevtools/swagger-parser'

/**
 * Validates a parsed OpenAPI specification object against the OpenAPI standard
 * using swagger-parser for full schema validation.
 *
 * Returns an object with `valid` (boolean), `errors` (array of error messages),
 * and `spec` (the validated/dereferenced spec if valid).
 */
export async function validateSpec(spec) {
  const errors = []

  // Structural checks before running full validation
  if (!spec || typeof spec !== 'object') {
    return { valid: false, errors: ['Specification must be a JSON/YAML object.'] }
  }

  if (!spec.openapi && !spec.swagger) {
    errors.push(
      'Missing "openapi" or "swagger" version field. A valid OpenAPI spec must include an "openapi" (3.x) or "swagger" (2.0) property at the root level.'
    )
  }

  if (!spec.info) {
    errors.push('Missing required "info" object. The spec must contain an "info" section with at least "title" and "version".')
  } else {
    if (!spec.info.title) {
      errors.push('Missing required "info.title" field.')
    }
    if (!spec.info.version) {
      errors.push('Missing required "info.version" field.')
    }
  }

  if (!spec.paths && !spec.webhooks && !spec.components) {
    errors.push('Missing required field: the spec must contain at least one of "paths", "webhooks", or "components".')
  }

  // If basic structural checks already found issues, return early so the user can fix these basic problems first.
  if (errors.length > 0) {
    return { valid: false, errors }
  }

  // Schema validation via @apidevtools/swagger-parser.
  // Validates against the OpenAPI JSON Schema, resolves $ref pointers and detects invalid data types or structural errors.
  try {
    const clone = structuredClone(spec)
    const validated = await SwaggerParser.validate(clone)
    return { valid: true, errors: [], spec: validated }
  } catch (err) {
    // swagger-parser may throw a single error or an error with a `.details` array
    // of Ajv validation errors. Each detail has `instancePath` (JSON pointer to the
    // location in the spec) and `message` (what's wrong).
    if (err.details && Array.isArray(err.details)) {
      const seen = new Set()
      for (const detail of err.details) {
        // Filter out oneOf/$ref noise - these are Ajv reporting every unmatched
        // branch of a oneOf, not actionable errors on their own.
        if (detail.keyword === 'oneOf' || (detail.keyword === 'required' && detail.params?.missingProperty === '$ref')) {
          continue
        }

        // Decode JSON Pointer encoding (~1 = /, ~0 = ~) for readability.
        const path = (detail.instancePath || '/').replace(/~1/g, '/').replace(/~0/g, '~')
        const msg = `${path}: ${detail.message}`
        if (!seen.has(msg)) {
          seen.add(msg)
          errors.push(msg)
        }
      }
    } else {
      errors.push(err.message || String(err))
    }
    return { valid: false, errors }
  }
}
