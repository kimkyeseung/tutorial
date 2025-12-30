import React, { useCallback, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { save } from '@tauri-apps/plugin-dialog'
import JSZip from 'jszip'
import {
  Footer,
  ErrorScreen,
  LoadingScreen,
  ProductPageContent,
  useTutorialViewer,
  viewerRecentFiles,
  type RecentFile,
} from '@viswave/shared'

interface ViewerPageProps {
  filePath: string | null
  onFileSelect: (path: string) => void
}

interface ExportMediaFile {
  id: string
  name: string
  mimeType: string
  data: number[]
}

interface ExportRequest {
  outputPath: string
  projectJson: string
  mediaFiles: ExportMediaFile[]
  buttonFiles: ExportMediaFile[]
  appIcon: number[] | null
}

// 확장자로 MIME 타입 추론
const getMimeType = (ext: string): string => {
  const mimeTypes: Record<string, string> = {
    mp4: 'video/mp4',
    webm: 'video/webm',
    mov: 'video/quicktime',
    avi: 'video/x-msvideo',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
  }
  return mimeTypes[ext] || 'application/octet-stream'
}

const ViewerPage: React.FC<ViewerPageProps> = ({ filePath, onFileSelect }) => {
  const { project, mediaUrls, buttonImageUrls, iconUrl, isLoading, error } =
    useTutorialViewer(filePath)

  const [recentFiles, setRecentFiles] = React.useState<RecentFile[]>([])
  const [isExporting, setIsExporting] = useState(false)

  // 최근 파일 목록 로드
  React.useEffect(() => {
    setRecentFiles(viewerRecentFiles.getRecentFiles())
  }, [])

  // 파일 로드 성공 - 최근 파일에 추가
  React.useEffect(() => {
    if (filePath && project) {
      viewerRecentFiles.addRecentFile(filePath)
    }
  }, [filePath, project])

  // 파일 선택 다이얼로그
  const handleOpenFile = useCallback(async () => {
    try {
      const { open } = await import('@tauri-apps/plugin-dialog')
      const selected = await open({
        filters: [{ name: 'Tutorial', extensions: ['tutorial', 'zip'] }],
        multiple: false,
      })

      if (selected && typeof selected === 'string') {
        // 최근 파일에 추가
        viewerRecentFiles.addRecentFile(selected)
        setRecentFiles(viewerRecentFiles.getRecentFiles())
        onFileSelect(selected)
      }
    } catch (err) {
      console.error('Failed to open file dialog:', err)
    }
  }, [onFileSelect])

  // 최근 파일 클릭
  const handleRecentFileClick = useCallback(
    (file: RecentFile) => {
      onFileSelect(file.path)
    },
    [onFileSelect]
  )

  // 최근 파일 삭제
  const handleRemoveRecentFile = useCallback(
    (path: string, e: React.MouseEvent) => {
      e.stopPropagation()
      viewerRecentFiles.removeRecentFile(path)
      setRecentFiles(viewerRecentFiles.getRecentFiles())
    },
    []
  )

  // 실행파일 내보내기
  const handleExport = useCallback(async () => {
    if (!filePath || !project) return

    setIsExporting(true)

    try {
      // 저장 경로 선택
      const outputPath = await save({
        defaultPath: `${project.appTitle || project.name}.exe`,
        filters: [{ name: 'Executable', extensions: ['exe'] }],
      })

      if (!outputPath) {
        setIsExporting(false)
        return // 사용자가 취소함
      }

      // 튜토리얼 파일 다시 읽기
      const { readFile } = await import('@tauri-apps/plugin-fs')
      const fileData = await readFile(filePath)
      const zip = await JSZip.loadAsync(fileData)

      // 프로젝트 JSON
      const projectFile = zip.file('project.json')
      if (!projectFile) {
        throw new Error('project.json not found')
      }
      const projectJson = await projectFile.async('text')

      // 미디어 파일 수집
      const mediaFiles: ExportMediaFile[] = []
      for (const [path, file] of Object.entries(zip.files)) {
        if (path.startsWith('media/') && !file.dir) {
          const data = await file.async('uint8array')
          const fileName = path.replace('media/', '')
          const mediaId =
            fileName.substring(0, fileName.lastIndexOf('.')) || fileName

          // MIME 타입 추론
          const ext = fileName.split('.').pop()?.toLowerCase() || ''
          const mimeType = getMimeType(ext)

          mediaFiles.push({
            id: mediaId,
            name: fileName,
            mimeType,
            data: Array.from(data),
          })
        }
      }

      // 버튼 이미지 수집
      const buttonFiles: ExportMediaFile[] = []
      for (const [path, file] of Object.entries(zip.files)) {
        if (path.startsWith('buttons/') && !file.dir) {
          const data = await file.async('uint8array')
          const fileName = path.replace('buttons/', '')
          const buttonId =
            fileName.substring(0, fileName.lastIndexOf('.')) || fileName

          const ext = fileName.split('.').pop()?.toLowerCase() || ''
          const mimeType = getMimeType(ext)

          buttonFiles.push({
            id: buttonId,
            name: fileName,
            mimeType,
            data: Array.from(data),
          })
        }
      }

      // 앱 아이콘 수집
      let appIcon: number[] | null = null
      for (const [path, file] of Object.entries(zip.files)) {
        if (path.startsWith('icons/') && !file.dir) {
          const data = await file.async('uint8array')
          appIcon = Array.from(data)
          break
        }
      }

      // Rust 백엔드 호출
      const request: ExportRequest = {
        outputPath,
        projectJson,
        mediaFiles,
        buttonFiles,
        appIcon,
      }

      await invoke('export_as_executable', { request })

      // 성공 알림
      alert(`실행파일이 생성되었습니다:\n${outputPath}`)
    } catch (err) {
      console.error('Export failed:', err)
      const message = err instanceof Error ? err.message : 'Export failed'
      alert(`내보내기 실패: ${message}`)
    } finally {
      setIsExporting(false)
    }
  }, [filePath, project])

  // 파일이 선택되지 않은 상태 - 파일 선택 UI
  if (!filePath) {
    return (
      <div className='flex min-h-screen flex-col items-center justify-center bg-gray-900 text-white'>
        <h1 className='mb-8 text-3xl font-bold'>튜토리얼 뷰어</h1>

        <button
          onClick={handleOpenFile}
          className='mb-8 rounded-lg bg-purple-600 px-8 py-4 text-lg font-semibold transition-colors hover:bg-purple-700'
        >
          .tutorial 파일 열기
        </button>

        {/* 최근 파일 목록 */}
        {recentFiles.length > 0 && (
          <div className='w-full max-w-md'>
            <h2 className='mb-4 text-center text-sm font-medium text-gray-400'>
              최근 열어본 파일
            </h2>
            <div className='space-y-2'>
              {recentFiles.map((file) => (
                <div
                  key={file.path}
                  onClick={() => handleRecentFileClick(file)}
                  className='flex cursor-pointer items-center justify-between rounded-lg bg-gray-800 px-4 py-3 transition-colors hover:bg-gray-700'
                >
                  <div className='min-w-0 flex-1'>
                    <p className='truncate font-medium'>{file.name}</p>
                    <p className='truncate text-xs text-gray-500'>
                      {file.path}
                    </p>
                  </div>
                  <button
                    onClick={(e) => handleRemoveRecentFile(file.path, e)}
                    className='ml-3 flex-shrink-0 rounded p-1 text-gray-500 transition-colors hover:bg-gray-600 hover:text-white'
                    title='목록에서 제거'
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className='mt-12 text-xs text-gray-500'>
          .tutorial 또는 .zip 파일을 열 수 있습니다
        </p>

        <Footer className='mt-8' />
      </div>
    )
  }

  // 로딩 중
  if (isLoading) {
    return <LoadingScreen />
  }

  // 에러 발생
  if (error) {
    return <ErrorScreen title='파일을 열 수 없습니다' message={error} />
  }

  // 프로젝트 없음
  if (!project) {
    return (
      <ErrorScreen
        title='프로젝트를 로드할 수 없습니다'
        message='파일이 손상되었거나 올바른 형식이 아닙니다'
      />
    )
  }

  // 튜토리얼 재생
  return (
    <ProductPageContent
      project={project}
      mediaUrls={mediaUrls}
      buttonImageUrls={buttonImageUrls}
      iconUrl={iconUrl}
      onExport={handleExport}
      isExporting={isExporting}
    />
  )
}

export default ViewerPage
