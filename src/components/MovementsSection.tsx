import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { ActionIcon, Menu, Modal, NativeSelect, TextInput } from '@mantine/core'
import { HOLDING_TYPES, LIQUIDITY_KINDS } from '../types'
import type { HoldingMovement, HoldingType, LiquidityKind } from '../types'
import type { ConversionDraft, MovementDraft, TransferCreateResult, TransferDraft } from '../hooks/useHoldingsStore'
import { formatPlainNumber, formatQuantity, parseAmountInput } from '../utils/number'
import { formatTags, parseTagsInput } from '../utils/tags'
import { createMovementDraftDefaults, movementKindToLabel } from '../utils/transactions'
import { AppButton } from './ui/AppButton'

type ModalMode = 'movement' | 'transfer' | 'conversion'

interface MovementsSectionProps {
  movements: HoldingMovement[]
  accountOptions: string[]
  currencyOptions: string[]
  subassetOptions: string[]
  isCreateOpen: boolean
  onOpenCreate: () => void
  onCloseCreate: () => void
  onCreateMovement: (draft: MovementDraft) => void
  onCreateTransfer: (draft: TransferDraft) => TransferCreateResult
  onCreateConversion: (draft: ConversionDraft) => TransferCreateResult
  onDeleteMovement: (id: string) => void
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
}

interface MovementFormState {
  mode: ModalMode
  date: string
  kind: 'OPENING' | 'IN' | 'OUT' | 'REVALUATION'
  cuenta: string
  cuentaTo: string
  moneda: string
  monto: string
  cantidad: string
  tipo: HoldingType
  liquidity: LiquidityKind
  tipoTo: HoldingType
  liquidityTo: LiquidityKind
  subactivo: string
  subactivoTo: string
  tags: string
  note: string
  valuationDate: string
  valuationCurrency: string
  valuationSource: string
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
  liquidity: 'LIQUID',
  tipoTo: 'Crypto',
  liquidityTo: 'ILLIQUID',
  subactivo: '',
  subactivoTo: '',
  tags: '',
  note: '',
  valuationDate: createMovementDraftDefaults().date,
  valuationCurrency: 'USD',
  valuationSource: ''
})

const createDatalistId = (suffix: string): string => `movement-${suffix}-options`

export const MovementsSection = ({
  movements,
  accountOptions,
  currencyOptions,
  subassetOptions,
  isCreateOpen,
  onOpenCreate,
  onCloseCreate,
  onCreateMovement,
  onCreateTransfer,
  onCreateConversion,
  onDeleteMovement,
  canUndo,
  canRedo,
  onUndo,
  onRedo
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
      subactivoTo: previous.subactivoTo || subassetOptions[0] || '',
      tipo: previous.tipo,
      liquidity: previous.liquidity,
      tipoTo: previous.tipoTo,
      liquidityTo: previous.liquidityTo,
      valuationDate: previous.valuationDate || previous.date || createMovementDraftDefaults().date,
      valuationCurrency: previous.valuationCurrency || previous.moneda || 'USD',
      valuationSource: previous.valuationSource
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
    const subactivoTo = form.subactivoTo.trim().toUpperCase()
    const valuationDate = form.valuationDate.trim()
    const valuationCurrency = form.valuationCurrency.trim().toUpperCase()
    const valuationSource = form.valuationSource.trim()
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

    if (!LIQUIDITY_KINDS.includes(form.liquidity)) {
      setError('Liquidez inválida.')
      return
    }

    if (form.mode === 'conversion' && !HOLDING_TYPES.includes(form.tipoTo)) {
      setError('Tipo destino inválido.')
      return
    }

    if (form.mode === 'conversion' && !LIQUIDITY_KINDS.includes(form.liquidityTo)) {
      setError('Liquidez destino inválida.')
      return
    }

    if (parsedAmount === null) {
      setError('El monto debe ser numérico.')
      return
    }

    if (form.mode === 'movement' && form.kind === 'REVALUATION' && parsedAmount === 0) {
      setError('La revalorización no puede ser 0.')
      return
    }

    if (form.mode === 'movement' && form.kind === 'REVALUATION') {
      if (!valuationDate) {
        setError('La fecha de valuación es obligatoria para revalorizaciones.')
        return
      }

      if (!valuationCurrency) {
        setError('La moneda de valuación es obligatoria para revalorizaciones.')
        return
      }

      if (!valuationSource) {
        setError('La fuente/método de valuación es obligatoria para revalorizaciones.')
        return
      }
    }

    if (!(form.mode === 'movement' && form.kind === 'REVALUATION') && parsedAmount <= 0) {
      setError('El monto debe ser mayor a 0.')
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

      const result = onCreateTransfer({
        date: form.date,
        cuentaFrom: cuenta,
        cuentaTo,
        moneda,
        monto: parsedAmount,
        cantidad: parsedQuantity,
        tipo: form.tipo,
        subactivo,
        liquidity: form.liquidity,
        tags,
        note
      })

      if (!result.ok) {
        setError(result.error)
        return
      }

      onCloseCreate()
      return
    }

    if (form.mode === 'conversion') {
      if (!cuentaTo) {
        setError('La cuenta destino es obligatoria para conversiones.')
        return
      }

      if (!subactivoTo) {
        setError('El subactivo destino es obligatorio para conversiones.')
        return
      }

      const result = onCreateConversion({
        date: form.date,
        cuentaFrom: cuenta,
        cuentaTo,
        moneda,
        monto: parsedAmount,
        cantidad: parsedQuantity,
        tipoFrom: form.tipo,
        subactivoFrom: subactivo,
        liquidityFrom: form.liquidity,
        tipoTo: form.tipoTo,
        subactivoTo,
        liquidityTo: form.liquidityTo,
        tags,
        note
      })

      if (!result.ok) {
        setError(result.error)
        return
      }

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
      liquidity: form.liquidity,
      tags,
      note,
      valuationDate: form.kind === 'REVALUATION' ? valuationDate : undefined,
      valuationCurrency: form.kind === 'REVALUATION' ? valuationCurrency : undefined,
      valuationSource: form.kind === 'REVALUATION' ? valuationSource : undefined
    })
    onCloseCreate()
  }

  return (
    <section className="table-section" aria-label="Movimientos">
      <div className="table-toolbar movements-toolbar">
        <div>
          <h2 className="table-section-title">Movimientos</h2>
          <p className="muted-text">Trazabilidad operativa con edición y conversión en una sola acción.</p>
        </div>

        <div className="movements-toolbar-actions">
          <AppButton tone="tertiary" onClick={onUndo} disabled={!canUndo} title="Ctrl/Cmd + Z">
            Deshacer
          </AppButton>
          <AppButton tone="tertiary" onClick={onRedo} disabled={!canRedo} title="Ctrl/Cmd + Shift + Z">
            Rehacer
          </AppButton>
          <AppButton tone="primary" onClick={onOpenCreate}>
            + Agregar movimiento
          </AppButton>
        </div>
      </div>

      <div className="table-shell" role="region" aria-label="Tabla de movimientos" tabIndex={0}>
        <table className="movements-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Movimiento</th>
              <th>Cuenta</th>
              <th>Moneda</th>
              <th className="numeric-col">Monto</th>
              <th className="numeric-col">Cantidad</th>
              <th>Tipo</th>
              <th>Subactivo</th>
              <th>Liquidez</th>
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
                <td className="numeric-col">{formatPlainNumber(movement.monto)}</td>
                <td className="numeric-col">{movement.cantidad === null ? '—' : formatQuantity(movement.cantidad)}</td>
                <td>{movement.tipo}</td>
                <td>{movement.subactivo}</td>
                <td>{movement.liquidity === 'ILLIQUID' ? 'Ilíquido' : 'Líquido'}</td>
                <td>{movement.tags.length === 0 ? '—' : formatTags(movement.tags)}</td>
                <td>{movement.note || '—'}</td>
                <td>
                  <Menu withinPortal position="bottom-end">
                    <Menu.Target>
                      <ActionIcon variant="default" radius="md" aria-label="Acciones movimiento">
                        ⋯
                      </ActionIcon>
                    </Menu.Target>
                    <Menu.Dropdown>
                      <Menu.Item
                        color="red"
                        onClick={() => {
                          if (window.confirm('¿Eliminar este movimiento?')) {
                            onDeleteMovement(movement.id)
                          }
                        }}
                      >
                        Eliminar
                      </Menu.Item>
                    </Menu.Dropdown>
                  </Menu>
                </td>
              </tr>
            ))}
            {orderedMovements.length === 0 ? (
              <tr>
                <td colSpan={12}>
                  <p className="empty-state">Todavía no hay movimientos cargados.</p>
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <Modal opened={isCreateOpen} onClose={onCloseCreate} title="Agregar movimiento" centered>
        <p className="modal-note">Registrá una operación individual o una conversión con salida + entrada.</p>

        <form className="form-grid" onSubmit={handleSubmit}>
          <NativeSelect
            id="movement-mode"
            label="Tipo de registro"
            value={form.mode}
            onChange={(event) =>
              setForm((previous) => ({
                ...previous,
                mode: event.target.value as ModalMode
              }))
            }
            data={[
              { value: 'movement', label: 'Movimiento (entrada/salida)' },
              { value: 'transfer', label: 'Transferencia entre cuentas' },
              { value: 'conversion', label: 'Conversión (genera salida + entrada)' }
            ]}
          />

          <TextInput
            id="movement-date"
            label="Fecha"
            type="date"
            value={form.date}
            onChange={(event) => setForm((previous) => ({ ...previous, date: event.target.value }))}
            required
          />

          {form.mode === 'movement' ? (
            <NativeSelect
              id="movement-kind"
              label="Dirección"
              value={form.kind}
              onChange={(event) =>
                setForm((previous) => ({
                  ...previous,
                  kind: event.target.value as MovementFormState['kind']
                }))
              }
              data={[
                { value: 'IN', label: 'Entrada' },
                { value: 'OUT', label: 'Salida' },
                { value: 'OPENING', label: 'Apertura inicial' },
                { value: 'REVALUATION', label: 'Revalorización (+/-)' }
              ]}
            />
          ) : null}

          <TextInput
            id="movement-account"
            label={form.mode === 'movement' ? 'Cuenta' : 'Cuenta origen'}
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

          {form.mode !== 'movement' ? (
            <>
              <TextInput
                id="movement-account-destination"
                label="Cuenta destino"
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

          <TextInput
            id="movement-currency"
            label="Moneda"
            list={currencyListId}
            value={form.moneda}
            onChange={(event) =>
              setForm((previous) => ({
                ...previous,
                moneda: event.target.value,
                valuationCurrency: event.target.value || previous.valuationCurrency
              }))
            }
            required
          />
          <datalist id={currencyListId}>
            {currencyOptions.map((option) => (
              <option key={option} value={option} />
            ))}
          </datalist>

          <TextInput
            id="movement-amount"
            label="Monto"
            inputMode="decimal"
            value={form.monto}
            onChange={(event) => setForm((previous) => ({ ...previous, monto: event.target.value }))}
            required
          />

          <TextInput
            id="movement-quantity"
            label="Cantidad (opcional)"
            inputMode="decimal"
            value={form.cantidad}
            onChange={(event) => setForm((previous) => ({ ...previous, cantidad: event.target.value }))}
            placeholder="Ej: 0.52 BTC o 20 shares"
          />

          {form.mode === 'movement' && (
            <>
              <NativeSelect
                id="movement-type"
                label="Tipo"
                value={form.tipo}
                onChange={(event) =>
                  setForm((previous) => {
                    const nextType = event.target.value as HoldingType
                    return {
                      ...previous,
                      tipo: nextType,
                      liquidity: nextType === 'Properties' ? 'ILLIQUID' : previous.liquidity
                    }
                  })
                }
                data={HOLDING_TYPES.map((type) => ({ value: type, label: type }))}
              />

              <TextInput
                id="movement-subasset"
                label="Subactivo"
                list={subassetListId}
                value={form.subactivo}
                onChange={(event) => setForm((previous) => ({ ...previous, subactivo: event.target.value }))}
                required
              />

              <NativeSelect
                id="movement-liquidity"
                label="Liquidez"
                value={form.liquidity}
                onChange={(event) => setForm((previous) => ({ ...previous, liquidity: event.target.value as LiquidityKind }))}
                data={[
                  { value: 'LIQUID', label: 'Líquido' },
                  { value: 'ILLIQUID', label: 'Ilíquido' }
                ]}
              />
              <datalist id={subassetListId}>
                {subassetOptions.map((option) => (
                  <option key={option} value={option} />
                ))}
              </datalist>

              {form.kind === 'REVALUATION' ? (
                <>
                  <TextInput
                    id="valuation-date"
                    label="Fecha de valuación"
                    type="date"
                    value={form.valuationDate}
                    onChange={(event) => setForm((previous) => ({ ...previous, valuationDate: event.target.value }))}
                  />

                  <TextInput
                    id="valuation-currency"
                    label="Moneda de valuación"
                    value={form.valuationCurrency}
                    onChange={(event) => setForm((previous) => ({ ...previous, valuationCurrency: event.target.value }))}
                    placeholder="USD"
                  />

                  <TextInput
                    id="valuation-source"
                    label="Fuente/Método valuación"
                    value={form.valuationSource}
                    onChange={(event) => setForm((previous) => ({ ...previous, valuationSource: event.target.value }))}
                    placeholder="Tasación inmobiliaria"
                  />
                </>
              ) : null}
            </>
          )}

          {form.mode === 'transfer' && (
            <>
              <NativeSelect
                id="transfer-type"
                label="Tipo de activo a transferir"
                value={form.tipo}
                onChange={(event) =>
                  setForm((previous) => {
                    const nextType = event.target.value as HoldingType
                    return {
                      ...previous,
                      tipo: nextType,
                      liquidity: nextType === 'Properties' ? 'ILLIQUID' : previous.liquidity
                    }
                  })
                }
                data={HOLDING_TYPES.map((type) => ({ value: type, label: type }))}
              />

              <TextInput
                id="transfer-subasset"
                label="Subactivo"
                list={subassetListId}
                value={form.subactivo}
                onChange={(event) => setForm((previous) => ({ ...previous, subactivo: event.target.value }))}
                required
              />
              <NativeSelect
                id="transfer-liquidity"
                label="Liquidez del activo"
                value={form.liquidity}
                onChange={(event) => setForm((previous) => ({ ...previous, liquidity: event.target.value as LiquidityKind }))}
                data={[
                  { value: 'LIQUID', label: 'Líquido' },
                  { value: 'ILLIQUID', label: 'Ilíquido' }
                ]}
              />
              <datalist id={subassetListId}>
                {subassetOptions.map((option) => (
                  <option key={option} value={option} />
                ))}
              </datalist>
            </>
          )}

          {form.mode === 'conversion' && (
            <>
              <NativeSelect
                id="conversion-type-from"
                label="Tipo origen"
                value={form.tipo}
                onChange={(event) =>
                  setForm((previous) => {
                    const nextType = event.target.value as HoldingType
                    return {
                      ...previous,
                      tipo: nextType,
                      liquidity: nextType === 'Properties' ? 'ILLIQUID' : previous.liquidity
                    }
                  })
                }
                data={HOLDING_TYPES.map((type) => ({ value: type, label: type }))}
              />

              <TextInput
                id="conversion-subasset-from"
                label="Subactivo origen"
                list={subassetListId}
                value={form.subactivo}
                onChange={(event) => setForm((previous) => ({ ...previous, subactivo: event.target.value }))}
                required
              />

              <NativeSelect
                id="conversion-liquidity-from"
                label="Liquidez origen"
                value={form.liquidity}
                onChange={(event) => setForm((previous) => ({ ...previous, liquidity: event.target.value as LiquidityKind }))}
                data={[
                  { value: 'LIQUID', label: 'Líquido' },
                  { value: 'ILLIQUID', label: 'Ilíquido' }
                ]}
              />

              <NativeSelect
                id="conversion-type-to"
                label="Tipo destino"
                value={form.tipoTo}
                onChange={(event) =>
                  setForm((previous) => {
                    const nextType = event.target.value as HoldingType
                    return {
                      ...previous,
                      tipoTo: nextType,
                      liquidityTo: nextType === 'Properties' ? 'ILLIQUID' : previous.liquidityTo
                    }
                  })
                }
                data={HOLDING_TYPES.map((type) => ({ value: type, label: type }))}
              />

              <TextInput
                id="conversion-subasset-to"
                label="Subactivo destino"
                list={subassetListId}
                value={form.subactivoTo}
                onChange={(event) => setForm((previous) => ({ ...previous, subactivoTo: event.target.value }))}
                required
              />

              <NativeSelect
                id="conversion-liquidity-to"
                label="Liquidez destino"
                value={form.liquidityTo}
                onChange={(event) => setForm((previous) => ({ ...previous, liquidityTo: event.target.value as LiquidityKind }))}
                data={[
                  { value: 'LIQUID', label: 'Líquido' },
                  { value: 'ILLIQUID', label: 'Ilíquido' }
                ]}
              />

              <datalist id={subassetListId}>
                {subassetOptions.map((option) => (
                  <option key={option} value={option} />
                ))}
              </datalist>
            </>
          )}

          <TextInput
            id="movement-tags"
            label="Tags (coma)"
            value={form.tags}
            onChange={(event) => setForm((previous) => ({ ...previous, tags: event.target.value }))}
            placeholder="largo plazo, liquidez"
          />

          <TextInput
            id="movement-note"
            label="Nota"
            value={form.note}
            onChange={(event) => setForm((previous) => ({ ...previous, note: event.target.value }))}
            placeholder="Compra del mes, rebalanceo, etc."
          />

          {error ? <p className="error-text">{error}</p> : null}

          <div className="modal-actions">
            <AppButton type="button" tone="tertiary" onClick={onCloseCreate}>
              Cancelar
            </AppButton>
            <AppButton type="submit" tone="primary">
              Guardar movimiento
            </AppButton>
          </div>
        </form>
      </Modal>
    </section>
  )
}
