import { useState, useEffect, useRef } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { getCurrentWindow } from '@tauri-apps/api/window'
import {
  ProductPageContent,
  LoadingScreen,
  ErrorScreen,
  setFavicon,
  setDocumentTitle,
  type Project,
} from '@viswave/shared'
import ViewerPage from './pages/ViewerPage'

/**
 * 윈도우 타이틀 설정 (HTML + Tauri 윈도우)
 */
async function setWindowTitle(title: string) {
  // HTML 문서 타이틀 설정
  setDocumentTitle(title)

  // Tauri 윈도우 타이틀 설정
  try {
    await getCurrentWindow().setTitle(title)
  } catch (err) {
    console.warn('Failed to set window title:', err)
  }
}

// 임베딩 정보 타입
interface EmbeddedInfo {
  hasEmbeddedData: boolean
  manifest: {
    projectJsonOffset: number
    projectJsonSize: number
    media: Array<{
      id: string
      name: string
      mimeType: string
      offset: number
      size: number
    }>
    buttons: Array<{
      id: string
      name: string
      mimeType: string
      offset: number
      size: number
    }>
    appIconOffset?: number
    appIconSize?: number
  } | null
}

function App() {
  const [filePath, setFilePath] = useState<string | null>(null)

  // 임베딩 모드 상태
  const [isEmbeddedMode, setIsEmbeddedMode] = useState<boolean | null>(null)
  const [embeddedProject, setEmbeddedProject] = useState<Project | null>(null)
  const [embeddedMediaUrls, setEmbeddedMediaUrls] = useState<
    Record<string, string>
  >({})
  const [embeddedButtonUrls, setEmbeddedButtonUrls] = useState<
    Record<string, string>
  >({})
  const [embeddedIconUrl, setEmbeddedIconUrl] = useState<string | undefined>()
  const [embeddedError, setEmbeddedError] = useState<string | null>(null)

  // URL 참조를 ref로 유지 (cleanup 시 stale closure 방지)
  const urlsRef = useRef({
    mediaUrls: {} as Record<string, string>,
    buttonUrls: {} as Record<string, string>,
    iconUrl: undefined as string | undefined,
  })

  // 임베딩 데이터 확인 및 로드
  useEffect(() => {
    const checkEmbeddedData = async () => {
      try {
        const info = await invoke<EmbeddedInfo>('get_embedded_data_info')

        if (info.hasEmbeddedData && info.manifest) {
          // 임베딩된 프로젝트 JSON 로드
          const projectJson = await invoke<string>('get_embedded_project_json')
          const project: Project = JSON.parse(projectJson)
          setEmbeddedProject(project)

          // 윈도우 타이틀 설정 (앱 타이틀 또는 프로젝트 이름)
          const title = project.appTitle || project.name
          if (title) {
            setWindowTitle(title)
          }

          // 미디어 URL 생성
          const mediaUrls: Record<string, string> = {}
          for (const media of info.manifest.media) {
            const data = await invoke<number[]>('get_embedded_media_data', {
              id: media.id,
            })
            const blob = new Blob([new Uint8Array(data)], {
              type: media.mimeType,
            })
            mediaUrls[media.id] = URL.createObjectURL(blob)
          }
          setEmbeddedMediaUrls(mediaUrls)
          urlsRef.current.mediaUrls = mediaUrls

          // 버튼 이미지 URL 생성
          const buttonUrls: Record<string, string> = {}
          for (const button of info.manifest.buttons) {
            const data = await invoke<number[]>('get_embedded_media_data', {
              id: button.id,
            })
            const blob = new Blob([new Uint8Array(data)], {
              type: button.mimeType,
            })
            buttonUrls[button.id] = URL.createObjectURL(blob)
          }
          setEmbeddedButtonUrls(buttonUrls)
          urlsRef.current.buttonUrls = buttonUrls

          // 앱 아이콘 로드 및 파비콘 설정
          if (info.manifest.appIconOffset && info.manifest.appIconSize) {
            const iconData = await invoke<number[] | null>(
              'get_embedded_app_icon'
            )
            if (iconData) {
              const blob = new Blob([new Uint8Array(iconData)], {
                type: 'image/png',
              })
              const iconUrl = URL.createObjectURL(blob)
              setEmbeddedIconUrl(iconUrl)
              urlsRef.current.iconUrl = iconUrl

              // 파비콘도 설정
              setFavicon(iconUrl)
            }
          }

          setIsEmbeddedMode(true)
        } else {
          setIsEmbeddedMode(false)
        }
      } catch (err) {
        // 임베딩 데이터 확인 실패 - 일반 모드로 전환
        // 대부분의 경우 임베딩 데이터가 없는 것이므로 에러로 처리하지 않음
        const message = err instanceof Error ? err.message : String(err)
        if (message.includes('No embedded data')) {
          setIsEmbeddedMode(false)
        } else {
          console.error('Embedded data check failed:', err)
          setEmbeddedError(message)
          setIsEmbeddedMode(true) // 에러 화면 표시를 위해
        }
      }
    }

    checkEmbeddedData()
  }, [])

  // CLI 인자로 파일 경로 받기 (임베딩 모드가 아닐 때만)
  useEffect(() => {
    if (isEmbeddedMode !== false) return

    const checkCliArgs = async () => {
      try {
        const { getMatches } = await import('@tauri-apps/plugin-cli')
        const matches = await getMatches()

        if (matches.args.file?.value) {
          setFilePath(matches.args.file.value as string)
        }
      } catch (err) {
        // CLI 플러그인이 없거나 에러 발생 시 무시
        console.log('CLI args not available:', err)
      }
    }

    checkCliArgs()
  }, [isEmbeddedMode])

  // URL 정리 (ref를 사용하여 현재 값으로 cleanup)
  useEffect(() => {
    return () => {
      const { mediaUrls, buttonUrls, iconUrl } = urlsRef.current
      Object.values(mediaUrls).forEach(URL.revokeObjectURL)
      Object.values(buttonUrls).forEach(URL.revokeObjectURL)
      if (iconUrl) URL.revokeObjectURL(iconUrl)
    }
  }, [])

  const handleFileSelect = (path: string) => {
    setFilePath(path)
  }

  // 로딩 중 (임베딩 모드 확인 중)
  if (isEmbeddedMode === null) {
    return <LoadingScreen />
  }

  // 임베딩 모드 에러
  if (embeddedError) {
    return <ErrorScreen title='로드 실패' message={embeddedError} />
  }

  // 임베딩 모드: 바로 튜토리얼 재생
  if (isEmbeddedMode && embeddedProject) {
    return (
      <ProductPageContent
        project={embeddedProject}
        mediaUrls={embeddedMediaUrls}
        buttonImageUrls={embeddedButtonUrls}
        iconUrl={embeddedIconUrl}
      />
    )
  }

  // 일반 모드: ViewerPage 표시
  return <ViewerPage filePath={filePath} onFileSelect={handleFileSelect} />
}

export default App
