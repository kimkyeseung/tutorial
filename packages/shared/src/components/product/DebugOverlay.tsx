import React from 'react'
import type { Page } from '../../types/project'
import type { VideoDebugInfo } from './VideoPlayer'

type DebugOverlayProps = {
  page: Page
  pageIndex: number
  totalPages: number
  videoDebugInfo: VideoDebugInfo | null
  mediaSize?: number // bytes
}

// 시간 포맷 (초 -> MM:SS)
const formatTime = (seconds: number): string => {
  if (!seconds || !isFinite(seconds)) return '00:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

// 용량 포맷
const formatSize = (bytes: number): string => {
  if (!bytes) return '-'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const DebugOverlay: React.FC<DebugOverlayProps> = ({
  page,
  pageIndex,
  totalPages,
  videoDebugInfo,
  mediaSize,
}) => {
  const pageTitle = page.title || `페이지 ${pageIndex + 1}`
  const mediaTypeIcon = page.mediaType === 'video' ? '🎥' : '🖼️'
  const playCount = page.playCount || 1

  return (
    <div className='pointer-events-none absolute right-4 top-4 z-50 space-y-2'>
      {/* 페이지 정보 */}
      <div className='rounded-lg bg-black/80 px-3 py-2 text-sm text-white'>
        {/* 헤더: 페이지 번호, 타입 뱃지, 제목 */}
        <div className='mb-2 flex items-center gap-2 border-b border-white/20 pb-2'>
          <span className='rounded bg-white/20 px-1.5 py-0.5 text-xs font-bold'>
            {pageIndex + 1}/{totalPages}
          </span>
          <span
            className={`rounded px-1.5 py-0.5 text-xs font-bold ${
              page.playType === 'loop'
                ? 'bg-orange-500 text-white'
                : 'bg-blue-500 text-white'
            }`}
          >
            {page.playType === 'loop' ? '반복' : `${playCount}회`}
          </span>
          <span className='font-semibold'>{mediaTypeIcon} {pageTitle}</span>
        </div>

        <div className='space-y-1 text-xs'>
          <div className='flex justify-between gap-4'>
            <span className='text-gray-400'>버튼:</span>
            <span>{page.buttons.length}개</span>
          </div>
          <div className='flex justify-between gap-4'>
            <span className='text-gray-400'>터치영역:</span>
            <span>{page.touchAreas.length}개</span>
          </div>
          {mediaSize && (
            <div className='flex justify-between gap-4'>
              <span className='text-gray-400'>용량:</span>
              <span>{formatSize(mediaSize)}</span>
            </div>
          )}
        </div>
      </div>

      {/* 영상 정보 (영상일 경우에만) */}
      {page.mediaType === 'video' && videoDebugInfo && (
        <div className='rounded-lg bg-black/80 px-3 py-2 text-sm text-white'>
          <div className='mb-2 border-b border-white/20 pb-1 font-semibold'>
            🎬 재생 정보
          </div>
          <div className='space-y-1 text-xs'>
            <div className='flex justify-between gap-4'>
              <span className='text-gray-400'>재생 시간:</span>
              <span>
                {formatTime(videoDebugInfo.currentTime)} / {formatTime(videoDebugInfo.duration)}
              </span>
            </div>
            <div className='flex justify-between gap-4'>
              <span className='text-gray-400'>진행률:</span>
              <span>
                {videoDebugInfo.duration > 0
                  ? Math.round((videoDebugInfo.currentTime / videoDebugInfo.duration) * 100)
                  : 0}%
              </span>
            </div>
            {/* 반복 모드이거나 실제로 반복이 발생한 경우에만 표시 */}
            {(page.playType === 'loop' || videoDebugInfo.loopCount > 0) && (
              <div className='flex justify-between gap-4'>
                <span className='text-gray-400'>반복 횟수:</span>
                <span>{videoDebugInfo.loopCount}회</span>
              </div>
            )}
            <div className='flex justify-between gap-4'>
              <span className='text-gray-400'>상태:</span>
              <span className={videoDebugInfo.isPlaying ? 'text-green-400' : 'text-yellow-400'}>
                {videoDebugInfo.isPlaying ? '▶ 재생 중' : '⏸ 일시정지'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 단축키 안내 */}
      <div className='rounded-lg bg-black/60 px-3 py-2 text-xs text-gray-400'>
        <span className='text-white'>D</span> 키로 디버그 정보 숨기기
      </div>
    </div>
  )
}

export default DebugOverlay
