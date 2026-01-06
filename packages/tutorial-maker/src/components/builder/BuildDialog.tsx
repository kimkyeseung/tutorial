import React, { useState, useEffect } from 'react'
import { listen, type UnlistenFn } from '@tauri-apps/api/event'
import type { CompressionSettings, CompressionQuality } from '@viswave/shared'

interface BuildProgress {
  current: number
  total: number
  percent: number
  fileName: string
  stage: string
}

interface BuildDialogProps {
  isOpen: boolean
  onClose: () => void
  onBuild: (compression: CompressionSettings) => void
  isBuilding: boolean
  videoCount: number
}

const QUALITY_OPTIONS: {
  value: CompressionQuality
  label: string
  description: string
}[] = [
  { value: 'low', label: '저용량', description: '작은 파일 크기, 낮은 화질' },
  { value: 'medium', label: '균형', description: '적당한 크기와 화질' },
  { value: 'high', label: '고품질', description: '높은 화질, 큰 파일 크기 (권장)' },
]

const RESOLUTION_OPTIONS: { value: number | undefined; label: string }[] = [
  { value: undefined, label: '원본 유지' },
  { value: 1080, label: '1080p (Full HD)' },
  { value: 720, label: '720p (HD)' },
  { value: 480, label: '480p (SD)' },
]

const BuildDialog: React.FC<BuildDialogProps> = ({
  isOpen,
  onClose,
  onBuild,
  isBuilding,
  videoCount,
}) => {
  const [enabled, setEnabled] = useState(false)
  const [quality, setQuality] = useState<CompressionQuality>('high')
  const [maxHeight, setMaxHeight] = useState<number | undefined>(undefined)
  const [progress, setProgress] = useState<BuildProgress | null>(null)

  // 빌드 진행 상황 이벤트 리스너
  useEffect(() => {
    let unlisten: UnlistenFn | null = null

    if (isBuilding && enabled) {
      listen<BuildProgress>('build-progress', (event) => {
        setProgress(event.payload)
      }).then((fn) => {
        unlisten = fn
      })
    }

    return () => {
      if (unlisten) {
        unlisten()
      }
      // 빌드가 끝나면 진행 상황 초기화
      if (!isBuilding) {
        setProgress(null)
      }
    }
  }, [isBuilding, enabled])

  if (!isOpen) return null

  const handleBuild = () => {
    setProgress(null)
    onBuild({
      enabled,
      quality,
      maxHeight,
    })
  }

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50'>
      <div className='mx-4 w-full max-w-lg rounded-lg bg-white p-6 shadow-xl'>
        <h2 className='mb-4 text-xl font-bold text-gray-900'>실행 파일 빌드</h2>

        {isBuilding ? (
          <div className='py-6'>
            <h3 className='mb-4 text-center text-lg font-semibold'>빌드 중...</h3>

            {/* 진행 상황 표시 (압축 활성화 시) */}
            {enabled && progress ? (
              <div className='space-y-3'>
                {/* 프로그레스바 */}
                <div className='h-4 w-full overflow-hidden rounded-full bg-gray-200'>
                  <div
                    className='h-full rounded-full bg-purple-600 transition-all duration-300'
                    style={{ width: `${progress.percent}%` }}
                  />
                </div>

                {/* 진행 상황 텍스트 */}
                <div className='flex items-center justify-between text-sm'>
                  <span className='font-medium text-gray-700'>
                    {progress.current}/{progress.total}
                  </span>
                  <span className='font-bold text-purple-600'>
                    {progress.percent.toFixed(2)}%
                  </span>
                </div>

                {/* 현재 파일명 */}
                <p className='truncate text-center text-sm text-gray-500'>
                  압축 중: {progress.fileName}
                </p>
              </div>
            ) : enabled ? (
              <div className='space-y-3'>
                {/* 대기 중 프로그레스바 */}
                <div className='h-4 w-full overflow-hidden rounded-full bg-gray-200'>
                  <div className='h-full w-full animate-pulse rounded-full bg-purple-300' />
                </div>
                <p className='text-center text-sm text-gray-500'>
                  영상 압축을 준비하고 있습니다...
                </p>
              </div>
            ) : (
              <div className='text-center'>
                <div className='mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-purple-200 border-t-purple-600'></div>
                <p className='text-sm text-gray-600'>
                  실행 파일을 생성하고 있습니다.
                </p>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* 영상 압축 설정 */}
            <div className='mb-6'>
              <div className='mb-4 flex items-center justify-between'>
                <div>
                  <h3 className='font-semibold text-gray-900'>영상 압축</h3>
                  <p className='text-sm text-gray-500'>
                    {videoCount > 0
                      ? `${videoCount}개의 영상 파일이 있습니다.`
                      : '영상 파일이 없습니다.'}
                  </p>
                </div>
                <label className='relative inline-flex cursor-pointer items-center'>
                  <input
                    type='checkbox'
                    checked={enabled}
                    onChange={(e) => setEnabled(e.target.checked)}
                    disabled={videoCount === 0}
                    className='peer sr-only'
                  />
                  <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-purple-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:ring-2 peer-focus:ring-purple-300 peer-disabled:cursor-not-allowed peer-disabled:opacity-50"></div>
                </label>
              </div>

              {enabled && videoCount > 0 && (
                <div className='space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4'>
                  {/* 품질 설정 */}
                  <div>
                    <label className='mb-2 block text-sm font-medium text-gray-700'>
                      압축 품질
                    </label>
                    <div className='space-y-2'>
                      {QUALITY_OPTIONS.map((option) => (
                        <label
                          key={option.value}
                          className={`flex cursor-pointer items-center rounded-lg border p-3 transition-colors ${
                            quality === option.value
                              ? 'border-purple-500 bg-purple-50'
                              : 'border-gray-200 hover:bg-gray-100'
                          }`}
                        >
                          <input
                            type='radio'
                            name='quality'
                            value={option.value}
                            checked={quality === option.value}
                            onChange={(e) =>
                              setQuality(e.target.value as CompressionQuality)
                            }
                            className='sr-only'
                          />
                          <div className='flex-1'>
                            <span className='font-medium'>{option.label}</span>
                            <p className='text-sm text-gray-500'>
                              {option.description}
                            </p>
                          </div>
                          {quality === option.value && (
                            <span className='text-purple-600'>✓</span>
                          )}
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* 해상도 설정 */}
                  <div>
                    <label className='mb-2 block text-sm font-medium text-gray-700'>
                      최대 해상도
                    </label>
                    <select
                      value={maxHeight ?? ''}
                      onChange={(e) =>
                        setMaxHeight(
                          e.target.value ? parseInt(e.target.value) : undefined
                        )
                      }
                      className='w-full rounded-lg border border-gray-300 p-2 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500'
                    >
                      {RESOLUTION_OPTIONS.map((option) => (
                        <option key={option.label} value={option.value ?? ''}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <p className='mt-1 text-xs text-gray-500'>
                      영상 높이를 기준으로 비율을 유지하며 축소합니다.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* 버튼 */}
            <div className='flex justify-end gap-3'>
              <button
                onClick={onClose}
                className='rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50'
              >
                취소
              </button>
              <button
                onClick={handleBuild}
                className='rounded-lg bg-purple-600 px-4 py-2 text-white hover:bg-purple-700'
              >
                빌드 시작
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default BuildDialog
