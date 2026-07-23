import type { TrackedItem } from '../api/client'

function formatMoney(value: string, currency: string) {
  const num = Number(value)
  if (Number.isNaN(num)) return `${value} ${currency}`
  const pretty = Number.isInteger(num) ? String(num) : num.toFixed(2).replace(/\.?0+$/, '')
  return `${pretty} ${currency}`
}

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit' })
  } catch {
    return ''
  }
}

export default function ItemCard({ item }: { item: TrackedItem }) {
  return (
    <article className="group flex gap-4 rounded-[var(--radius-lg)] border border-[color:var(--border)] bg-[color:var(--surface)] p-3 transition hover:border-[color:var(--border-strong)] hover:bg-[color:var(--surface-hover)]">
      <a
        href={item.item_url}
        target="_blank"
        rel="noreferrer"
        className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-[color:var(--surface-raised)] ring-1 ring-[color:var(--border)]"
      >
        {item.photo_url ? (
          <img
            src={item.photo_url}
            alt={item.title}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-[color:var(--muted)]">Brak</div>
        )}
      </a>

      <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
        <div>
          <a
            href={item.item_url}
            target="_blank"
            rel="noreferrer"
            className="line-clamp-2 text-sm font-semibold leading-snug text-white transition hover:text-[color:var(--accent)]"
          >
            {item.title}
          </a>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[color:var(--muted-light)]">
            {item.brand && (
              <span className="inline-flex items-center gap-1">
                <TagIcon />
                {item.brand}
              </span>
            )}
            {item.size && (
              <span className="inline-flex items-center gap-1">
                <SizeIcon />
                {item.size}
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              <ClockIcon />
              {formatDate(item.seen_at)} · {formatTime(item.seen_at)}
            </span>
          </div>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-3">
          <p className="text-sm">
            <span className="font-semibold text-white">{formatMoney(item.price, item.currency)}</span>
            <span className="text-[color:var(--muted)]"> → {formatMoney(item.total_price, item.currency)}</span>
          </p>
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-end justify-between gap-2 py-0.5">
        {item.notified && (
          <span className="rounded-full bg-[color:var(--success)]/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[color:var(--success)]">
            TG
          </span>
        )}
        <a
          href={item.item_url}
          target="_blank"
          rel="noreferrer"
          className="rounded-lg bg-[color:var(--accent)] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[color:var(--accent-hover)]"
        >
          Kup ↗
        </a>
      </div>
    </article>
  )
}

function TagIcon() {
  return (
    <svg className="h-3 w-3 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
    </svg>
  )
}

function SizeIcon() {
  return (
    <svg className="h-3 w-3 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
    </svg>
  )
}

function ClockIcon() {
  return (
    <svg className="h-3 w-3 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}
