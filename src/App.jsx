import { useState, useCallback } from 'react'
import Header from './components/Header'
import Footer from './components/Footer'
import SpecInput from './features/specInput/SpecInput'
import ValidationResults from './features/specValidation/ValidationResults'
import MetadataView from './features/metadataView/MetadataView'
import { validateSpec } from './features/specValidation/validateSpec'
import { parseSpec } from './features/specParsing/parseSpec'
import SchemaList from './features/schemaList/SchemaList'
import EndpointList from './features/endpointList/EndpointList'
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

        {/* Step 3: Main app view (FR4/FR5/FR6) */}
        {specData && specAccepted && apiModel && (
          <div className="api-view">
            {/* FR4: API Metadata */}
            <MetadataView
              apiModel={apiModel}
              source={specData.source}
            />

            {/* FR6: Schema aggregation */}
            <SchemaList schemas={apiModel.schemas} />

            {/* FR5: Endpoint aggregation */}
            <EndpointList
              endpoints={apiModel.endpoints}
              tags={apiModel.tags}
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
