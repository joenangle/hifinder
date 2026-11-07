'use client'

/** Simple / Advanced: one engine, two views (PRD §6.4). Switching never changes a verdict (D1). */
export function ModeToggle({ advanced, onChange }: { advanced: boolean; onChange: (advanced: boolean) => void }) {
  const option = (on: boolean, label: string) => (
    <button
      type="button"
      aria-pressed={advanced === on}
      onClick={() => onChange(on)}
      className={`min-h-11 px-4 text-sm ${
        advanced === on
          ? 'bg-[var(--text-primary)] font-semibold text-[var(--background-primary)]'
          : 'bg-[var(--background-primary)] text-[var(--text-secondary)]'
      }`}
    >
      {label}
    </button>
  )
  return (
    <div className="flex flex-col items-start gap-1">
      <div
        role="group"
        aria-label="View"
        aria-describedby="stereo-mode-help"
        className="inline-flex overflow-hidden rounded-lg border border-[var(--border-subtle)]"
      >
        {option(false, 'Simple')}
        {option(true, 'Advanced')}
      </div>
      <span id="stereo-mode-help" className="text-xs text-[var(--text-secondary)]">
        Advanced shows every input and three more checks.
      </span>
    </div>
  )
}
