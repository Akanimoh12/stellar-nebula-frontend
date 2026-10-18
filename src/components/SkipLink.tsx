import type { AnchorHTMLAttributes, ReactNode } from 'react'
import '../styles/skip-link.css'

export interface SkipLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  targetId: string
  children: ReactNode
  className?: string
}

export function SkipLink({ targetId, children, className = '', ...props }: SkipLinkProps) {
  const cleanId = targetId.replace(/^#/, '')
  const href = `#${cleanId}`

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const target = document.getElementById(cleanId)
    if (target) {
      e.preventDefault()
      target.tabIndex = -1
      target.focus()
      target.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <a href={href} className={`skip-link ${className}`.trim()} onClick={handleClick} {...props}>
      {children}
    </a>
  )
}

export interface SkipLinksProps {
  mainId?: string
  navId?: string
}

export function SkipLinks({ mainId = 'main-content', navId = 'navigation' }: SkipLinksProps) {
  return (
    <nav className="skip-links-container" aria-label="Skip links">
      <SkipLink targetId={mainId}>Skip to main content</SkipLink>
      <SkipLink targetId={navId}>Skip to navigation</SkipLink>
    </nav>
  )
}

export default SkipLink
