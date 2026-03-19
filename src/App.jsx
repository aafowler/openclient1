import { useState, useCallback } from 'react'
import Header from './components/Header'
import Footer from './components/Footer'
import SpecInput from './features/specInput/SpecInput'
import ValidationResults from './features/specValidation/ValidationResults'
import { validateSpec } from './features/specValidation/validateSpec'
import { parseSpec } from './features/specParsing/parseSpec'
import './App.css'

export default function App() {
  const [specData, setSpecData] = useState(null)                 // raw parsed spec + metadata
  const [validating, setValidating] = useState(false)            // true while validation runs
  const [validationResult, setValidationResult] = useState(null) // { valid, errors, spec? }
  const [apiModel, setApiModel] = useState(null)                 // parsed internal model

  const resetAll = useCallback(() => {
    setSpecData(null)
    setValidating(false)
    setValidationResult(null)
    setApiModel(null)
  }, [])

  async function handleSpecLoaded({ spec, format, source }) {
    setSpecData({ spec, format, source })
    setValidationResult(null)
    setApiModel(null)
    setValidating(true)

    const result = await validateSpec(spec)
    setValidating(false)
    setValidationResult(result)

    if (result.valid) {
      const model = parseSpec(result.spec)
      console.log('Parsed API model:', model) // TODO: remove debug log
      setApiModel(model)
    }
  }

  const specAccepted = validationResult?.valid

  return (
    <div className="app">
      <Header />
      <main>
        {/* Step 1: Input (FR1) */}
        {!specData && <SpecInput onSpecLoaded={handleSpecLoaded} />}

        {/* Step 2: Validation (FR2) */}
        {specData && (!specAccepted || validating) && (
          <ValidationResults
            validating={validating}
            result={validationResult}
            onReload={resetAll}
          />
        )}

        {/* Step 3: FR4 - API Metadata Aggregation (FR3+) */}
        {specData && specAccepted && apiModel && (
          <div className="spec-view">
            <section className="metadata-card">
              <header className="metadata-header">
                <div className="title-row">
                  <h1>{apiModel.metadata.title || 'Untitled Specification'}</h1>
                  <span className="badge version">v{apiModel.metadata.version}</span>
                  <span className="badge spec-type">{apiModel.metadata.openApiVersion}</span>
                </div>
                {apiModel.metadata.license && (
                  <small className="license-info">
                    License: <strong>{apiModel.metadata.license.name}</strong>
                  </small>
                )}
              </header>

              <p className="metadata-description">
                {apiModel.metadata.description || 'No description provided for this API.'}
              </p>

              {/* Server Information Section */}
              {apiModel.servers && apiModel.servers.length > 0 && (
                <div className="metadata-section">
                  <h3>Base Servers</h3>
                  <ul className="server-list">
                    {apiModel.servers.map((s, i) => (
                      <li key={i}>
                        <code>{s.url}</code>
                        {s.description && <span className="server-desc"> — {s.description}</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Tags / Categories Section */}
              {apiModel.tags && apiModel.tags.length > 0 && (
                <div className="metadata-section">
                  <h3>Tags</h3>
                  <div className="tag-cloud">
                    {apiModel.tags.map((tag, i) => (
                      <span key={i} className="tag-pill" title={tag.description}>
                        {tag.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <footer className="metadata-footer">
                <div className="stats-row">
                  <span><strong>{apiModel.endpoints.length}</strong> Endpoints</span>
                  <span><strong>{apiModel.schemas.length}</strong> Schemas</span>
                  <span>Source: <strong>{specData.source}</strong></span>
                </div>
                <button className="secondary-btn" onClick={resetAll}>
                  Load Different Spec
                </button>
              </footer>
            </section>
          </div>
        )}
      </main>
      <Footer />
    </div>
  )
}
