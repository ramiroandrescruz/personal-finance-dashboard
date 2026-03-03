import { type FormEvent, useEffect, useState } from 'react'
import { HOLDING_TYPES } from '../types'
import type { HoldingRow, HoldingType } from '../types'
import { parseAmountInput } from '../utils/number'

interface AddRowModalProps {
  isOpen: boolean
  onClose: () => void
  onCreate: (row: Omit<HoldingRow, 'id'>) => void
}

const initialDraft: Omit<HoldingRow, 'id' | 'monto' | 'tipo'> & { monto: string; tipo: HoldingType } = {
  cuenta: '',
  moneda: 'ARS',
  monto: '0',
  tipo: 'Cash',
  subactivo: 'ARS'
}

export const AddRowModal = ({ isOpen, onClose, onCreate }: AddRowModalProps) => {
  const [draft, setDraft] = useState(initialDraft)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) {
      return
    }

    setDraft(initialDraft)
    setError(null)
  }, [isOpen])

  if (!isOpen) {
    return null
  }

  const updateField = <K extends keyof typeof draft>(field: K, value: (typeof draft)[K]) => {
    setDraft((prev) => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const parsedAmount = parseAmountInput(draft.monto)

    if (!draft.cuenta.trim()) {
      setError('La cuenta es obligatoria.')
      return
    }

    if (!draft.moneda.trim()) {
      setError('La moneda es obligatoria.')
      return
    }

    if (!draft.subactivo.trim()) {
      setError('El subactivo es obligatorio.')
      return
    }

    if (parsedAmount === null) {
      setError('El monto debe ser numérico.')
      return
    }

    onCreate({
      cuenta: draft.cuenta.trim(),
      moneda: draft.moneda.trim().toUpperCase(),
      monto: parsedAmount,
      tipo: draft.tipo,
      subactivo: draft.subactivo.trim().toUpperCase()
    })

    onClose()
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="add-row-title">
        <h2 id="add-row-title">Agregar fila</h2>

        <form onSubmit={handleSubmit} className="form-grid">
          <label htmlFor="add-cuenta">Cuenta</label>
          <input id="add-cuenta" value={draft.cuenta} onChange={(event) => updateField('cuenta', event.target.value)} required />

          <label htmlFor="add-moneda">Moneda</label>
          <input id="add-moneda" value={draft.moneda} onChange={(event) => updateField('moneda', event.target.value)} required />

          <label htmlFor="add-monto">Monto</label>
          <input
            id="add-monto"
            value={draft.monto}
            onChange={(event) => updateField('monto', event.target.value)}
            inputMode="decimal"
            required
          />

          <label htmlFor="add-tipo">Tipo</label>
          <select
            id="add-tipo"
            value={draft.tipo}
            onChange={(event) => updateField('tipo', event.target.value as HoldingType)}
            required
          >
            {HOLDING_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>

          <label htmlFor="add-subactivo">Subactivo</label>
          <input
            id="add-subactivo"
            value={draft.subactivo}
            onChange={(event) => updateField('subactivo', event.target.value)}
            required
          />

          {error ? <p className="error-text">{error}</p> : null}

          <div className="modal-actions">
            <button type="button" className="btn btn-tertiary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary">
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
