import { useState, useRef } from 'react'
import yaml from 'js-yaml'
import './SpecInput.css'

const INPUT_METHODS = {
  PASTE: 'paste',
  FILE: 'file',
  URL: 'url',
}

/**
 * Attempts to parse raw text as JSON first, then falls back to YAML.
 * Returns { data, format } on success, or throws with a descriptive message.
 */
function parseSpec(raw) {
  // Try JSON first since it's a subset of YAML
  try {
    const data = JSON.parse(raw)
    if (data && typeof data === 'object') {
      return { data, format: 'json' }
    }
  } catch {
    // Not valid JSON; try YAML
  }

  try {
    const data = yaml.load(raw)
    if (data && typeof data === 'object') {
      return { data, format: 'yaml' }
    }
    throw new Error('Content parsed but is not a valid object structure.')
  } catch (e) {
    throw new Error(`Unable to parse as JSON or YAML: ${e.message}`)
  }
}

export default function SpecInput({ onSpecLoaded }) {
  const [activeMethod, setActiveMethod] = useState(INPUT_METHODS.PASTE)
  const [pasteContent, setPasteContent] = useState('')
  const [urlValue, setUrlValue] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const fileInputRef = useRef(null)

  /**
   * Central handler: takes raw spec text, parses it, and passes
   * the result up to the parent via onSpecLoaded.
   */
  function handleSpec(raw, source) {
    setError(null)
    try {
      const { data, format } = parseSpec(raw)
      onSpecLoaded({ spec: data, format, source })
    } catch (e) {
      setError(e.message)
    }
  }

  function handlePasteSubmit() {
    if (!pasteContent.trim()) {
      setError('Please paste an OpenAPI specification.')
      return
    }
    handleSpec(pasteContent, 'paste')
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return

    // Only accept files that look like JSON or YAML
    const validExtensions = ['.json', '.yaml', '.yml']
    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase()
    if (!validExtensions.includes(ext)) {
      setError('Please upload a .json, .yaml, or .yml file.')
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => handleSpec(event.target.result, `file:${file.name}`)
    reader.onerror = () => setError('Failed to read file.')
    reader.readAsText(file)
  }

  async function handleUrlSubmit() {
    const trimmed = urlValue.trim()
    if (!trimmed) {
      setError('Please enter a URL.')
      return
    }

    setError(null)
    setLoading(true)
    try {
      const response = await fetch(trimmed)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      const raw = await response.text()
      handleSpec(raw, `url:${trimmed}`)
    } catch (e) {
      if (e instanceof TypeError) {
        setError('Failed to fetch spec: The URL may not allow cross-origin requests (CORS), or the server may be unreachable.')
      } else {
        setError(`Failed to fetch spec: ${e.message}`)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="spec-input">
      <h2>Load OpenAPI Specification</h2>

      {/* Tab bar for switching between the three input methods */}
      <div className="spec-input-tabs" role="tablist">
        {Object.entries(INPUT_METHODS).map(([key, value]) => (
          <button
            key={value}
            role="tab"
            aria-selected={activeMethod === value}
            className={`spec-input-tab ${activeMethod === value ? 'active' : ''}`}
            onClick={() => { setActiveMethod(value); setError(null) }}
          >
            {key.charAt(0) + key.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {/* Panel content changes based on active tab */}
      <div className="spec-input-panel" role="tabpanel">
        {activeMethod === INPUT_METHODS.PASTE && (
          <div className="spec-input-paste">
            <textarea
              value={pasteContent}
              onChange={(e) => setPasteContent(e.target.value)}
              placeholder="Paste your OpenAPI spec (JSON or YAML)..."
              rows={12}
            />
            <button onClick={handlePasteSubmit} className="spec-input-submit">
              Load Spec
            </button>
          </div>
        )}

        {activeMethod === INPUT_METHODS.FILE && (
          <div className="spec-input-file">
            <p>Upload a <code>.json</code>, <code>.yaml</code>, or <code>.yml</code> file.</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.yaml,.yml"
              onChange={handleFileChange}
            />
          </div>
        )}

        {activeMethod === INPUT_METHODS.URL && (
          <div className="spec-input-url">
            <input
              type="url"
              value={urlValue}
              onChange={(e) => setUrlValue(e.target.value)}
              placeholder="https://example.com/openapi.json"
              onKeyDown={(e) => e.key === 'Enter' && handleUrlSubmit()}
            />
            <button
              onClick={handleUrlSubmit}
              className="spec-input-submit"
              disabled={loading}
            >
              {loading ? 'Fetching...' : 'Fetch Spec'}
            </button>
          </div>
        )}
      </div>

      {error && <p className="spec-input-error" role="alert">{error}</p>}
    </section>
  )
}
