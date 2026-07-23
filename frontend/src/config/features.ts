function parseBool(value: string | undefined, fallback = false): boolean {
  if (value == null || value === '') return fallback
  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase())
}

/** Build-time flag from VITE_ENABLE_VINTED / ENABLE_VINTED. */
export const ENABLE_VINTED = parseBool(import.meta.env.VITE_ENABLE_VINTED, false)
