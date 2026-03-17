import { useState, useCallback } from 'react'
import { groupEndpointsByTag } from './groupEndpointsByTag'
import EndpointDetail from './EndpointDetail'
import './EndpointList.css'

/**
 * Displays all API endpoints grouped by tag, with search filtering
 * and expandable detail panels.
 *
 * @param {object} props
 * @param {Array} props.endpoints - Flat endpoint array from apiModel.endpoints
 * @param {Array} props.tags - Tag definitions from apiModel.tags
 */
export default function EndpointList({ endpoints, tags }) {
  const [expandedIds, setExpandedIds] = useState(new Set())
  const [searchTerm, setSearchTerm] = useState('')

  const toggleExpanded = useCallback((id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const handleRowKeyDown = useCallback((e, id) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      toggleExpanded(id)
    }
  }, [toggleExpanded])

  // Filter endpoints before grouping
  const filtered = searchTerm
    ? endpoints.filter((ep) => {
        const term = searchTerm.toLowerCase()
        return (
          ep.path.toLowerCase().includes(term) ||
          ep.method.includes(term) ||
          ep.summary.toLowerCase().includes(term) ||
          ep.operationId.toLowerCase().includes(term) ||
          ep.description.toLowerCase().includes(term) ||
          ep.tags.some((t) => t.toLowerCase().includes(term)) ||
          (ep.deprecated && 'deprecated'.includes(term))
        )
      })
    : endpoints

  const groups = groupEndpointsByTag(filtered, tags)

  function expandAll() {
    setExpandedIds(new Set(filtered.map((ep) => ep.id)))
  }

  function collapseAll() {
    setExpandedIds(new Set())
  }

  return (
    <section className="endpoint-list">
      <h2>Endpoints ({endpoints.length})</h2>

      {/* Search bar */}
      <div className="endpoint-list-search">
        <input
          type="text"
          className="endpoint-list-search-input"
          placeholder="Filter endpoints..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        {searchTerm && (
          <button
            className="endpoint-list-search-clear"
            onClick={() => setSearchTerm('')}
            aria-label="Clear search"
          >
            &times;
          </button>
        )}
      </div>

      {/* Toolbar */}
      <div className="endpoint-list-toolbar">
        <span className="endpoint-list-count">
          {searchTerm
            ? `Showing ${filtered.length} of ${endpoints.length} ${endpoints.length === 1 ? 'endpoint' : 'endpoints'}`
            : `${endpoints.length} ${endpoints.length === 1 ? 'endpoint' : 'endpoints'}`}
        </span>
        <div className="endpoint-list-toolbar-actions">
          <button className="endpoint-list-toolbar-btn" onClick={expandAll}>
            Expand all
          </button>
          <button className="endpoint-list-toolbar-btn" onClick={collapseAll}>
            Collapse all
          </button>
        </div>
      </div>

      {/* Grouped endpoint list */}
      {groups.map((group) => (
        <div key={group.name} className="endpoint-list-group">
          <h3 className="endpoint-list-tag">{group.name}</h3>
          {group.description && (
            <p className="endpoint-list-tag-desc">{group.description}</p>
          )}

          <ul className="endpoint-list-items">
            {group.endpoints.map((ep) => {
              const isExpanded = expandedIds.has(ep.id)
              return (
                <li key={ep.id} className="endpoint-list-entry">
                  <div
                    className={`endpoint-list-item${isExpanded ? ' endpoint-list-item--expanded' : ''}`}
                    role="button"
                    tabIndex={0}
                    aria-expanded={isExpanded}
                    onClick={() => toggleExpanded(ep.id)}
                    onKeyDown={(e) => handleRowKeyDown(e, ep.id)}
                  >
                    <span className="endpoint-list-chevron">
                      {isExpanded ? '\u25BC' : '\u25B6'}
                    </span>
                    <span className={`endpoint-list-method endpoint-list-method--${ep.method}`}>
                      {ep.method}
                    </span>
                    <span className="endpoint-list-path">{ep.path}</span>
                    {ep.deprecated && (
                      <span className="endpoint-list-deprecated-badge">deprecated</span>
                    )}
                    {ep.summary && (
                      <span className="endpoint-list-summary">{ep.summary}</span>
                    )}
                  </div>
                  {isExpanded && <EndpointDetail endpoint={ep} />}
                </li>
              )
            })}
          </ul>
        </div>
      ))}

      {filtered.length === 0 && (
        <p className="endpoint-list-empty">No endpoints match your search.</p>
      )}
    </section>
  )
}
