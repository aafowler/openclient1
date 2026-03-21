import { useState, useCallback } from 'react'
import Header from './components/Header'
import Footer from './components/Footer'
import SpecInput from './features/specInput/SpecInput'
import ValidationResults from './features/specValidation/ValidationResults'
import MetadataView from './features/metadataView/MetadataView'
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
          <div className="spec-results-container">
            <MetadataView 
              apiModel={apiModel} 
              source={specData.source} 
            />
            
            <div className="action-bar">
              <button className="secondary-btn" onClick={resetAll}>
                Load Different Spec
              </button>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  )
}
