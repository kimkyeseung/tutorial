import React, { useRef, useEffect, useState } from 'react'
import type { Page } from '../../types/project'
import PageButtonComponent from './PageButton'
import TouchAreaComponent from './TouchAreaComponent'

export type VideoDebugInfo = {
  currentTime: number
  duration: number
  loopCount: number
  isPlaying: boolean
}

type VideoPlayerProps = {
  page: Page
  mediaUrl: string
  buttonImageUrls?: Record<string, string>
  onVideoEnd: () => void
  onButtonClick: (buttonId: string) => void
  onTouchAreaClick: (touchAreaId: string) => void
  isActive?: boolean
  resumeSignal?: number
  showDebugInfo?: boolean
  onDebugInfoUpdate?: (info: VideoDebugInfo) => void
  totalPages?: number
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  page,
  mediaUrl,
  buttonImageUrls = {},
  onVideoEnd,
  onButtonClick,
  onTouchAreaClick,
  isActive = true,
  resumeSignal = 0,
  showDebugInfo = false,
  onDebugInfoUpdate,
  totalPages = 0,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const [hasEnded, setHasEnded] = useState(false)
  const [currentPlayCount, setCurrentPlayCount] = useState(0) // 현재 재생 횟수
  const [loopCount, setLoopCount] = useState(0) // 반복 횟수 (loop 모드용)

  // 활성 상태가 되면 비디오 재생, 비활성화되면 일시정지
  useEffect(() => {
    if (page.mediaType === 'video' && videoRef.current && mediaUrl) {
      if (isActive) {
        setHasEnded(false)
        setCurrentPlayCount(0) // 재생 횟수 초기화
        setLoopCount(0) // 반복 횟수 초기화
        videoRef.current.currentTime = 0
        videoRef.current.play().catch((err) => {
          console.error('Failed to play video:', err)
        })
      } else {
        videoRef.current.pause()
      }
    }
  }, [isActive, page.mediaType, mediaUrl])

  // 디버그 정보 업데이트 (비디오 타임 업데이트)
  useEffect(() => {
    if (!showDebugInfo || !onDebugInfoUpdate || page.mediaType !== 'video') {
      return
    }

    const video = videoRef.current
    if (!video) return

    const handleTimeUpdate = () => {
      onDebugInfoUpdate({
        currentTime: video.currentTime,
        duration: video.duration || 0,
        loopCount: loopCount,
        isPlaying: !video.paused,
      })
    }

    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('play', handleTimeUpdate)
    video.addEventListener('pause', handleTimeUpdate)

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('play', handleTimeUpdate)
      video.removeEventListener('pause', handleTimeUpdate)
    }
  }, [showDebugInfo, onDebugInfoUpdate, page.mediaType, loopCount])

  // 미디어 URL 변경 시 로드
  useEffect(() => {
    if (page.mediaType === 'video' && videoRef.current) {
      videoRef.current.load()
    }
  }, [mediaUrl, page.mediaType])

  // 사용자 상호작용 이후 재생을 다시 시도 (빌드 후 자동재생 차단 대응)
  useEffect(() => {
    if (
      page.mediaType !== 'video' ||
      !isActive ||
      !videoRef.current ||
      !mediaUrl
    ) {
      return
    }

    videoRef.current.play().catch((err) => {
      console.error('Failed to resume video after user action:', err)
    })
  }, [resumeSignal, isActive, page.mediaType, mediaUrl])

  const handleVideoEnded = () => {
    setHasEnded(true)

    if (page.playType === 'single') {
      const targetCount = page.playCount || 1
      const newCount = currentPlayCount + 1

      if (newCount >= targetCount) {
        // 목표 재생 횟수에 도달하면 다음 페이지로 이동
        onVideoEnd()
      } else {
        // 아직 재생 횟수가 남았으면 다시 재생
        setCurrentPlayCount(newCount)
        setLoopCount((prev) => prev + 1) // 반복 횟수 증가
        setHasEnded(false)
        if (videoRef.current) {
          videoRef.current.currentTime = 0
          videoRef.current.play()
        }
      }
    } else {
      // loop 모드: 무한 반복 재생
      setLoopCount((prev) => prev + 1) // 반복 횟수 증가
      if (videoRef.current) {
        videoRef.current.currentTime = 0
        videoRef.current.play()
      }
    }
  }

  return (
    <div className='absolute inset-0 h-full w-full bg-black'>
      {page.mediaType === 'video' ? (
        <video
          ref={videoRef}
          className='h-full w-full object-contain'
          onEnded={handleVideoEnded}
          playsInline
        >
          <source src={mediaUrl} type='video/mp4' />
          <source src={mediaUrl} type='video/webm' />
        </video>
      ) : (
        <img
          ref={imageRef}
          src={mediaUrl}
          alt='Page content'
          className='h-full w-full object-contain'
        />
      )}

      {/* 버튼 렌더링 */}
      {page.buttons.map((button) => {
        const isVisible =
          button.showTiming === 'immediate' ||
          (button.showTiming === 'after-video' && hasEnded)

        return (
          <PageButtonComponent
            key={button.id}
            button={button}
            imageUrl={buttonImageUrls[button.imageId]}
            onClick={() => onButtonClick(button.id)}
            isVisible={isVisible}
            showDebugInfo={showDebugInfo}
            totalPages={totalPages}
          />
        )
      })}

      {/* 터치 영역 렌더링 */}
      {page.touchAreas.map((touchArea) => {
        const isVisible =
          touchArea.showTiming === 'immediate' ||
          (touchArea.showTiming === 'after-video' && hasEnded)

        return (
          <TouchAreaComponent
            key={touchArea.id}
            touchArea={touchArea}
            onClick={() => onTouchAreaClick(touchArea.id)}
            isVisible={isVisible}
            showDebugInfo={showDebugInfo}
            totalPages={totalPages}
          />
        )
      })}
    </div>
  )
}

export default VideoPlayer
