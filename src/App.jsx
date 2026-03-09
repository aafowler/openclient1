import { useState } from 'react'
import Header from './components/Header'
import Footer from './components/Footer'
import SpecInput from './features/specInput/SpecInput'
import './App.css'

export default function App() {
  // The loaded spec will be used by future features. For now, it's just stored in state.
  const [specData, setSpecData] = useState(null)

  function handleSpecLoaded({ spec, format, source }) {
    console.log('[openclient] Spec loaded:', { spec, format, source }) // TODO: remove debug log
    setSpecData({ spec, format, source })
  }

  return (
    <div className="app">
      <Header />
      <main>
        {/* Show spec input form, or a loaded confirmation once a spec is provided.
            `handleSpecLoaded()` passed as callback
            TODO: Replace "spec-loaded" placeholder below with spec viewer */}
        {!specData
          ? <SpecInput onSpecLoaded={handleSpecLoaded} />
          : (
              <div className="spec-loaded">
                <h2>{specData.spec.info?.title || 'Specification Loaded'}</h2>
                <p>
                  Format: <strong>{specData.format.toUpperCase()}</strong>
                  {' | '}
                  Source: <strong>{specData.source}</strong>
                </p>
                <button onClick={() => setSpecData(null)}>Load a different spec</button>
              </div>
            )
        }
      </main>
      <Footer />
    </div>
  )
}
