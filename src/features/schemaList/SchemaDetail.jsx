import './SchemaDetail.css'

const MAX_ENUM_DISPLAY = 5

/**
 * Returns a human-readable type string for a property schema.
 */
function formatPropertyType(propSchema) {
  if (!propSchema) return 'any'

  if (propSchema.type === 'array' && propSchema.items) {
    const itemType = propSchema.items.type || 'object'
    return `array of ${itemType}`
  }

  if (!propSchema.type && propSchema.properties) return 'object'

  const base = propSchema.type || 'any'
  if (propSchema.format) return `${base} (${propSchema.format})`
  return base
}

/**
 * Converts a usedBy location string to a human-readable label.
 *   "response:200"    → "Response 200"
 *   "requestBody"     → "Request Body"
 *   "parameter:limit" → "Parameter: limit"
 */
function formatLocation(location) {
  if (location === 'requestBody') return 'Request Body'
  if (location.startsWith('response:')) return `Response ${location.slice(9)}`
  if (location.startsWith('parameter:')) return `Parameter: ${location.slice(10)}`
  return location
}

/**
 * Expandable detail panel for a single schema.
 *
 * @param {object} props
 * @param {object} props.schema - The raw schema object
 * @param {Array} props.usedBy - Array of { path, method, location }
 */
export default function SchemaDetail({ schema, usedBy }) {
  const isObject = schema.type === 'object' || (!schema.type && schema.properties)
  const isTopLevelEnum = schema.enum && !schema.properties
  const required = schema.required || []
  const properties = schema.properties ? Object.entries(schema.properties) : []

  return (
    <div className="schema-detail">
      {/* Property table for object schemas */}
      {isObject && properties.length > 0 && (
        <div className="schema-detail-section">
          <h4>Properties</h4>
          <div className="schema-detail-table-wrap">
            <table className="schema-detail-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Required</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {properties.map(([name, propSchema]) => (
                  <tr key={name}>
                    <td className="schema-detail-prop-name">{name}</td>
                    <td className="schema-detail-type">
                      {formatPropertyType(propSchema)}
                      {propSchema.enum && (
                        <span className="schema-detail-enum-flag"> (enum)</span>
                      )}
                    </td>
                    <td>{required.includes(name) ? 'Yes' : 'No'}</td>
                    <td>
                      {propSchema.description || ''}
                      {propSchema.enum && (
                        <EnumValues values={propSchema.enum} />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Top-level enum (not an object with properties) */}
      {isTopLevelEnum && (
        <div className="schema-detail-section">
          <h4>Allowed Values</h4>
          <EnumValues values={schema.enum} />
        </div>
      )}

      {/* Array schema info */}
      {schema.type === 'array' && schema.items && (
        <div className="schema-detail-section">
          <h4>Items</h4>
          <p className="schema-detail-array-info">
            Type: <span className="schema-detail-type">{schema.items.type || 'object'}</span>
          </p>
        </div>
      )}

      {/* UsedBy section */}
      <div className="schema-detail-section">
        <h4>
          {usedBy.length === 0
            ? 'Not used by any endpoints'
            : usedBy.length === 1
              ? 'Used by 1 endpoint'
              : `Used by ${usedBy.length} endpoints`}
        </h4>
        {usedBy.length > 0 && (
          <ul className="schema-detail-used-by">
            {usedBy.map((ref, i) => (
              <li key={i} className="schema-detail-used-by-item">
                <span className={`schema-detail-method schema-detail-method--${ref.method}`}>
                  {ref.method}
                </span>
                <span className="schema-detail-path">{ref.path}</span>
                <span className="schema-detail-location">{formatLocation(ref.location)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

/**
 * Renders enum values as inline code badges, truncated if too many.
 */
function EnumValues({ values }) {
  const shown = values.slice(0, MAX_ENUM_DISPLAY)
  const remaining = values.length - MAX_ENUM_DISPLAY

  return (
    <div className="schema-detail-enum-values">
      {shown.map((val) => (
        <code key={val} className="schema-detail-enum-badge">{String(val)}</code>
      ))}
      {remaining > 0 && (
        <span className="schema-detail-enum-more">+{remaining} more</span>
      )}
    </div>
  )
}
