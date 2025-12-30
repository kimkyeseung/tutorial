import React from 'react'
import type { TouchArea } from '../../types/project'

type TouchAreaProps = {
  touchArea: TouchArea
  onClick: () => void
  isVisible: boolean
  showDebugInfo?: boolean
  totalPages?: number
}

const TouchAreaComponent: React.FC<TouchAreaProps> = ({
  touchArea,
  onClick,
  isVisible,
  showDebugInfo = false,
  totalPages: _totalPages = 0,
}) => {
  // 디버그 모드에서는 항상 표시
  if (!isVisible && !showDebugInfo) return null

  const getActionLabel = () => {
    if (touchArea.action.type === 'next') {
      return '→ 다음'
    } else if (touchArea.action.type === 'goto' && touchArea.action.targetPageId !== undefined) {
      const targetPage = parseInt(touchArea.action.targetPageId) + 1
      return `→ ${targetPage}페이지`
    }
    return ''
  }

  const getTimingLabel = () => {
    return touchArea.showTiming === 'immediate' ? '즉시' : '영상 후'
  }

  return (
    <button
      onClick={onClick}
      className='absolute cursor-pointer transition-opacity hover:bg-white hover:bg-opacity-10'
      style={{
        left: `${touchArea.position.x}%`,
        top: `${touchArea.position.y}%`,
        width: `${touchArea.size.width}%`,
        height: `${touchArea.size.height}%`,
        backgroundColor: showDebugInfo ? 'rgba(147, 51, 234, 0.2)' : 'transparent',
        border: showDebugInfo ? '2px dashed #9333ea' : 'none',
        outline: 'none',
        opacity: !isVisible && showDebugInfo ? 0.5 : 1,
      }}
      aria-label='Touch area'
    >
      {showDebugInfo && (
        <div
          className='pointer-events-none absolute left-0 top-0 whitespace-nowrap rounded bg-purple-600 px-1 text-xs text-white'
          style={{ transform: 'translateY(-100%)' }}
        >
          터치영역 {getActionLabel()} ({getTimingLabel()})
        </div>
      )}
    </button>
  )
}

export default TouchAreaComponent
