import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Image } from '@/components/Image'
import { OptimizedImage } from '@/components/OptimizedImage'

describe('#388 — image alt text', () => {
  describe('Image component', () => {
    it('renders an informative image with the supplied alt text', () => {
      render(<Image variant="informative" src="/hero.png" alt="Stellar nebula formation" />)
      const img = screen.getByRole('img', { name: 'Stellar nebula formation' })
      expect(img).toBeInTheDocument()
      expect(img).toHaveAttribute('alt', 'Stellar nebula formation')
    })

    it('renders a decorative image with alt="" and aria-hidden', () => {
      render(<Image variant="decorative" src="/bg-texture.png" />)
      // aria-hidden removes it from the accessibility tree
      const img = document.querySelector('img')
      expect(img).toHaveAttribute('alt', '')
      expect(img).toHaveAttribute('aria-hidden', 'true')
    })

    it('does not expose a decorative image via getByRole', () => {
      render(<Image variant="decorative" src="/bg-texture.png" />)
      // A hidden image is invisible to assistive technology and query-by-role
      expect(screen.queryByRole('img')).toBeNull()
    })

    it('forwards additional HTML attributes to the underlying img', () => {
      render(
        <Image
          variant="informative"
          src="/token.png"
          alt="USDC token icon"
          width={32}
          height={32}
          className="token-icon"
        />
      )
      const img = screen.getByRole('img', { name: 'USDC token icon' })
      expect(img).toHaveAttribute('width', '32')
      expect(img).toHaveAttribute('class', 'token-icon')
    })
  })

  describe('OptimizedImage component', () => {
    it('always passes the alt prop to the rendered img element', () => {
      render(<OptimizedImage src="/nebula.jpg" alt="Purple nebula cloud" loading="eager" />)
      expect(screen.getByRole('img', { name: 'Purple nebula cloud' })).toBeInTheDocument()
    })

    it('renders inside a picture element when webpSrc is provided', () => {
      render(
        <OptimizedImage
          src="/nebula.jpg"
          alt="Purple nebula cloud"
          webpSrc="/nebula.webp"
          loading="eager"
        />
      )
      expect(document.querySelector('picture')).toBeInTheDocument()
      expect(screen.getByRole('img', { name: 'Purple nebula cloud' })).toBeInTheDocument()
    })
  })
})
