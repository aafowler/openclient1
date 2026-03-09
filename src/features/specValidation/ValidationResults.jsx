import './ValidationResults.css'

/**
 * Displays the outcome of OpenAPI spec validation.
 *
 * Props:
 *  - validating (bool): true while validation is in progress
 *  - result ({ valid, errors }): validation outcome, null before first run
 *  - onReload (() => void): callback to let the user load a different spec
 */
export default function ValidationResults({ validating, result, onReload }) {
  if (validating) {
    return (
      <section className="validation-results" aria-busy="true">
        <p className="validation-status">Validating specification...</p>
      </section>
    )
  }

  if (!result) return null

  return (
    <section className="validation-results">
      {result.valid ? (
        <div className="validation-success">
          <h3>Specification is valid</h3>
          <p>
            The provided OpenAPI specification passes all validation checks.
          </p>
        </div>
      ) : (
        <div className="validation-failure">
          <h3>Validation failed</h3>
          <p>
            The specification does not comply with OpenAPI standards.
            Please fix the following {result.errors.length === 1 ? 'error' : 'errors'}:
          </p>
          <ul className="validation-error-list">
            {result.errors.map((msg, i) => (
              <li key={i} className="validation-error-item">{msg}</li>
            ))}
          </ul>
        </div>
      )}

      <button className="validation-reload" onClick={onReload}>
        Load a different spec
      </button>
    </section>
  )
}
