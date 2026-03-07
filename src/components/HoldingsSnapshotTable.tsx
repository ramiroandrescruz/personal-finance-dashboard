import { useMemo, useState } from 'react'
import type { HoldingRow, Settings } from '../types'
import { convertRowToUsd } from '../utils/conversion'
import { formatPlainNumber, formatQuantity, formatUsd } from '../utils/number'

type SortColumn = 'cuenta' | 'moneda' | 'monto' | 'cantidad' | 'tipo' | 'usdOficial' | 'usdFinanciero' | 'subactivo'

interface SortState {
  column: SortColumn
  direction: 'asc' | 'desc'
}

interface HoldingsSnapshotTableProps {
  rows: HoldingRow[]
  settings: Settings
}

const stringCompare = (left: string, right: string): number => left.localeCompare(right, 'es', { sensitivity: 'base' })

const sortArrow = (sort: SortState, column: SortColumn): string => {
  if (sort.column !== column) {
    return '↕'
  }

  return sort.direction === 'asc' ? '↑' : '↓'
}

export const HoldingsSnapshotTable = ({ rows, settings }: HoldingsSnapshotTableProps) => {
  const [sortState, setSortState] = useState<SortState>({ column: 'usdFinanciero', direction: 'desc' })

  const conversions = useMemo(() => {
    const map = new Map<string, ReturnType<typeof convertRowToUsd>>()
    rows.forEach((row) => {
      map.set(row.id, convertRowToUsd(row, settings))
    })
    return map
  }, [rows, settings])

  const sortedRows = useMemo(() => {
    const next = [...rows]

    next.sort((left, right) => {
      let comparison = 0

      switch (sortState.column) {
        case 'cuenta':
          comparison = stringCompare(left.cuenta, right.cuenta)
          break
        case 'moneda':
          comparison = stringCompare(left.moneda, right.moneda)
          break
        case 'monto':
          comparison = left.monto - right.monto
          break
        case 'cantidad':
          comparison = (left.cantidad ?? -1) - (right.cantidad ?? -1)
          break
        case 'tipo':
          comparison = stringCompare(left.tipo, right.tipo)
          break
        case 'subactivo':
          comparison = stringCompare(left.subactivo, right.subactivo)
          break
        case 'usdOficial':
          comparison = (conversions.get(left.id)?.usdOficial ?? 0) - (conversions.get(right.id)?.usdOficial ?? 0)
          break
        case 'usdFinanciero':
          comparison = (conversions.get(left.id)?.usdFinanciero ?? 0) - (conversions.get(right.id)?.usdFinanciero ?? 0)
          break
        default:
          comparison = 0
      }

      return sortState.direction === 'asc' ? comparison : -comparison
    })

    return next
  }, [conversions, rows, sortState])

  const handleSort = (column: SortColumn) => {
    setSortState((previous) => {
      if (previous.column === column) {
        return {
          column,
          direction: previous.direction === 'asc' ? 'desc' : 'asc'
        }
      }

      return {
        column,
        direction: 'asc'
      }
    })
  }

  return (
    <section className="table-section" aria-label="Posiciones actuales">
      <div className="table-toolbar table-toolbar-compact">
        <div>
          <h2 className="table-section-title">Posiciones actuales</h2>
          <p className="muted-text">Vista reconstruida desde movimientos.</p>
        </div>
        <p className="muted-text">Filas: {sortedRows.length}</p>
      </div>

      <div className="table-shell" role="region" aria-label="Tabla de posiciones reconstruidas" tabIndex={0}>
        <table className="positions-table">
          <thead>
            <tr>
              <th>
                <button type="button" className="sort-button" onClick={() => handleSort('cuenta')}>
                  Cuenta {sortArrow(sortState, 'cuenta')}
                </button>
              </th>
              <th>
                <button type="button" className="sort-button" onClick={() => handleSort('tipo')}>
                  Tipo {sortArrow(sortState, 'tipo')}
                </button>
              </th>
              <th>
                <button type="button" className="sort-button" onClick={() => handleSort('subactivo')}>
                  Subactivo {sortArrow(sortState, 'subactivo')}
                </button>
              </th>
              <th className="numeric-col">
                <button type="button" className="sort-button" onClick={() => handleSort('monto')}>
                  Monto {sortArrow(sortState, 'monto')}
                </button>
              </th>
              <th className="numeric-col">
                <button type="button" className="sort-button" onClick={() => handleSort('usdFinanciero')}>
                  USD financiero {sortArrow(sortState, 'usdFinanciero')}
                </button>
              </th>
              <th className="secondary-col">
                <button type="button" className="sort-button" onClick={() => handleSort('moneda')}>
                  Moneda {sortArrow(sortState, 'moneda')}
                </button>
              </th>
              <th className="numeric-col secondary-col">
                <button type="button" className="sort-button" onClick={() => handleSort('cantidad')}>
                  Cantidad {sortArrow(sortState, 'cantidad')}
                </button>
              </th>
              <th className="numeric-col secondary-col">
                <button type="button" className="sort-button" onClick={() => handleSort('usdOficial')}>
                  USD oficial {sortArrow(sortState, 'usdOficial')}
                </button>
              </th>
              <th className="secondary-col">Tags</th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row) => {
              const conversion = conversions.get(row.id)

              return (
                <tr key={row.id}>
                  <td>{row.cuenta}</td>
                  <td>{row.tipo}</td>
                  <td>{row.subactivo}</td>
                  <td className="numeric-col">{formatPlainNumber(row.monto)}</td>
                  <td className="numeric-col emphasis-col">{formatUsd(conversion?.usdFinanciero ?? 0)}</td>
                  <td className="secondary-col">{row.moneda}</td>
                  <td className="numeric-col secondary-col">{row.cantidad === null ? '—' : formatQuantity(row.cantidad)}</td>
                  <td className="numeric-col secondary-col">{formatUsd(conversion?.usdOficial ?? 0)}</td>
                  <td className="secondary-col">
                    {row.tags.length === 0 ? (
                      '—'
                    ) : (
                      <div className="tag-chip-list">
                        {row.tags.map((tag) => (
                          <span key={`${row.id}-${tag}`} className="tag-chip" title={tag}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
            {sortedRows.length === 0 ? (
              <tr>
                <td colSpan={9}>
                  <p className="empty-state">No hay posiciones para los filtros actuales.</p>
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  )
}
