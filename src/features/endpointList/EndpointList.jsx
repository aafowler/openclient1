import { groupEndpointsByTag } from './groupEndpointsByTag'
import './EndpointList.css'

/**
 * Displays all API endpoints grouped by tag.
 *
 * @param {object} props
 * @param {Array} props.endpoints - Flat endpoint array from apiModel.endpoints
 * @param {Array} props.tags - Tag definitions from apiModel.tags
 */
export default function EndpointList({ endpoints, tags }) {
  const groups = groupEndpointsByTag(endpoints, tags)

  return (
    <section className="endpoint-list">
      <h2>Endpoints ({endpoints.length})</h2>

      {groups.map((group) => (
        <div key={group.name} className="endpoint-list-group">
          <h3 className="endpoint-list-tag">{group.name}</h3>
          {group.description && (
            <p className="endpoint-list-tag-desc">{group.description}</p>
          )}

          <ul className="endpoint-list-items">
            {group.endpoints.map((ep) => (
              <li key={ep.id} className="endpoint-list-item">
                <span className={`endpoint-list-method endpoint-list-method--${ep.method}`}>
                  {ep.method}
                </span>
                <span className="endpoint-list-path">{ep.path}</span>
                {ep.summary && (
                  <span className="endpoint-list-summary">{ep.summary}</span>
                )}
                {/* TODO: expandable detail panel (parameters, request body, responses) */}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  )
}
