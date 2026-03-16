/**
 * Extracts API-level metadata, servers, tags, and global security
 * from a validated OpenAPI spec.
 *
 * Handles both OpenAPI 3.x and Swagger 2.0 formats, normalizing
 * Swagger 2.0's host/basePath into the OpenAPI 3.x servers structure.
 *
 * @param {object} spec - The validated, dereferenced OpenAPI spec
 * @returns {{ metadata: object, servers: Array, tags: Array, security: Array|null }}
 */
export function parseMetadata(spec) {
  const info = spec.info || {}

  const metadata = {
    title: info.title || '',
    version: info.version || '',
    description: info.description || '',
    termsOfService: info.termsOfService || '',
    contact: info.contact ? {
      name: info.contact.name || '',
      url: info.contact.url || '',
      email: info.contact.email || '',
    } : null,
    license: info.license ? {
      name: info.license.name || '',
      url: info.license.url || '',
    } : null,
    openApiVersion: spec.openapi || spec.swagger || '',
  }

  // OpenAPI 3.x defines servers directly; Swagger 2.0 uses host + basePath.
  let servers = []
  if (spec.servers && spec.servers.length > 0) {
    servers = spec.servers.map((s) => ({
      url: s.url || '',
      description: s.description || '',
    }))
  } else if (spec.host) {
    const scheme = spec.schemes?.[0] || 'https'
    const basePath = spec.basePath || ''
    servers = [{ url: `${scheme}://${spec.host}${basePath}`, description: '' }]
  }

  const tags = (spec.tags || []).map((t) => ({
    name: t.name || '',
    description: t.description || '',
  }))

  const security = spec.security || null

  return { metadata, servers, tags, security }
}
