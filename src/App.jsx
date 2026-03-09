import { useState, useCallback } from 'react'
import Header from './components/Header'
import Footer from './components/Footer'
import SpecInput from './features/specInput/SpecInput'
import ValidationResults from './features/specValidation/ValidationResults'
import { validateSpec } from './features/specValidation/validateSpec'
import './App.css'

export default function App() {
  const [specData, setSpecData] = useState(null)                 // raw parsed spec + metadata
  const [validating, setValidating] = useState(false)            // true while validation runs
  const [validationResult, setValidationResult] = useState(null) // { valid, errors, spec? }

  const resetAll = useCallback(() => {
    setSpecData(null)
    setValidating(false)
    setValidationResult(null)
  }, [])

  async function handleSpecLoaded({ spec, format, source }) {
    setSpecData({ spec, format, source })
    setValidationResult(null)
    setValidating(true)

    const result = await validateSpec(spec)
    setValidating(false)
    setValidationResult(result)
  }

  const specAccepted = validationResult?.valid

  return (
    <div className="app">
      <Header />
      <main>
        {/* Input */}
        {!specData && <SpecInput onSpecLoaded={handleSpecLoaded} />}

        {/* Validation */}
        {specData && (!specAccepted || validating) && (
          <ValidationResults
            validating={validating}
            result={validationResult}
            onReload={resetAll}
          />
        )}

        {/* Confirmation */}
        {specData && specAccepted && (
          <div className="spec-loaded">
            <h2>{specData.spec.info?.title || 'Specification Loaded'}</h2>
            <p>
              Format: <strong>{specData.format.toUpperCase()}</strong>
              {' | '}
              Source: <strong>{specData.source}</strong>
            </p>
            <button onClick={resetAll}>Load a different spec</button>
          </div>
        )}
      </main>
      <Footer />
    </div>
  )
}
