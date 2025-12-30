import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import TouchAreaComponent from './TouchAreaComponent'
import type { TouchArea } from '../../types/project'

// Test fixtures
const createTestTouchArea = (overrides: Partial<TouchArea> = {}): TouchArea => ({
  id: 'test-touch-area',
  position: { x: 10, y: 20 },
  size: { width: 30, height: 40 },
  action: { type: 'next' },
  showTiming: 'immediate',
  ...overrides,
})

describe('TouchAreaComponent', () => {
  describe('visibility', () => {
    it('should render when isVisible is true', () => {
      const touchArea = createTestTouchArea()
      const onClick = vi.fn()
      render(
        <TouchAreaComponent
          touchArea={touchArea}
          onClick={onClick}
          isVisible={true}
        />
      )

      expect(screen.getByRole('button')).toBeInTheDocument()
    })

    it('should not render when isVisible is false and showDebugInfo is false', () => {
      const touchArea = createTestTouchArea()
      const onClick = vi.fn()
      render(
        <TouchAreaComponent
          touchArea={touchArea}
          onClick={onClick}
          isVisible={false}
          showDebugInfo={false}
        />
      )

      expect(screen.queryByRole('button')).not.toBeInTheDocument()
    })

    it('should render when isVisible is false but showDebugInfo is true', () => {
      const touchArea = createTestTouchArea()
      const onClick = vi.fn()
      render(
        <TouchAreaComponent
          touchArea={touchArea}
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
      const touchArea = createTestTouchArea({
        position: { x: 25, y: 50 },
        size: { width: 10, height: 15 },
      })
      const onClick = vi.fn()
      render(
        <TouchAreaComponent
          touchArea={touchArea}
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
      const touchArea = createTestTouchArea()
      const onClick = vi.fn()
      render(
        <TouchAreaComponent
          touchArea={touchArea}
          onClick={onClick}
          isVisible={true}
        />
      )

      fireEvent.click(screen.getByRole('button'))
      expect(onClick).toHaveBeenCalledTimes(1)
    })
  })

  describe('normal mode (non-debug)', () => {
    it('should be transparent when not in debug mode', () => {
      const touchArea = createTestTouchArea()
      const onClick = vi.fn()
      render(
        <TouchAreaComponent
          touchArea={touchArea}
          onClick={onClick}
          isVisible={true}
          showDebugInfo={false}
        />
      )

      const buttonEl = screen.getByRole('button')
      expect(buttonEl.style.backgroundColor).toBe('transparent')
      // jsdom returns empty string or 'medium' when border is 'none'
      expect(buttonEl.style.border).not.toContain('dashed')
    })
  })

  describe('debug mode', () => {
    it('should show purple debug styles when showDebugInfo is true', () => {
      const touchArea = createTestTouchArea()
      const onClick = vi.fn()
      render(
        <TouchAreaComponent
          touchArea={touchArea}
          onClick={onClick}
          isVisible={true}
          showDebugInfo={true}
        />
      )

      const buttonEl = screen.getByRole('button')
      expect(buttonEl.style.backgroundColor).toBe('rgba(147, 51, 234, 0.2)')
      // jsdom converts hex to rgb
      expect(buttonEl.style.border).toContain('2px dashed')
      expect(buttonEl.style.border).toContain('147, 51, 234')
    })

    it('should show debug label with next action', () => {
      const touchArea = createTestTouchArea({ action: { type: 'next' } })
      const onClick = vi.fn()
      render(
        <TouchAreaComponent
          touchArea={touchArea}
          onClick={onClick}
          isVisible={true}
          showDebugInfo={true}
        />
      )

      expect(screen.getByText(/터치영역.*→ 다음/)).toBeInTheDocument()
    })

    it('should show debug label with goto action and target page', () => {
      const touchArea = createTestTouchArea({
        action: { type: 'goto', targetPageId: '4' },
      })
      const onClick = vi.fn()
      render(
        <TouchAreaComponent
          touchArea={touchArea}
          onClick={onClick}
          isVisible={true}
          showDebugInfo={true}
        />
      )

      expect(screen.getByText(/터치영역.*→ 5페이지/)).toBeInTheDocument()
    })

    it('should show timing label for immediate', () => {
      const touchArea = createTestTouchArea({ showTiming: 'immediate' })
      const onClick = vi.fn()
      render(
        <TouchAreaComponent
          touchArea={touchArea}
          onClick={onClick}
          isVisible={true}
          showDebugInfo={true}
        />
      )

      expect(screen.getByText(/즉시/)).toBeInTheDocument()
    })

    it('should show timing label for after-video', () => {
      const touchArea = createTestTouchArea({ showTiming: 'after-video' })
      const onClick = vi.fn()
      render(
        <TouchAreaComponent
          touchArea={touchArea}
          onClick={onClick}
          isVisible={true}
          showDebugInfo={true}
        />
      )

      expect(screen.getByText(/영상 후/)).toBeInTheDocument()
    })

    it('should not show debug label when showDebugInfo is false', () => {
      const touchArea = createTestTouchArea()
      const onClick = vi.fn()
      render(
        <TouchAreaComponent
          touchArea={touchArea}
          onClick={onClick}
          isVisible={true}
          showDebugInfo={false}
        />
      )

      expect(screen.queryByText(/터치영역/)).not.toBeInTheDocument()
    })

    it('should have reduced opacity when not visible but in debug mode', () => {
      const touchArea = createTestTouchArea()
      const onClick = vi.fn()
      render(
        <TouchAreaComponent
          touchArea={touchArea}
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
      const touchArea = createTestTouchArea()
      const onClick = vi.fn()
      render(
        <TouchAreaComponent
          touchArea={touchArea}
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

    it('should use purple color for debug label background', () => {
      const touchArea = createTestTouchArea()
      const onClick = vi.fn()
      render(
        <TouchAreaComponent
          touchArea={touchArea}
          onClick={onClick}
          isVisible={true}
          showDebugInfo={true}
        />
      )

      const label = screen.getByText(/터치영역/)
      expect(label).toHaveClass('bg-purple-600')
    })
  })

  describe('accessibility', () => {
    it('should have aria-label', () => {
      const touchArea = createTestTouchArea()
      const onClick = vi.fn()
      render(
        <TouchAreaComponent
          touchArea={touchArea}
          onClick={onClick}
          isVisible={true}
        />
      )

      expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Touch area')
    })
  })
})
