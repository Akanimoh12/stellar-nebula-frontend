/** Lets keyboard users skip past the canvas to the scan results below it. */
export function CanvasSkipLink() {
  return (
    <a
      href="#nebula-scan-results"
      className="sr-only focus:not-sr-only"
      style={{
        position: 'absolute',
        top: '0.5rem',
        left: '0.5rem',
        zIndex: 10,
        padding: '0.5rem 0.75rem',
        background: '#32d6a5',
        color: '#07111f',
        borderRadius: '6px',
        fontWeight: 700,
        textDecoration: 'none',
      }}
      onFocus={(e) => {
        e.currentTarget.style.position = 'absolute'
        e.currentTarget.style.clip = 'auto'
        e.currentTarget.style.width = 'auto'
        e.currentTarget.style.height = 'auto'
      }}
      onBlur={(e) => {
        e.currentTarget.style.position = 'absolute'
        e.currentTarget.style.clip = 'rect(0, 0, 0, 0)'
        e.currentTarget.style.width = '1px'
        e.currentTarget.style.height = '1px'
      }}
    >
      Skip nebula canvas
    </a>
  )
}

/** Visually hidden polite live region that announces scan progress to screen readers. */
export function CanvasLiveRegion({ message }: { message: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
      style={{
        position: 'absolute',
        width: '1px',
        height: '1px',
        padding: 0,
        margin: '-1px',
        overflow: 'hidden',
        clip: 'rect(0, 0, 0, 0)',
        whiteSpace: 'nowrap',
        border: 0,
      }}
    >
      {message}
    </div>
  )
}
