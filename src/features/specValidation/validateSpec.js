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

  if (!spec.paths && !spec.webhooks) {
    errors.push('Missing "paths" object. The spec should define at least one API path.')
  }

  // If basic structural checks already found issues, return early so the user can fix these basic problems first.
  if (errors.length > 0) {
    return { valid: false, errors }
  }

  // Schema validation via @apidevtools/swagger-parser.
  try {
    // Deep-clone so swagger-parser's internal mutations don't affect the caller's object.
    const clone = structuredClone(spec)
    const validated = await SwaggerParser.validate(clone)
    return { valid: true, errors: [], spec: validated }
  } catch (err) {
    // swagger-parser may throw a single error or an error with a `.details` array.
    if (err.details && Array.isArray(err.details)) {
      for (const detail of err.details) {
        errors.push(detail.message || String(detail))
      }
    } else {
      errors.push(err.message || String(err))
    }
    return { valid: false, errors }
  }
}
