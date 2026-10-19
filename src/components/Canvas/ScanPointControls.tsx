import type { ScanPointMeta } from './scanPoints'

interface ScanPointControlsProps {
  points: ScanPointMeta[]
  remainingSecondsMap: Record<string, number>
  scanningPoints: Set<string>
  focusedPointId: string | null
  isMotionReduced: boolean
  onFocusPoint: (pointId: string) => void
  onClearFocus: () => void
  onScan: (point: ScanPointMeta) => void
}

/** Keyboard-accessible scan buttons overlaid on the nebula canvas. */
export function ScanPointControls({
  points,
  remainingSecondsMap,
  scanningPoints,
  focusedPointId,
  isMotionReduced,
  onFocusPoint,
  onClearFocus,
  onScan,
}: ScanPointControlsProps) {
  return (
    <div
      className="nebula-keyboard-controls"
      role="group"
      aria-label="Scan points - press Tab to navigate, Enter to scan"
      style={{
        position: 'absolute',
        bottom: '1rem',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: '0.5rem',
        flexWrap: 'wrap',
        justifyContent: 'center',
        zIndex: 5,
        pointerEvents: 'auto',
      }}
    >
      {points.map((point) => {
        const remaining = remainingSecondsMap[point.id] || 0
        const isOnCooldown = remaining > 0
        const isScanning = scanningPoints.has(point.id)
        const isFocused = focusedPointId === point.id
        const isDisabled = isOnCooldown || isScanning

        return (
          <button
            key={point.id}
            type="button"
            data-scan-id={point.id}
            tabIndex={0}
            aria-label={
              isScanning
                ? `Scanning ${point.label}... please wait`
                : isOnCooldown
                  ? `${point.label} on cooldown, ${remaining} seconds remaining`
                  : `Scan ${point.label} for ${point.resourceAmount} ${point.resourceType}. Press Enter to scan.`
            }
            aria-pressed={isScanning}
            aria-disabled={isDisabled}
            disabled={isDisabled}
            onFocus={() => onFocusPoint(point.id)}
            onBlur={() => {
              // Delay to allow focus to move to next button
              setTimeout(() => {
                const active = document.activeElement?.getAttribute('data-scan-id')
                if (!active) onClearFocus()
              }, 0)
            }}
            onClick={() => onScan(point)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onScan(point)
              }
            }}
            className={`nebula-scan-button touch-target ${isFocused ? 'is-focused' : ''} ${isDisabled ? 'is-disabled' : ''}`}
            style={{
              padding: '0.5rem 0.75rem',
              borderRadius: '999px',
              border: isFocused ? '3px solid #32d6a5' : '2px solid rgba(159, 216, 255, 0.3)',
              background: isScanning
                ? 'rgba(34, 197, 94, 0.25)'
                : isOnCooldown
                  ? 'rgba(75, 85, 99, 0.6)'
                  : isFocused
                    ? 'rgba(50, 214, 165, 0.25)'
                    : 'rgba(10, 16, 32, 0.85)',
              color: isOnCooldown ? '#9ca3af' : '#f8fbff',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: isDisabled ? 'not-allowed' : 'pointer',
              outline: 'none',
              boxShadow: isFocused
                ? '0 0 0 3px rgba(50, 214, 165, 0.4), 0 4px 12px rgba(0,0,0,0.3)'
                : '0 2px 8px rgba(0,0,0,0.2)',
              transform: isFocused && !isMotionReduced ? 'scale(1.05)' : 'scale(1)',
              transition: isMotionReduced ? 'none' : 'all 160ms ease',
              minHeight: '44px',
              minWidth: '44px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              opacity: isOnCooldown ? 0.7 : 1,
            }}
          >
            <span aria-hidden="true">{isScanning ? '◉' : isOnCooldown ? '◐' : '◎'}</span>
            <span>{point.id}</span>
            {isOnCooldown && <span aria-hidden="true">({remaining}s)</span>}
            {isScanning && <span aria-hidden="true">...</span>}
          </button>
        )
      })}
    </div>
  )
}
