import { useState } from 'react'
import SchemaDetail from './SchemaDetail'
import './SchemaList.css'

/**
 * Displays all API data models/schemas with type info, usage counts,
 * search filtering, and expandable detail panels.
 *
 * @param {object} props
 * @param {Array} props.schemas - Schema array from apiModel.schemas
 */
export default function SchemaList({ schemas }) {
  const [expandedIds, setExpandedIds] = useState(new Set())
  const [searchTerm, setSearchTerm] = useState('')

  function toggleExpanded(name) {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(name)) {
        next.delete(name)
      } else {
        next.add(name)
      }
      return next
    })
  }

  function handleRowKeyDown(e, name) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      toggleExpanded(name)
    }
  }

  // Filter schemas before rendering
  const filtered = searchTerm
    ? schemas.filter((entry) => {
        const term = searchTerm.toLowerCase()
        const props = Object.values(entry.schema.properties || {})
        return (
          entry.name.toLowerCase().includes(term) ||
          (entry.schema.type || '').toLowerCase().includes(term) ||
          Object.keys(entry.schema.properties || {}).some((prop) =>
            prop.toLowerCase().includes(term)
          ) ||
          props.some((p) =>
            (p.type || '').toLowerCase().includes(term) ||
            (p.format || '').toLowerCase().includes(term) ||
            (p.description || '').toLowerCase().includes(term) ||
            (p.enum || []).some((v) => String(v).toLowerCase().includes(term))
          ) ||
          (entry.schema.enum || []).some((v) => String(v).toLowerCase().includes(term))
        )
      })
    : schemas

  function expandAll() {
    setExpandedIds(new Set(filtered.map((entry) => entry.name)))
  }

  function collapseAll() {
    setExpandedIds(new Set())
  }

  return (
    <section className="schema-list">
      <h2>Schemas ({schemas.length})</h2>

      {/* Search bar */}
      <div className="schema-list-search">
        <input
          type="text"
          className="schema-list-search-input"
          placeholder="Filter schemas..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        {searchTerm && (
          <button
            className="schema-list-search-clear"
            onClick={() => setSearchTerm('')}
            aria-label="Clear search"
          >
            &times;
          </button>
        )}
      </div>

      {/* Toolbar */}
      <div className="schema-list-toolbar">
        <span className="schema-list-count">
          {searchTerm
            ? `Showing ${filtered.length} of ${schemas.length} ${schemas.length === 1 ? 'schema' : 'schemas'}`
            : `${schemas.length} ${schemas.length === 1 ? 'schema' : 'schemas'}`}
        </span>
        <div className="schema-list-toolbar-actions">
          <button className="schema-list-toolbar-btn" onClick={expandAll}>
            Expand all
          </button>
          <button className="schema-list-toolbar-btn" onClick={collapseAll}>
            Collapse all
          </button>
        </div>
      </div>

      {/* Schema list */}
      <ul className="schema-list-items">
        {filtered.map((entry) => {
          const isExpanded = expandedIds.has(entry.name)
          return (
            <li key={entry.name} className="schema-list-entry">
              <div
                className={`schema-list-item${isExpanded ? ' schema-list-item--expanded' : ''}`}
                role="button"
                tabIndex={0}
                aria-expanded={isExpanded}
                onClick={() => toggleExpanded(entry.name)}
                onKeyDown={(e) => handleRowKeyDown(e, entry.name)}
              >
                <span className="schema-list-chevron">
                  {isExpanded ? '\u25BC' : '\u25B6'}
                </span>
                <div className="schema-list-header">
                  <h3 className="schema-list-name">{entry.name}</h3>
                  {entry.schema.type && (
                    <span className="schema-list-type">{entry.schema.type}</span>
                  )}
                </div>
                <p className="schema-list-summary">
                  {summarizeSchema(entry.schema)}
                </p>
                <p className="schema-list-usage">
                  Used by {entry.usedBy.length} {entry.usedBy.length === 1 ? 'endpoint' : 'endpoints'}
                </p>
              </div>
              {isExpanded && (
                <SchemaDetail schema={entry.schema} usedBy={entry.usedBy} />
              )}
            </li>
          )
        })}
      </ul>

      {filtered.length === 0 && (
        <p className="schema-list-empty">No schemas match your search.</p>
      )}
    </section>
  )
}

/**
 * Produces a short summary string for a schema based on its type.
 */
function summarizeSchema(schema) {
  if (schema.type === 'object') {
    const propCount = Object.keys(schema.properties || {}).length
    return `${propCount} ${propCount === 1 ? 'property' : 'properties'}`
  }

  if (schema.type === 'array' && schema.items) {
    const itemType = schema.items.type || 'object'
    return `array of ${itemType}`
  }

  if (schema.enum) {
    const preview = schema.enum.slice(0, 4).join(', ')
    const more = schema.enum.length > 4 ? `, +${schema.enum.length - 4} more` : ''
    return `enum: ${preview}${more}`
  }

  return schema.type || 'unknown type'
}
