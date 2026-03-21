import './MetadataView.css'

export default function MetadataView({ apiModel, source }) {
  const { metadata, servers, tags, endpoints, schemas } = apiModel;

  return (
    <div className="spec-view">
      <section className="metadata-card">
        <header className="metadata-header">
          <div className="title-row">
            <h1>{metadata.title || 'Untitled Specification'}</h1>
            <span className="badge version">v{metadata.version}</span>
            <span className="badge spec-type">{metadata.openApiVersion}</span>
          </div>
          {metadata.license && (
            <small className="license-info">
              License: <strong>{metadata.license.name}</strong>
            </small>
          )}
        </header>

        <p className="metadata-description">
          {metadata.description || 'No description provided for this API.'}
        </p>

        {/* Server Information */}
        {servers && servers.length > 0 && (
          <div className="metadata-section">
            <h3>Base Servers</h3>
            <ul className="server-list">
              {servers.map((s, i) => (
                <li key={i}>
                  <code>{s.url}</code>
                  {s.description && <span className="server-desc"> — {s.description}</span>}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Tags / Categories */}
        {tags && tags.length > 0 && (
          <div className="metadata-section">
            <h3>Tags</h3>
            <div className="tag-cloud">
              {tags.map((tag, i) => (
                <span key={i} className="tag-pill" title={tag.description}>
                  {tag.name}
                </span>
              ))}
            </div>
          </div>
        )}

        <footer className="metadata-footer">
          <div className="stats-row">
            <span><strong>{endpoints.length}</strong> Endpoints</span>
            <span><strong>{schemas.length}</strong> Schemas</span>
            <span>Source: <strong>{source}</strong></span>
          </div>
        </footer>
      </section>
    </div>
  )
}