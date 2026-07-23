import type { ThriftStore } from '../api/client'
import { daysUntil, formatDeliveryDate } from '../utils/dates'
import { formatFrequencyLabel } from '../utils/frequency'
import { hotnessLabel, hotnessStyles } from '../utils/hotness'
import { formatTime } from '../utils/time'

type Props = {
  store: ThriftStore
  selected: boolean
  onSelect: () => void
  onInfo: () => void
  onEdit: () => void
  onDelete: () => void
  onNavigate: () => void
}

function dateCorner(store: ThriftStore) {
  if (!store.delivery_enabled) return null

  if (!store.delivery_verified) {
    return {
      primary: 'Nie sprawdzony',
      primaryClass: 'text-amber-400',
      sub: store.next_delivery ? formatDeliveryDate(store.next_delivery) : null,
      countdown: null as number | null,
    }
  }

  if (!store.next_delivery) return null

  const days = daysUntil(store.next_delivery)
  return {
    primary: formatDeliveryDate(store.next_delivery),
    primaryClass: 'text-white',
    sub: null,
    countdown: days,
  }
}

export default function StoreCard({ store, selected, onSelect, onInfo, onEdit, onDelete, onNavigate }: Props) {
  const styles = hotnessStyles(store.hotness)
  const corner = dateCorner(store)
  const note = store.notes?.trim() ?? ''

  return (
    <article
      className={`flex h-full flex-col rounded-[var(--radius-lg)] border p-4 transition ${
        selected
          ? 'border-[color:var(--accent)]/50 bg-[color:var(--accent)]/[0.06] ring-1 ring-[color:var(--accent)]/25'
          : `${styles.card} hover:border-[color:var(--border-strong)]`
      }`}
    >
      <button type="button" onClick={onSelect} className="flex min-h-[7.5rem] flex-1 flex-col text-left">
        <div className="flex min-h-[3.25rem] shrink-0 items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-base font-semibold text-white">{store.name}</h3>
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${styles.badge}`}>
                ★ {store.hotness}/10
              </span>
              {!store.delivery_verified && store.delivery_enabled && (
                <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-400">
                  Nie sprawdzony
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-[color:var(--muted)]">{hotnessLabel(store.hotness)}</p>
          </div>

          {corner && (
            <div className="shrink-0 text-right">
              <p className={`text-lg font-bold leading-tight ${corner.primaryClass}`}>{corner.primary}</p>
              {corner.countdown !== null && (
                <p
                  className={`text-xs font-medium ${
                    corner.countdown <= 3 ? 'text-[color:var(--accent)]' : 'text-[color:var(--muted)]'
                  }`}
                >
                  {corner.countdown === 0
                    ? 'Dziś!'
                    : corner.countdown === 1
                      ? 'Jutro'
                      : corner.countdown < 0
                        ? `${Math.abs(corner.countdown)} dni temu`
                        : `za ${corner.countdown} dni`}
                </p>
              )}
              {corner.sub && <p className="text-xs text-[color:var(--muted)]">{corner.sub}</p>}
            </div>
          )}
        </div>

        <div className="mt-2 flex flex-1 flex-col justify-end">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[color:var(--muted-light)]">
            <span className="inline-flex items-center gap-1.5">
              <CalendarIcon />
              {formatFrequencyLabel(store.delivery_frequency)}
            </span>
            {store.delivery_enabled && store.delivery_time && (
              <span className="inline-flex items-center gap-1.5">
                <TruckIcon />
                dost. {formatTime(store.delivery_time)}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 font-mono text-[color:var(--muted)]">
              <PinIcon />
              {store.lat.toFixed(4)}, {store.lng.toFixed(4)}
            </span>
          </div>
          <p
            className={`mt-2 h-4 shrink-0 truncate text-xs italic text-[color:var(--muted-light)] ${note ? '' : 'invisible'}`}
            title={note || undefined}
          >
            {note ? `„${note}"` : '—'}
          </p>
        </div>

        <div className="mt-3 h-1.5 shrink-0 overflow-hidden rounded-full bg-white/5">
          <div className={`h-full rounded-full transition-all ${styles.bar}`} style={{ width: `${store.hotness * 10}%` }} />
        </div>
      </button>

      <div className="mt-auto flex items-center justify-between gap-2 border-t border-[color:var(--border)] pt-3">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onNavigate}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[color:var(--accent)] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[color:var(--accent-hover)]"
          >
            <NavIcon />
            Nawiguj
          </button>
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[color:var(--border-strong)] bg-[color:var(--surface-raised)] px-3 py-1.5 text-xs text-[color:var(--muted-light)] transition hover:text-white"
          >
            <EditIcon />
            Edytuj
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-1.5 text-xs text-red-400 transition hover:bg-red-500/15"
          >
            <TrashIcon />
            Usuń
          </button>
        </div>
        <button
          type="button"
          onClick={onInfo}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[color:var(--border-strong)] bg-[color:var(--surface-raised)] px-3 py-1.5 text-xs text-[color:var(--muted-light)] transition hover:text-white"
          title="Szczegóły"
        >
          <InfoIcon />
          Info
        </button>
      </div>
    </article>
  )
}

function InfoIcon() {
  return (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function TruckIcon() {
  return (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10m10 0h4m-4 0a2 2 0 104 0m-6 0a2 2 0 11-4 0m8-6h2.586a1 1 0 01.707.293l2.414 2.414a1 1 0 01.293.707V16h-4" />
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  )
}

function PinIcon() {
  return (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}

function NavIcon() {
  return (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
    </svg>
  )
}

function EditIcon() {
  return (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  )
}
