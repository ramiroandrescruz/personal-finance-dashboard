import { type FormEvent, useEffect, useState } from 'react'
import { Modal, TextInput } from '@mantine/core'
import type { Settings } from '../types'
import { parseAmountInput } from '../utils/number'
import { AppButton } from './ui/AppButton'

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
    <Modal opened={isOpen} onClose={onClose} title="Ajustes" centered>
      <form onSubmit={handleSubmit} className="form-grid">
        <TextInput
          id="ars-oficial"
          label="ARS/USD Oficial"
          value={arsUsdOficial}
          onChange={(event) => setArsUsdOficial(event.target.value)}
          inputMode="decimal"
          required
        />

        <TextInput
          id="ars-financiero"
          label="ARS/USD Financiero"
          value={arsUsdFinanciero}
          onChange={(event) => setArsUsdFinanciero(event.target.value)}
          inputMode="decimal"
          required
        />

        <p className="modal-note">Se recalculan los USD automáticamente.</p>

        {error ? <p className="error-text">{error}</p> : null}

        <div className="modal-actions">
          <AppButton type="button" tone="tertiary" onClick={onClose}>
            Cancelar
          </AppButton>
          <AppButton type="submit" tone="primary">
            Guardar
          </AppButton>
        </div>
      </form>
    </Modal>
  )
}
