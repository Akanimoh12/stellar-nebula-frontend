import type { ButtonHTMLAttributes, ReactNode } from 'react'

export interface IconButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'aria-label'
> {
  /**
   * Accessible name describing the button's purpose to assistive technologies.
   * Required for all icon-only buttons to satisfy WCAG 2.1 SC 4.1.2.
   */
  'aria-label': string
  /**
   * Icon or graphic content rendered inside the button.
   */
  children: ReactNode
  /**
   * Visual styling variant.
   */
  variant?: 'default' | 'ghost' | 'outline' | 'subtle'
  /**
   * Button dimensions.
   */
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

/**
 * An accessible icon-only button primitive that requires an `aria-label`.
 * Automatically hides icon children from assistive technologies (`aria-hidden="true"`)
 * so screen readers announce only the descriptive label.
 */
export function IconButton({
  'aria-label': ariaLabel,
  children,
  variant = 'default',
  size = 'md',
  className = '',
  type = 'button',
  ...props
}: IconButtonProps) {
  const variantClass = `icon-btn-${variant}`
  const sizeClass = `icon-btn-${size}`

  return (
    <button
      type={type}
      aria-label={ariaLabel}
      className={`icon-button ${variantClass} ${sizeClass} ${className}`.trim()}
      {...props}
    >
      <span
        aria-hidden="true"
        className="icon-button-content inline-flex items-center justify-center pointer-events-none"
      >
        {children}
      </span>
    </button>
  )
}

export default IconButton
