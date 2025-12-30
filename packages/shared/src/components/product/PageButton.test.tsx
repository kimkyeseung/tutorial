import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import PageButtonComponent from './PageButton'
import type { PageButton } from '../../types/project'

// Test fixtures
const createTestButton = (overrides: Partial<PageButton> = {}): PageButton => ({
  id: 'test-button',
  imageId: 'img-1',
  position: { x: 10, y: 20 },
  size: { width: 30, height: 40 },
  action: { type: 'next' },
  showTiming: 'immediate',
  ...overrides,
})

describe('PageButtonComponent', () => {
  describe('visibility', () => {
    it('should render when isVisible is true', () => {
      const button = createTestButton()
      const onClick = vi.fn()
      render(
        <PageButtonComponent
          button={button}
          onClick={onClick}
          isVisible={true}
        />
      )

      expect(screen.getByRole('button')).toBeInTheDocument()
    })

    it('should not render when isVisible is false and showDebugInfo is false', () => {
      const button = createTestButton()
      const onClick = vi.fn()
      render(
        <PageButtonComponent
          button={button}
          onClick={onClick}
          isVisible={false}
          showDebugInfo={false}
        />
      )

      expect(screen.queryByRole('button')).not.toBeInTheDocument()
    })

    it('should render when isVisible is false but showDebugInfo is true', () => {
      const button = createTestButton()
      const onClick = vi.fn()
      render(
        <PageButtonComponent
          button={button}
          onClick={onClick}
          isVisible={false}
          showDebugInfo={true}
        />
      )

      expect(screen.getByRole('button')).toBeInTheDocument()
    })
  })

  describe('positioning', () => {
    it('should apply correct position styles', () => {
      const button = createTestButton({
        position: { x: 25, y: 50 },
        size: { width: 10, height: 15 },
      })
      const onClick = vi.fn()
      render(
        <PageButtonComponent
          button={button}
          onClick={onClick}
          isVisible={true}
        />
      )

      const buttonEl = screen.getByRole('button')
      expect(buttonEl).toHaveStyle({
        left: '25%',
        top: '50%',
        width: '10%',
        height: '15%',
      })
    })
  })

  describe('click handling', () => {
    it('should call onClick when clicked', () => {
      const button = createTestButton()
      const onClick = vi.fn()
      render(
        <PageButtonComponent
          button={button}
          onClick={onClick}
          isVisible={true}
        />
      )

      fireEvent.click(screen.getByRole('button'))
      expect(onClick).toHaveBeenCalledTimes(1)
    })
  })

  describe('background image', () => {
    it('should apply background image when imageUrl is provided', () => {
      const button = createTestButton()
      const onClick = vi.fn()
      render(
        <PageButtonComponent
          button={button}
          imageUrl="https://example.com/image.png"
          onClick={onClick}
          isVisible={true}
        />
      )

      const buttonEl = screen.getByRole('button')
      expect(buttonEl).toHaveStyle({
        backgroundImage: 'url(https://example.com/image.png)',
      })
    })

    it('should apply fallback background color when imageUrl is not provided', () => {
      const button = createTestButton()
      const onClick = vi.fn()
      render(
        <PageButtonComponent
          button={button}
          onClick={onClick}
          isVisible={true}
        />
      )

      const buttonEl = screen.getByRole('button')
      expect(buttonEl).toHaveStyle({
        backgroundColor: 'rgba(59, 130, 246, 0.7)',
      })
    })
  })

  describe('debug mode', () => {
    it('should show debug border when showDebugInfo is true', () => {
      const button = createTestButton()
      const onClick = vi.fn()
      render(
        <PageButtonComponent
          button={button}
          onClick={onClick}
          isVisible={true}
          showDebugInfo={true}
        />
      )

      const buttonEl = screen.getByRole('button')
      // jsdom converts hex to rgb
      expect(buttonEl.style.border).toContain('2px solid')
      expect(buttonEl.style.border).toContain('59, 130, 246')
    })

    it('should not show border when showDebugInfo is false', () => {
      const button = createTestButton()
      const onClick = vi.fn()
      render(
        <PageButtonComponent
          button={button}
          onClick={onClick}
          isVisible={true}
          showDebugInfo={false}
        />
      )

      const buttonEl = screen.getByRole('button')
      // jsdom returns empty string or 'medium' when border is 'none'
      expect(buttonEl.style.border).not.toContain('solid')
    })

    it('should show debug label with next action', () => {
      const button = createTestButton({ action: { type: 'next' } })
      const onClick = vi.fn()
      render(
        <PageButtonComponent
          button={button}
          onClick={onClick}
          isVisible={true}
          showDebugInfo={true}
        />
      )

      expect(screen.getByText(/버튼.*→ 다음/)).toBeInTheDocument()
    })

    it('should show debug label with goto action and target page', () => {
      const button = createTestButton({
        action: { type: 'goto', targetPageId: '2' },
      })
      const onClick = vi.fn()
      render(
        <PageButtonComponent
          button={button}
          onClick={onClick}
          isVisible={true}
          showDebugInfo={true}
        />
      )

      expect(screen.getByText(/버튼.*→ 3페이지/)).toBeInTheDocument()
    })

    it('should show timing label for immediate', () => {
      const button = createTestButton({ showTiming: 'immediate' })
      const onClick = vi.fn()
      render(
        <PageButtonComponent
          button={button}
          onClick={onClick}
          isVisible={true}
          showDebugInfo={true}
        />
      )

      expect(screen.getByText(/즉시/)).toBeInTheDocument()
    })

    it('should show timing label for after-video', () => {
      const button = createTestButton({ showTiming: 'after-video' })
      const onClick = vi.fn()
      render(
        <PageButtonComponent
          button={button}
          onClick={onClick}
          isVisible={true}
          showDebugInfo={true}
        />
      )

      expect(screen.getByText(/영상 후/)).toBeInTheDocument()
    })

    it('should not show debug label when showDebugInfo is false', () => {
      const button = createTestButton()
      const onClick = vi.fn()
      render(
        <PageButtonComponent
          button={button}
          onClick={onClick}
          isVisible={true}
          showDebugInfo={false}
        />
      )

      expect(screen.queryByText(/버튼/)).not.toBeInTheDocument()
    })

    it('should have reduced opacity when not visible but in debug mode', () => {
      const button = createTestButton()
      const onClick = vi.fn()
      render(
        <PageButtonComponent
          button={button}
          onClick={onClick}
          isVisible={false}
          showDebugInfo={true}
        />
      )

      const buttonEl = screen.getByRole('button')
      expect(buttonEl).toHaveStyle({
        opacity: '0.5',
      })
    })

    it('should have full opacity when visible in debug mode', () => {
      const button = createTestButton()
      const onClick = vi.fn()
      render(
        <PageButtonComponent
          button={button}
          onClick={onClick}
          isVisible={true}
          showDebugInfo={true}
        />
      )

      const buttonEl = screen.getByRole('button')
      expect(buttonEl).toHaveStyle({
        opacity: '1',
      })
    })
  })

  describe('accessibility', () => {
    it('should have aria-label', () => {
      const button = createTestButton()
      const onClick = vi.fn()
      render(
        <PageButtonComponent
          button={button}
          onClick={onClick}
          isVisible={true}
        />
      )

      expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Navigation button')
    })
  })
})
