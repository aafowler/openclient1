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
        </header>

        {/* Description */}
        <p className="metadata-description">
          {metadata.description || 'No description provided for this API.'}
        </p>

        {/* Contact */}
        {metadata.contact && (metadata.contact.name || metadata.contact.email || metadata.contact.url) && (
          <div className="metadata-section">
            <h3>Contact</h3>
            <div className="contact-info">
              {metadata.contact.name && <span className="contact-name">{metadata.contact.name}</span>}
              {metadata.contact.email && (
                <a href={`mailto:${metadata.contact.email}`} className="contact-link">{metadata.contact.email}</a>
              )}
              {metadata.contact.url && (
                <a href={metadata.contact.url} target="_blank" rel="noreferrer" className="contact-link">{metadata.contact.url}</a>
              )}
            </div>
          </div>
        )}

        {/* License */}
        {metadata.license && (
          <div className="metadata-section">
            <h3>License</h3>
            <p className="license-info">
              {metadata.license.url ? (
                <a href={metadata.license.url} target="_blank" rel="noreferrer" className="contact-link">
                  {metadata.license.name}
                </a>
              ) : (
                metadata.license.name
              )}
            </p>
          </div>
        )}

        {/* Servers */}
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