import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { HOLDING_TYPES } from '../types'
import type { HoldingMovement, HoldingType } from '../types'
import type { MovementDraft, TransferDraft } from '../hooks/useHoldingsStore'
import { formatPlainNumber, formatQuantity, parseAmountInput } from '../utils/number'
import { formatTags, parseTagsInput } from '../utils/tags'
import { createMovementDraftDefaults, movementKindToLabel } from '../utils/transactions'

type ModalMode = 'movement' | 'transfer'

interface MovementsSectionProps {
  movements: HoldingMovement[]
  accountOptions: string[]
  currencyOptions: string[]
  subassetOptions: string[]
  isCreateOpen: boolean
  onCloseCreate: () => void
  onCreateMovement: (draft: MovementDraft) => void
  onCreateTransfer: (draft: TransferDraft) => void
  onDeleteMovement: (id: string) => void
}

interface MovementFormState {
  mode: ModalMode
  date: string
  kind: 'OPENING' | 'IN' | 'OUT'
  cuenta: string
  cuentaTo: string
  moneda: string
  monto: string
  cantidad: string
  tipo: HoldingType
  subactivo: string
  tags: string
  note: string
}

const emptyForm = (): MovementFormState => ({
  mode: 'movement',
  date: createMovementDraftDefaults().date,
  kind: 'IN',
  cuenta: '',
  cuentaTo: '',
  moneda: 'USD',
  monto: '',
  cantidad: '',
  tipo: 'Cash',
  subactivo: '',
  tags: '',
  note: ''
})

const createDatalistId = (suffix: string): string => `movement-${suffix}-options`

export const MovementsSection = ({
  movements,
  accountOptions,
  currencyOptions,
  subassetOptions,
  isCreateOpen,
  onCloseCreate,
  onCreateMovement,
  onCreateTransfer,
  onDeleteMovement
}: MovementsSectionProps) => {
  const [form, setForm] = useState<MovementFormState>(emptyForm)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isCreateOpen) {
      return
    }

    setForm((previous) => ({
      ...emptyForm(),
      cuenta: previous.cuenta || accountOptions[0] || '',
      moneda: previous.moneda || currencyOptions[0] || 'USD',
      subactivo: previous.subactivo || subassetOptions[0] || '',
      tipo: previous.tipo
    }))
    setError(null)
  }, [accountOptions, currencyOptions, isCreateOpen, subassetOptions])

  const orderedMovements = useMemo(() => {
    return [...movements].sort((left, right) => {
      if (left.date === right.date) {
        return right.createdAt - left.createdAt
      }

      return right.date.localeCompare(left.date)
    })
  }, [movements])

  const accountListId = createDatalistId('account')
  const destinationAccountListId = createDatalistId('account-destination')
  const currencyListId = createDatalistId('currency')
  const subassetListId = createDatalistId('subasset')

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    const cuenta = form.cuenta.trim()
    const cuentaTo = form.cuentaTo.trim()
    const moneda = form.moneda.trim().toUpperCase()
    const subactivo = form.subactivo.trim().toUpperCase()
    const parsedAmount = parseAmountInput(form.monto)
    const parsedQuantity = form.cantidad.trim() ? parseAmountInput(form.cantidad) : null

    if (!cuenta) {
      setError('La cuenta es obligatoria.')
      return
    }

    if (!moneda) {
      setError('La moneda es obligatoria.')
      return
    }

    if (!subactivo) {
      setError('El subactivo es obligatorio.')
      return
    }

    if (!HOLDING_TYPES.includes(form.tipo)) {
      setError('Tipo inválido.')
      return
    }

    if (parsedAmount === null || parsedAmount <= 0) {
      setError('El monto debe ser numérico y mayor a 0.')
      return
    }

    if (parsedQuantity !== null && parsedQuantity < 0) {
      setError('La cantidad no puede ser negativa.')
      return
    }

    if (form.cantidad.trim() && parsedQuantity === null) {
      setError('Cantidad inválida.')
      return
    }

    const tags = parseTagsInput(form.tags)
    const note = form.note.trim()

    if (form.mode === 'transfer') {
      if (!cuentaTo) {
        setError('La cuenta destino es obligatoria para transferencias.')
        return
      }

      if (cuentaTo.toLowerCase() === cuenta.toLowerCase()) {
        setError('La cuenta origen y destino deben ser distintas.')
        return
      }

      onCreateTransfer({
        date: form.date,
        cuentaFrom: cuenta,
        cuentaTo,
        moneda,
        monto: parsedAmount,
        cantidad: parsedQuantity,
        tipo: form.tipo,
        subactivo,
        tags,
        note
      })
      onCloseCreate()
      return
    }

    onCreateMovement({
      date: form.date,
      kind: form.kind,
      cuenta,
      moneda,
      monto: parsedAmount,
      cantidad: parsedQuantity,
      tipo: form.tipo,
      subactivo,
      tags,
      note
    })
    onCloseCreate()
  }

  return (
    <section className="table-section" aria-label="Movimientos">
      <div className="table-toolbar">
        <div>
          <h2 className="table-section-title">Movimientos</h2>
          <p className="muted-text">Registrá movimientos agregados (entrada/salida/transferencia) para reconstruir posiciones.</p>
        </div>
        <p className="muted-text">Registros: {movements.length}</p>
      </div>

      <div className="table-shell" role="region" aria-label="Tabla de movimientos" tabIndex={0}>
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Movimiento</th>
              <th>Cuenta</th>
              <th>Moneda</th>
              <th>Monto</th>
              <th>Cantidad</th>
              <th>Tipo</th>
              <th>Subactivo</th>
              <th>Tags</th>
              <th>Nota</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {orderedMovements.map((movement) => (
              <tr key={movement.id}>
                <td>{movement.date}</td>
                <td>{movementKindToLabel(movement.kind)}</td>
                <td>{movement.cuenta}</td>
                <td>{movement.moneda}</td>
                <td>{formatPlainNumber(movement.monto)}</td>
                <td>{movement.cantidad === null ? '—' : formatQuantity(movement.cantidad)}</td>
                <td>{movement.tipo}</td>
                <td>{movement.subactivo}</td>
                <td>{movement.tags.length === 0 ? '—' : formatTags(movement.tags)}</td>
                <td>{movement.note || '—'}</td>
                <td>
                  <button
                    type="button"
                    className="btn btn-danger-outline"
                    onClick={() => {
                      if (window.confirm('¿Eliminar este movimiento?')) {
                        onDeleteMovement(movement.id)
                      }
                    }}
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
            {orderedMovements.length === 0 ? (
              <tr>
                <td colSpan={11}>
                  <p className="empty-state">Todavía no hay movimientos cargados.</p>
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {isCreateOpen ? (
        <div className="modal-backdrop" role="presentation">
          <div className="modal" role="dialog" aria-modal="true" aria-label="Agregar movimiento">
            <h2>Agregar movimiento</h2>
            <p className="modal-note">Para compras/ventas diarias podés agrupar en un solo movimiento resumen.</p>

            <form className="form-grid" onSubmit={handleSubmit}>
              <label htmlFor="movement-mode">Tipo de registro</label>
              <select
                id="movement-mode"
                value={form.mode}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    mode: event.target.value as ModalMode
                  }))
                }
              >
                <option value="movement">Movimiento (entrada/salida)</option>
                <option value="transfer">Transferencia entre cuentas</option>
              </select>

              <label htmlFor="movement-date">Fecha</label>
              <input
                id="movement-date"
                type="date"
                value={form.date}
                onChange={(event) => setForm((previous) => ({ ...previous, date: event.target.value }))}
                required
              />

              {form.mode === 'movement' ? (
                <>
                  <label htmlFor="movement-kind">Dirección</label>
                  <select
                    id="movement-kind"
                    value={form.kind}
                    onChange={(event) =>
                      setForm((previous) => ({
                        ...previous,
                        kind: event.target.value as MovementFormState['kind']
                      }))
                    }
                  >
                    <option value="IN">Entrada</option>
                    <option value="OUT">Salida</option>
                    <option value="OPENING">Apertura inicial</option>
                  </select>
                </>
              ) : null}

              <label htmlFor="movement-account">{form.mode === 'transfer' ? 'Cuenta origen' : 'Cuenta'}</label>
              <input
                id="movement-account"
                list={accountListId}
                value={form.cuenta}
                onChange={(event) => setForm((previous) => ({ ...previous, cuenta: event.target.value }))}
                required
              />
              <datalist id={accountListId}>
                {accountOptions.map((option) => (
                  <option key={option} value={option} />
                ))}
              </datalist>

              {form.mode === 'transfer' ? (
                <>
                  <label htmlFor="movement-account-destination">Cuenta destino</label>
                  <input
                    id="movement-account-destination"
                    list={destinationAccountListId}
                    value={form.cuentaTo}
                    onChange={(event) => setForm((previous) => ({ ...previous, cuentaTo: event.target.value }))}
                    required
                  />
                  <datalist id={destinationAccountListId}>
                    {accountOptions.map((option) => (
                      <option key={option} value={option} />
                    ))}
                  </datalist>
                </>
              ) : null}

              <label htmlFor="movement-currency">Moneda</label>
              <input
                id="movement-currency"
                list={currencyListId}
                value={form.moneda}
                onChange={(event) => setForm((previous) => ({ ...previous, moneda: event.target.value }))}
                required
              />
              <datalist id={currencyListId}>
                {currencyOptions.map((option) => (
                  <option key={option} value={option} />
                ))}
              </datalist>

              <label htmlFor="movement-amount">Monto</label>
              <input
                id="movement-amount"
                inputMode="decimal"
                value={form.monto}
                onChange={(event) => setForm((previous) => ({ ...previous, monto: event.target.value }))}
                required
              />

              <label htmlFor="movement-quantity">Cantidad (opcional)</label>
              <input
                id="movement-quantity"
                inputMode="decimal"
                value={form.cantidad}
                onChange={(event) => setForm((previous) => ({ ...previous, cantidad: event.target.value }))}
                placeholder="Ej: 0.52 BTC o 20 shares"
              />

              <label htmlFor="movement-type">Tipo</label>
              <select
                id="movement-type"
                value={form.tipo}
                onChange={(event) => setForm((previous) => ({ ...previous, tipo: event.target.value as HoldingType }))}
              >
                {HOLDING_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>

              <label htmlFor="movement-subasset">Subactivo</label>
              <input
                id="movement-subasset"
                list={subassetListId}
                value={form.subactivo}
                onChange={(event) => setForm((previous) => ({ ...previous, subactivo: event.target.value }))}
                required
              />
              <datalist id={subassetListId}>
                {subassetOptions.map((option) => (
                  <option key={option} value={option} />
                ))}
              </datalist>

              <label htmlFor="movement-tags">Tags (coma)</label>
              <input
                id="movement-tags"
                value={form.tags}
                onChange={(event) => setForm((previous) => ({ ...previous, tags: event.target.value }))}
                placeholder="largo plazo, liquidez"
              />

              <label htmlFor="movement-note">Nota</label>
              <input
                id="movement-note"
                value={form.note}
                onChange={(event) => setForm((previous) => ({ ...previous, note: event.target.value }))}
                placeholder="Compra del mes, rebalanceo, etc."
              />

              {error ? <p className="error-text">{error}</p> : null}

              <div className="modal-actions">
                <button type="button" className="btn btn-tertiary" onClick={onCloseCreate}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Guardar movimiento
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  )
}
