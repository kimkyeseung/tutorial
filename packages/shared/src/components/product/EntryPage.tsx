import React, { useState, useEffect } from 'react'
import type { Project } from '../../types/project'

type EntryPageProps = {
  project: Project
  iconUrl?: string
  onStart: () => void
}

// 전체화면 토글 함수
const toggleFullscreen = async () => {
  try {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen()
    } else {
      await document.exitFullscreen()
    }
  } catch (err) {
    console.error('전체화면 전환 실패:', err)
  }
}

// 날짜 포맷 함수
const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp)
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

const EntryPage: React.FC<EntryPageProps> = ({ project, iconUrl, onStart }) => {
  const [isFullscreen, setIsFullscreen] = useState(false)

  // 전체화면 상태 감지
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () =>
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  const handleToggleFullscreen = (e: React.MouseEvent) => {
    e.stopPropagation() // 부모 onClick 방지
    toggleFullscreen()
  }

  return (
    <div
      className='absolute inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900'
      onClick={onStart}
    >
      {/* 전체화면 토글 버튼 */}
      <button
        onClick={handleToggleFullscreen}
        className='absolute right-4 top-4 rounded-lg bg-gray-700 px-4 py-2 text-sm text-white transition-colors hover:bg-gray-600'
        title={isFullscreen ? '전체화면 종료 (⌘+1)' : '전체화면 (⌘+1)'}
      >
        {isFullscreen ? '⛶ 창모드' : '⛶ 전체화면'}
      </button>

      {/* 프로젝트 정보 영역 */}
      <div className='flex max-w-2xl flex-col items-center px-8'>
        {/* 앱 아이콘 */}
        {iconUrl && (
          <img
            src={iconUrl}
            alt='App Icon'
            className='mb-6 h-[100px] w-[100px] rounded-2xl object-cover shadow-lg'
          />
        )}

        {/* 프로젝트 이름 */}
        <h1 className='mb-4 text-center text-4xl font-bold text-white'>
          {project.appTitle || project.name}
        </h1>

        {/* 프로젝트 설명 */}
        {project.description && (
          <p className='mb-6 text-center text-lg text-gray-300'>
            {project.description}
          </p>
        )}

        {/* 프로젝트 메타 정보 */}
        <div className='mb-8 flex flex-wrap items-center justify-center gap-4 text-sm text-gray-400'>
          <span className='flex items-center gap-1'>
            <span className='text-gray-500'>📄</span>
            {project.pages.length}개 페이지
          </span>
          <span className='text-gray-600'>•</span>
          <span className='flex items-center gap-1'>
            <span className='text-gray-500'>📐</span>
            {project.settings.windowWidth} × {project.settings.windowHeight}
          </span>
          {project.settings.exitKey && (
            <>
              <span className='text-gray-600'>•</span>
              <span className='flex items-center gap-1'>
                <span className='text-gray-500'>⎋</span>
                {project.settings.exitKey} 키로 종료
              </span>
            </>
          )}
        </div>

        {/* 시작 버튼 */}
        <button
          onClick={onStart}
          className='rounded-xl bg-blue-600 px-12 py-4 text-xl font-semibold text-white shadow-lg transition-all hover:bg-blue-500 hover:shadow-xl active:scale-95'
        >
          시작하기
        </button>

        <p className='mt-6 text-sm text-gray-400'>
          화면을 터치하거나 버튼을 클릭하세요
        </p>

        {/* 생성일/수정일 */}
        <div className='mt-8 text-xs text-gray-500'>
          {project.createdAt && (
            <span>생성: {formatDate(project.createdAt)}</span>
          )}
          {project.updatedAt && project.updatedAt !== project.createdAt && (
            <span className='ml-4'>수정: {formatDate(project.updatedAt)}</span>
          )}
        </div>
      </div>
    </div>
  )
}

export default EntryPage
