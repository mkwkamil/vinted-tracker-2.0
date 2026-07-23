import { NavLink, Outlet } from 'react-router-dom'
import { ENABLE_VINTED } from './config/features'

export default function App() {
  return (
    <div className="min-h-screen bg-[color:var(--bg)]">
      <header className="sticky top-0 z-40 border-b border-[color:var(--border)] bg-[color:var(--bg)]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[color:var(--accent)]/15 ring-1 ring-[color:var(--accent)]/30">
              <span className="text-sm font-bold text-[color:var(--accent)]">
                {ENABLE_VINTED ? 'VT' : 'LM'}
              </span>
            </div>
            <div>
              <p className="text-base font-semibold tracking-tight text-white">
                {ENABLE_VINTED ? 'Vinted Tracker' : 'Lumpeksy'}
              </p>
              <p className="text-xs text-[color:var(--muted)]">
                {ENABLE_VINTED ? 'okazje · lumpeksy · telegram' : 'mapa · dostawy · Warszawa'}
              </p>
            </div>
          </div>

          {ENABLE_VINTED ? (
            <nav className="flex gap-1 rounded-xl bg-[color:var(--surface)] p-1 ring-1 ring-[color:var(--border)]">
              <NavLink
                to="/"
                end
                className={({ isActive }) =>
                  `rounded-lg px-4 py-1.5 text-sm font-medium transition ${
                    isActive
                      ? 'bg-[color:var(--accent)] text-white shadow-[0_0_20px_var(--accent-glow)]'
                      : 'text-[color:var(--muted-light)] hover:text-white'
                  }`
                }
              >
                Oferty
              </NavLink>
              <NavLink
                to="/map"
                className={({ isActive }) =>
                  `rounded-lg px-4 py-1.5 text-sm font-medium transition ${
                    isActive
                      ? 'bg-[color:var(--accent)] text-white shadow-[0_0_20px_var(--accent-glow)]'
                      : 'text-[color:var(--muted-light)] hover:text-white'
                  }`
                }
              >
                Lumpeksy
              </NavLink>
            </nav>
          ) : null}
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <Outlet />
      </main>
    </div>
  )
}
