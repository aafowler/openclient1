/**
 * Groups a flat array of endpoints by their tags, using the spec's
 * tag definitions for ordering and descriptions.
 *
 * Endpoints with multiple tags appear in each matching group.
 * Ad-hoc tags (used by endpoints but not defined in the spec) are appended.
 * "Untagged" is always placed last. Empty groups are filtered out.
 *
 * @param {Array} endpoints - Flat endpoint array from apiModel.endpoints
 * @param {Array} tags - Tag definitions from apiModel.tags
 * @returns {Array<{ name: string, description: string, endpoints: Array }>}
 */
export function groupEndpointsByTag(endpoints, tags) {
  // Seed the map with defined tags to preserve their spec-defined order.
  const groups = new Map()
  for (const tag of tags) {
    groups.set(tag.name, {
      name: tag.name,
      description: tag.description,
      endpoints: [],
    })
  }

  // Walk endpoints and place each into its tag group(s).
  for (const endpoint of endpoints) {
    for (const tagName of endpoint.tags) {
      if (!groups.has(tagName)) {
        groups.set(tagName, { name: tagName, description: '', endpoints: [] })
      }
      groups.get(tagName).endpoints.push(endpoint)
    }
  }

  // Build result: defined tags first, then ad-hoc tags, "Untagged" last.
  const result = []
  let untagged = null

  for (const group of groups.values()) {
    if (group.endpoints.length === 0) continue
    if (group.name === 'Untagged') {
      untagged = group
    } else {
      result.push(group)
    }
  }

  if (untagged) {
    result.push(untagged)
  }

  return result
}
