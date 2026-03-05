import { type FormEvent, useEffect, useState } from 'react'
import { HOLDING_TYPES } from '../types'
import type { HoldingRow, HoldingType } from '../types'
import { parseAmountInput } from '../utils/number'
import { parseTagsInput } from '../utils/tags'

interface AddRowModalProps {
  isOpen: boolean
  accountOptions: string[]
  currencyOptions: string[]
  subassetOptions: string[]
  onClose: () => void
  onCreate: (row: Omit<HoldingRow, 'id'>) => void
}

const NEW_OPTION_VALUE = '__NEW__'

const initialDraft: { monto: string; cantidad: string; tags: string; tipo: HoldingType } = {
  monto: '0',
  cantidad: '',
  tags: '',
  tipo: 'Cash'
}

const getInitialSelectValue = (options: string[]): string => {
  return options.length > 0 ? options[0] : NEW_OPTION_VALUE
}

const sanitizeOption = (value: string): string => value.trim()

export const AddRowModal = ({
  isOpen,
  accountOptions,
  currencyOptions,
  subassetOptions,
  onClose,
  onCreate
}: AddRowModalProps) => {
  const [draft, setDraft] = useState(initialDraft)
  const [selectedAccount, setSelectedAccount] = useState<string>(NEW_OPTION_VALUE)
  const [newAccount, setNewAccount] = useState('')
  const [selectedCurrency, setSelectedCurrency] = useState<string>(NEW_OPTION_VALUE)
  const [newCurrency, setNewCurrency] = useState('')
  const [selectedSubasset, setSelectedSubasset] = useState<string>(NEW_OPTION_VALUE)
  const [newSubasset, setNewSubasset] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) {
      return
    }

    setDraft(initialDraft)
    setSelectedAccount(getInitialSelectValue(accountOptions))
    setNewAccount('')
    setSelectedCurrency(getInitialSelectValue(currencyOptions))
    setNewCurrency('')
    setSelectedSubasset(getInitialSelectValue(subassetOptions))
    setNewSubasset('')
    setError(null)
  }, [accountOptions, currencyOptions, isOpen, subassetOptions])

  if (!isOpen) {
    return null
  }

  const resolveSelectedValue = (selected: string, custom: string): string => {
    return selected === NEW_OPTION_VALUE ? sanitizeOption(custom) : sanitizeOption(selected)
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const cuenta = resolveSelectedValue(selectedAccount, newAccount)
    const moneda = resolveSelectedValue(selectedCurrency, newCurrency).toUpperCase()
    const subactivo = resolveSelectedValue(selectedSubasset, newSubasset).toUpperCase()
    const parsedAmount = parseAmountInput(draft.monto)
    const trimmedQuantity = draft.cantidad.trim()
    const parsedQuantity = trimmedQuantity ? parseAmountInput(trimmedQuantity) : null
    const parsedTags = parseTagsInput(draft.tags)

    if (!cuenta) {
      setError('La cuenta es obligatoria.')
      return
    }

    if (!moneda) {
      setError('La moneda es obligatoria.')
      return
    }

    if (moneda.length > 12) {
      setError('La moneda no puede superar 12 caracteres.')
      return
    }

    if (!subactivo) {
      setError('El subactivo es obligatorio.')
      return
    }

    if (subactivo.length > 20) {
      setError('El subactivo no puede superar 20 caracteres.')
      return
    }

    if (!HOLDING_TYPES.includes(draft.tipo)) {
      setError('Tipo inválido.')
      return
    }

    if (parsedAmount === null) {
      setError('El monto debe ser numérico.')
      return
    }

    if (parsedAmount < 0) {
      setError('El monto no puede ser negativo.')
      return
    }

    if (parsedQuantity !== null && parsedQuantity < 0) {
      setError('La cantidad no puede ser negativa.')
      return
    }

    if (trimmedQuantity && parsedQuantity === null) {
      setError('La cantidad debe ser numérica.')
      return
    }

    onCreate({
      cuenta,
      moneda,
      monto: parsedAmount,
      cantidad: parsedQuantity,
      tags: parsedTags,
      tipo: draft.tipo,
      subactivo
    })

    onClose()
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="add-row-title">
        <h2 id="add-row-title">Agregar fila</h2>

        <form onSubmit={handleSubmit} className="form-grid">
          <label htmlFor="add-cuenta-select">Cuenta</label>
          <select id="add-cuenta-select" value={selectedAccount} onChange={(event) => setSelectedAccount(event.target.value)}>
            {accountOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
            <option value={NEW_OPTION_VALUE}>+ Nueva cuenta</option>
          </select>
          {selectedAccount === NEW_OPTION_VALUE ? (
            <input
              id="add-cuenta-new"
              value={newAccount}
              onChange={(event) => setNewAccount(event.target.value)}
              placeholder="Escribí una nueva cuenta"
              required
            />
          ) : null}

          <label htmlFor="add-moneda-select">Moneda</label>
          <select id="add-moneda-select" value={selectedCurrency} onChange={(event) => setSelectedCurrency(event.target.value)}>
            {currencyOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
            <option value={NEW_OPTION_VALUE}>+ Nueva moneda</option>
          </select>
          {selectedCurrency === NEW_OPTION_VALUE ? (
            <input
              id="add-moneda-new"
              value={newCurrency}
              onChange={(event) => setNewCurrency(event.target.value)}
              placeholder="Ej: EUR"
              required
            />
          ) : null}

          <label htmlFor="add-monto">Monto</label>
          <input
            id="add-monto"
            value={draft.monto}
            onChange={(event) => setDraft((previous) => ({ ...previous, monto: event.target.value }))}
            inputMode="decimal"
            required
          />

          <label htmlFor="add-cantidad">Cantidad (opcional)</label>
          <input
            id="add-cantidad"
            value={draft.cantidad}
            onChange={(event) => setDraft((previous) => ({ ...previous, cantidad: event.target.value }))}
            inputMode="decimal"
            placeholder="Ej: 0.1542 BTC o 25 shares"
          />

          <label htmlFor="add-tags">Tags (opcional)</label>
          <input
            id="add-tags"
            value={draft.tags}
            onChange={(event) => setDraft((previous) => ({ ...previous, tags: event.target.value }))}
            placeholder="Ej: largo plazo, liquidez"
          />

          <label htmlFor="add-tipo">Tipo</label>
          <select
            id="add-tipo"
            value={draft.tipo}
            onChange={(event) => setDraft((previous) => ({ ...previous, tipo: event.target.value as HoldingType }))}
            required
          >
            {HOLDING_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>

          <label htmlFor="add-subactivo-select">Subactivo</label>
          <select
            id="add-subactivo-select"
            value={selectedSubasset}
            onChange={(event) => setSelectedSubasset(event.target.value)}
          >
            {subassetOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
            <option value={NEW_OPTION_VALUE}>+ Nuevo subactivo</option>
          </select>
          {selectedSubasset === NEW_OPTION_VALUE ? (
            <input
              id="add-subactivo-new"
              value={newSubasset}
              onChange={(event) => setNewSubasset(event.target.value)}
              placeholder="Ej: ETH"
              required
            />
          ) : null}

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
