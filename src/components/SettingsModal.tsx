import { type FormEvent, useEffect, useState } from 'react'
import type { Settings } from '../types'
import { parseAmountInput } from '../utils/number'

interface SettingsModalProps {
  isOpen: boolean
  settings: Settings
  onClose: () => void
  onSave: (settings: Settings) => void
}

export const SettingsModal = ({ isOpen, settings, onClose, onSave }: SettingsModalProps) => {
  const [arsUsdOficial, setArsUsdOficial] = useState(settings.arsUsdOficial.toString())
  const [arsUsdFinanciero, setArsUsdFinanciero] = useState(settings.arsUsdFinanciero.toString())
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) {
      return
    }

    setArsUsdOficial(settings.arsUsdOficial.toString())
    setArsUsdFinanciero(settings.arsUsdFinanciero.toString())
    setError(null)
  }, [isOpen, settings])

  if (!isOpen) {
    return null
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const oficial = parseAmountInput(arsUsdOficial)
    const financiero = parseAmountInput(arsUsdFinanciero)

    if (oficial === null || financiero === null || oficial <= 0 || financiero <= 0) {
      setError('Ingresá tasas numéricas válidas mayores a cero.')
      return
    }

    onSave({
      arsUsdOficial: oficial,
      arsUsdFinanciero: financiero
    })

    onClose()
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <h2 id="settings-title">Ajustes</h2>

        <form onSubmit={handleSubmit} className="form-grid">
          <label htmlFor="ars-oficial">ARS/USD Oficial</label>
          <input
            id="ars-oficial"
            value={arsUsdOficial}
            onChange={(event) => setArsUsdOficial(event.target.value)}
            inputMode="decimal"
            required
          />

          <label htmlFor="ars-financiero">ARS/USD Financiero</label>
          <input
            id="ars-financiero"
            value={arsUsdFinanciero}
            onChange={(event) => setArsUsdFinanciero(event.target.value)}
            inputMode="decimal"
            required
          />

          <p className="modal-note">Se recalculan los USD automáticamente.</p>

          {error ? <p className="error-text">{error}</p> : null}

          <div className="modal-actions">
            <button type="button" className="pf-btn pf-btn-tertiary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="pf-btn pf-btn-primary">
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
