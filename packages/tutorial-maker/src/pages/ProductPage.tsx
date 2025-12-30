import React, { useState, useCallback } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { save } from '@tauri-apps/plugin-dialog'
import {
  ErrorScreen,
  LoadingScreen,
  ProductPageContent,
} from '@viswave/shared'
import { useProductProject } from '../hooks/useProductProject'
import {
  getProject,
  getMediaFile,
  getButtonImage,
  getAppIcon,
} from '../utils/mediaStorage'

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

// 기존 ProductPage (useProductProject 훅 사용)
interface ProductPageProps {
  projectId?: string // 개발 모드 미리보기에서 특정 프로젝트 ID 전달
}

const ProductPage: React.FC<ProductPageProps> = ({ projectId }) => {
  const { project, mediaUrls, buttonImageUrls, iconUrl, isLoading } =
    useProductProject(projectId)
  const [isExporting, setIsExporting] = useState(false)

  // 실행파일 내보내기
  const handleExport = useCallback(async () => {
    if (!projectId || !project) return

    setIsExporting(true)

    try {
      // 저장 경로 선택
      const outputPath = await save({
        defaultPath: `${project.appTitle || project.name}.exe`,
        filters: [{ name: 'Executable', extensions: ['exe'] }],
      })

      if (!outputPath) {
        setIsExporting(false)
        return
      }

      // 프로젝트 다시 로드 (최신 데이터)
      const projectData = await getProject(projectId)
      if (!projectData) {
        throw new Error('Project not found')
      }

      // 미디어 파일 수집
      const mediaFiles: ExportMediaFile[] = []
      for (const page of projectData.pages) {
        if (page.mediaId) {
          const media = await getMediaFile(page.mediaId)
          if (media) {
            const arrayBuffer = await media.blob.arrayBuffer()
            mediaFiles.push({
              id: media.id,
              name: media.name,
              mimeType: media.blob.type,
              data: Array.from(new Uint8Array(arrayBuffer)),
            })
          }
        }
      }

      // 버튼 이미지 수집
      const buttonFiles: ExportMediaFile[] = []
      const processedButtonIds = new Set<string>()
      for (const page of projectData.pages) {
        for (const button of page.buttons) {
          if (button.imageId && !processedButtonIds.has(button.imageId)) {
            processedButtonIds.add(button.imageId)
            const image = await getButtonImage(button.imageId)
            if (image) {
              const arrayBuffer = await image.blob.arrayBuffer()
              buttonFiles.push({
                id: image.id,
                name: image.name,
                mimeType: image.blob.type,
                data: Array.from(new Uint8Array(arrayBuffer)),
              })
            }
          }
        }
      }

      // 앱 아이콘 수집
      let appIcon: number[] | null = null
      if (projectData.appIcon) {
        const icon = await getAppIcon(projectData.appIcon)
        if (icon) {
          const arrayBuffer = await icon.blob.arrayBuffer()
          appIcon = Array.from(new Uint8Array(arrayBuffer))
        }
      }

      // Rust 백엔드 호출
      const request: ExportRequest = {
        outputPath,
        projectJson: JSON.stringify(projectData),
        mediaFiles,
        buttonFiles,
        appIcon,
      }

      await invoke('export_as_executable', { request })

      alert(`실행파일이 생성되었습니다:\n${outputPath}`)
    } catch (err) {
      console.error('Export failed:', err)
      const message = err instanceof Error ? err.message : 'Export failed'
      alert(`내보내기 실패: ${message}`)
    } finally {
      setIsExporting(false)
    }
  }, [projectId, project])

  // 로딩 중
  if (isLoading) {
    return <LoadingScreen />
  }

  // 프로젝트 없음
  if (!project) {
    return (
      <ErrorScreen
        title='프로젝트를 찾을 수 없습니다'
        message='빌더 페이지에서 프로젝트를 먼저 만들어주세요'
      />
    )
  }

  return (
    <ProductPageContent
      project={project}
      mediaUrls={mediaUrls}
      buttonImageUrls={buttonImageUrls}
      iconUrl={iconUrl}
      onExport={handleExport}
      isExporting={isExporting}
      emptyMessage='빌더 페이지에서 페이지를 추가해주세요'
    />
  )
}

export default ProductPage
