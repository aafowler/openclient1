import './EndpointDetail.css'

/**
 * Returns a human-readable type string for a schema.
 */
function formatSchemaType(schema, schemaName) {
  if (schemaName) return schemaName
  if (!schema) return 'any'
  if (schema.type === 'array') {
    const itemType = schema.items
      ? formatSchemaType(schema.items, null)
      : 'any'
    return `array of ${itemType}`
  }
  return schema.type || 'object'
}

/**
 * Returns a CSS modifier class for an HTTP status code.
 */
function statusCodeClass(code) {
  const num = parseInt(code, 10)
  if (num >= 200 && num < 300) return 'endpoint-detail-status--2xx'
  if (num >= 300 && num < 400) return 'endpoint-detail-status--3xx'
  if (num >= 400 && num < 500) return 'endpoint-detail-status--4xx'
  return 'endpoint-detail-status--5xx'
}

/**
 * Expandable detail panel for a single endpoint.
 *
 * @param {object} props
 * @param {object} props.endpoint - A single endpoint from apiModel.endpoints
 */
export default function EndpointDetail({ endpoint }) {
  const {
    description,
    summary,
    operationId,
    deprecated,
    parameters,
    requestBody,
    responses,
  } = endpoint

  const showDescription = description && description !== summary

  return (
    <div className="endpoint-detail">
      {/* Header area */}
      {(showDescription || operationId || deprecated) && (
        <div className="endpoint-detail-header">
          {deprecated && (
            <span className="endpoint-detail-deprecated">Deprecated</span>
          )}
          {operationId && (
            <span className="endpoint-detail-operation-id">{operationId}</span>
          )}
          {showDescription && (
            <p className="endpoint-detail-description">{description}</p>
          )}
        </div>
      )}

      {/* Parameters */}
      {parameters.length > 0 && (
        <div className="endpoint-detail-section">
          <h4>
            {parameters.length === 1
              ? '1 Parameter'
              : `${parameters.length} Parameters`}
          </h4>
          <div className="endpoint-detail-table-wrap">
            <table className="endpoint-detail-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Location</th>
                  <th>Type</th>
                  <th>Required</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {parameters.map((param) => (
                  <tr key={`${param.in}-${param.name}`}>
                    <td className="endpoint-detail-param-name">
                      {param.name}
                    </td>
                    <td>
                      <span className="endpoint-detail-location">{param.in}</span>
                    </td>
                    <td className="endpoint-detail-type">
                      {formatSchemaType(param.schema, param.schemaName)}
                    </td>
                    <td>{param.required ? 'Yes' : 'No'}</td>
                    <td>{param.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Request Body */}
      {requestBody && (
        <div className="endpoint-detail-section">
          <h4>
            Request Body
            {requestBody.required && (
              <span className="endpoint-detail-required">required</span>
            )}
          </h4>
          {requestBody.description && (
            <p className="endpoint-detail-body-desc">{requestBody.description}</p>
          )}
          {Object.entries(requestBody.content).map(([mediaType, media]) => (
            <div key={mediaType} className="endpoint-detail-media">
              <code className="endpoint-detail-media-type">{mediaType}</code>
              <span className="endpoint-detail-type">
                {formatSchemaType(media.schema, media.schemaName)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Responses */}
      {responses.length > 0 && (
        <div className="endpoint-detail-section">
          <h4>
            {responses.length === 1
              ? '1 Response'
              : `${responses.length} Responses`}
          </h4>
          <div className="endpoint-detail-responses">
            {responses.map((resp) => (
              <div key={resp.statusCode} className="endpoint-detail-response">
                <span className={`endpoint-detail-status ${statusCodeClass(resp.statusCode)}`}>
                  {resp.statusCode}
                </span>
                <span className="endpoint-detail-response-desc">
                  {resp.description}
                </span>
                {Object.entries(resp.content).map(([mediaType, media]) => (
                  <span key={mediaType} className="endpoint-detail-response-media">
                    <code>{mediaType}</code>
                    {' '}
                    <span className="endpoint-detail-type">
                      {formatSchemaType(media.schema, media.schemaName)}
                    </span>
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
