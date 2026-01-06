import React, { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { save } from '@tauri-apps/plugin-dialog'
import {
  ConfirmDialog,
  type Project,
  type Page,
  type CompressionSettings,
} from '@viswave/shared'
import BuildDialog from '../components/builder/BuildDialog'
import FlowMap from '../components/builder/FlowMap'
import PageEditor from '../components/builder/PageEditor'
import PageList from '../components/builder/PageList'
import ProjectSettings from '../components/builder/ProjectSettings'
import {
  getAllProjects,
  saveProject,
  deleteProject,
  getAppIcon,
  getMediaFile,
  getButtonImage,
  createBlobURL,
} from '../utils/mediaStorage'
import { validateAllPages } from '../utils/pageValidation'
import { saveBlobToTempFile } from '../utils/tempFile'

/**
 * 대용량 파일 임계값 (10MB)
 *
 * ⚠️ 중요: 이 값 이상의 파일은 반드시 임시 파일로 저장해야 함!
 *
 * 이유:
 * - Array.from(new Uint8Array(arrayBuffer))는 바이너리를 숫자 배열로 변환
 * - JSON 직렬화 시 메모리가 원본의 ~8배로 증가
 * - V8 엔진의 문자열 최대 길이(~512MB) 초과 시 "Invalid string length" 오류 발생
 *
 * 해결:
 * - 대용량 파일은 saveBlobToTempFile()로 임시 파일 저장
 * - Rust 백엔드에서 64KB 버퍼로 스트리밍 읽기
 */
const LARGE_FILE_THRESHOLD = 10 * 1024 * 1024

interface ExportMediaFile {
  id: string
  name: string
  mimeType: string
  data?: number[] // 소용량 파일용
  path?: string // 대용량 파일용 (임시 파일 경로)
}

interface ExportRequest {
  outputPath: string
  projectJson: string
  mediaFiles: ExportMediaFile[]
  buttonFiles: ExportMediaFile[]
  appIcon: number[] | null
  compression?: CompressionSettings
}

type View = 'list' | 'settings' | 'pages'
type PagesViewMode = 'list' | 'flowmap'

interface BuilderPageProps {
  onPreview?: (projectId: string) => void
}

const BuilderPage: React.FC<BuilderPageProps> = ({ onPreview }) => {
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [currentView, setCurrentView] = useState<View>('list')
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null)
  const [isBuilding, setIsBuilding] = useState(false)
  const [pagesViewMode, setPagesViewMode] = useState<PagesViewMode>('list')
  const [projectIcons, setProjectIcons] = useState<Record<string, string>>({})
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean
    projectId: string
    projectName: string
  }>({ isOpen: false, projectId: '', projectName: '' })
  const [unsavedChangesConfirm, setUnsavedChangesConfirm] = useState(false)
  const [previewConfirm, setPreviewConfirm] = useState(false)
  const [buildDialogOpen, setBuildDialogOpen] = useState(false)

  useEffect(() => {
    loadProjects()
  }, [])

  // 프로젝트 아이콘 로드
  useEffect(() => {
    const loadIcons = async () => {
      const icons: Record<string, string> = {}
      for (const project of projects) {
        if (project.appIcon && !projectIcons[project.id]) {
          const icon = await getAppIcon(project.appIcon)
          if (icon) {
            icons[project.id] = await createBlobURL(icon.blob)
          }
        }
      }
      if (Object.keys(icons).length > 0) {
        setProjectIcons((prev) => ({ ...prev, ...icons }))
      }
    }
    loadIcons()
  }, [projects])

  const loadProjects = async () => {
    const allProjects = await getAllProjects()
    setProjects(allProjects)
  }

  const createNewProject = async () => {
    const newProject: Project = {
      id: crypto.randomUUID(),
      name: '새 프로젝트',
      description: '',
      appTitle: '새 프로젝트',
      pages: [],
      settings: {
        windowWidth: 1920,
        windowHeight: 1080,
        fullscreen: true,
        showProgress: false,
        showHomeButton: false,
        showBackButton: false,
        loopAtEnd: true,
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }

    await saveProject(newProject)
    await loadProjects()
    setSelectedProject(newProject)
    setCurrentView('settings')
  }

  const handleProjectUpdate = (updates: Partial<Project>) => {
    if (!selectedProject) return

    const updatedProject = {
      ...selectedProject,
      ...updates,
      updatedAt: Date.now(),
    }
    setSelectedProject(updatedProject)
    setHasUnsavedChanges(true)
  }

  const handleSaveProject = async () => {
    if (!selectedProject) return

    await saveProject(selectedProject)
    await loadProjects()
    setHasUnsavedChanges(false)
    alert('프로젝트가 저장되었습니다!')
  }

  const handleSelectProject = (project: Project) => {
    setSelectedProject(project)
    setCurrentView('settings')
    setHasUnsavedChanges(false)
  }

  const handleBackToList = () => {
    setSelectedProject(null)
    setCurrentView('list')
  }

  const handleDeleteProject = (projectId: string, projectName: string) => {
    setDeleteConfirm({
      isOpen: true,
      projectId,
      projectName,
    })
  }

  const confirmDeleteProject = async () => {
    try {
      await deleteProject(deleteConfirm.projectId)
      await loadProjects()
      setDeleteConfirm({ isOpen: false, projectId: '', projectName: '' })
      alert('프로젝트가 삭제되었습니다.')
    } catch (error) {
      console.error('Delete failed:', error)
      alert('프로젝트 삭제에 실패했습니다.')
    }
  }

  const cancelDeleteProject = () => {
    setDeleteConfirm({ isOpen: false, projectId: '', projectName: '' })
  }

  const handleGoToPages = () => {
    if (hasUnsavedChanges) {
      setUnsavedChangesConfirm(true)
    } else {
      setCurrentView('pages')
    }
  }

  const confirmSaveAndGoToPages = async () => {
    setUnsavedChangesConfirm(false)
    if (selectedProject) {
      await saveProject(selectedProject)
      await loadProjects()
      setHasUnsavedChanges(false)
    }
    setCurrentView('pages')
  }

  const skipSaveAndGoToPages = () => {
    setUnsavedChangesConfirm(false)
    setCurrentView('pages')
  }

  // 미리보기 클릭 핸들러
  const handlePreviewClick = () => {
    if (!selectedProject || !onPreview) return

    if (hasUnsavedChanges) {
      setPreviewConfirm(true)
    } else {
      onPreview(selectedProject.id)
    }
  }

  const confirmSaveAndPreview = async () => {
    setPreviewConfirm(false)
    if (selectedProject && onPreview) {
      await saveProject(selectedProject)
      await loadProjects()
      setHasUnsavedChanges(false)
      onPreview(selectedProject.id)
    }
  }

  const skipSaveAndPreview = () => {
    setPreviewConfirm(false)
    if (selectedProject && onPreview) {
      onPreview(selectedProject.id)
    }
  }

  // 빌드 다이얼로그 열기
  const handleBuildClick = async () => {
    if (!selectedProject) return

    if (selectedProject.pages.length === 0) {
      alert('빌드할 수 없습니다. 페이지가 없습니다.')
      return
    }

    const validation = validateAllPages(selectedProject.pages)
    if (!validation.isValid) {
      const errorMessages = validation.invalidPages
        .map(
          ({ pageIndex, errors }) =>
            `페이지 ${pageIndex + 1}: ${errors.join(', ')}`
        )
        .join(', ')
      alert(`빌드할 수 없습니다. ${errorMessages}`)
      return
    }

    await saveProject(selectedProject)
    setBuildDialogOpen(true)
  }

  // 실행 파일 빌드
  const handleBuild = async (compression: CompressionSettings) => {
    if (!selectedProject) return
    setIsBuilding(true)

    try {
      const outputPath = await save({
        defaultPath: `${selectedProject.appTitle || selectedProject.name}.exe`,
        filters: [{ name: 'Executable', extensions: ['exe'] }],
      })

      if (!outputPath) {
        setIsBuilding(false)
        return
      }

      // 미디어 파일 수집 (대용량은 임시 파일로 저장)
      const mediaFiles: ExportMediaFile[] = []
      for (const page of selectedProject.pages) {
        if (page.mediaId) {
          const media = await getMediaFile(page.mediaId)
          if (media) {
            if (media.blob.size >= LARGE_FILE_THRESHOLD) {
              // 대용량 파일: 임시 파일로 저장하고 경로 전달
              const tempPath = await saveBlobToTempFile(media.blob, media.name)
              mediaFiles.push({
                id: media.id,
                name: media.name,
                mimeType: media.blob.type,
                path: tempPath,
              })
            } else {
              // 소용량 파일: 메모리에서 직접 전달
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
      }

      // 버튼 이미지 수집 (일반적으로 소용량)
      const buttonFiles: ExportMediaFile[] = []
      const processedButtonIds = new Set<string>()
      for (const page of selectedProject.pages) {
        for (const button of page.buttons) {
          if (button.imageId && !processedButtonIds.has(button.imageId)) {
            processedButtonIds.add(button.imageId)
            const image = await getButtonImage(button.imageId)
            if (image) {
              if (image.blob.size >= LARGE_FILE_THRESHOLD) {
                const tempPath = await saveBlobToTempFile(
                  image.blob,
                  image.name
                )
                buttonFiles.push({
                  id: image.id,
                  name: image.name,
                  mimeType: image.blob.type,
                  path: tempPath,
                })
              } else {
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
      }

      let appIcon: number[] | null = null
      if (selectedProject.appIcon) {
        const icon = await getAppIcon(selectedProject.appIcon)
        if (icon) {
          const arrayBuffer = await icon.blob.arrayBuffer()
          appIcon = Array.from(new Uint8Array(arrayBuffer))
        }
      }

      const request: ExportRequest = {
        outputPath,
        projectJson: JSON.stringify(selectedProject),
        mediaFiles,
        buttonFiles,
        appIcon,
        compression,
      }

      await invoke('export_as_executable', { request })
      setBuildDialogOpen(false)
      alert(`실행파일이 생성되었습니다: ${outputPath}`)
    } catch (error) {
      console.error('Build failed:', error)
      const errorMessage =
        typeof error === 'string'
          ? error
          : error instanceof Error
            ? error.message
            : String(error)
      alert('빌드에 실패했습니다: ' + errorMessage)
    } finally {
      setIsBuilding(false)
    }
  }

  // 영상 파일 개수 계산
  const videoCount = selectedProject
    ? selectedProject.pages.filter((p) => p.mediaType === 'video' && p.mediaId)
        .length
    : 0

  // 페이지 관리 함수들
  const handleAddPage = () => {
    if (!selectedProject) return

    const pageNumber = selectedProject.pages.length + 1
    const newPage: Page = {
      id: crypto.randomUUID(),
      title: `페이지 ${pageNumber}`,
      order: selectedProject.pages.length,
      mediaType: 'video',
      mediaId: '',
      playType: 'loop',
      buttons: [],
      touchAreas: [],
    }

    const updatedProject = {
      ...selectedProject,
      pages: [...selectedProject.pages, newPage],
      updatedAt: Date.now(),
    }

    setSelectedProject(updatedProject)
    setSelectedPageId(newPage.id)
    setHasUnsavedChanges(true)
  }

  const handleSelectPage = (pageId: string) => {
    setSelectedPageId(pageId)
  }

  const handleDeletePage = (pageId: string) => {
    if (!selectedProject) return

    const updatedPages = selectedProject.pages
      .filter((p) => p.id !== pageId)
      .map((p, index) => ({ ...p, order: index }))

    const updatedProject = {
      ...selectedProject,
      pages: updatedPages,
      updatedAt: Date.now(),
    }

    setSelectedProject(updatedProject)
    setHasUnsavedChanges(true)

    if (selectedPageId === pageId) {
      setSelectedPageId(updatedPages.length > 0 ? updatedPages[0].id : null)
    }
  }

  const handlePageUpdate = (updates: Partial<Page>) => {
    if (!selectedProject || !selectedPageId) return

    const updatedPages = selectedProject.pages.map((page) =>
      page.id === selectedPageId ? { ...page, ...updates } : page
    )

    const updatedProject = {
      ...selectedProject,
      pages: updatedPages,
      updatedAt: Date.now(),
    }

    setSelectedProject(updatedProject)
    setHasUnsavedChanges(true)
  }

  const handleReorderPages = (startIndex: number, endIndex: number) => {
    if (!selectedProject) return

    const pages = Array.from(selectedProject.pages)
    const [removed] = pages.splice(startIndex, 1)
    pages.splice(endIndex, 0, removed)

    const reorderedPages = pages.map((page, index) => ({
      ...page,
      order: index,
    }))

    const updatedProject = {
      ...selectedProject,
      pages: reorderedPages,
      updatedAt: Date.now(),
    }

    setSelectedProject(updatedProject)
    setHasUnsavedChanges(true)
  }

  const selectedPage =
    selectedProject?.pages.find((p) => p.id === selectedPageId) || null

  return (
    <div className='min-h-screen bg-gray-100'>
      {/* 삭제 확인 다이얼로그 */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title='프로젝트 삭제'
        message={`"${deleteConfirm.projectName}" 프로젝트를 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.`}
        confirmText='삭제'
        cancelText='취소'
        onConfirm={confirmDeleteProject}
        onCancel={cancelDeleteProject}
        variant='danger'
      />

      {/* 저장되지 않은 변경사항 확인 다이얼로그 */}
      <ConfirmDialog
        isOpen={unsavedChangesConfirm}
        title='저장되지 않은 변경사항'
        message={'저장되지 않은 변경사항이 있습니다.\n저장하시겠습니까?'}
        confirmText='저장'
        cancelText='저장 안 함'
        onConfirm={confirmSaveAndGoToPages}
        onCancel={skipSaveAndGoToPages}
        variant='warning'
      />

      {/* 미리보기 전 저장 확인 다이얼로그 */}
      <ConfirmDialog
        isOpen={previewConfirm}
        title='저장되지 않은 변경사항'
        message={
          '저장되지 않은 변경사항이 있습니다.\n저장 후 미리보기하시겠습니까?'
        }
        confirmText='저장 후 미리보기'
        cancelText='저장 안 하고 미리보기'
        onConfirm={confirmSaveAndPreview}
        onCancel={skipSaveAndPreview}
        variant='warning'
      />

      {/* 헤더 */}
      <header className='bg-white shadow-sm'>
        <div className='mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-3'>
              <img
                src='/icon.png'
                alt='Tutorial Maker'
                className='h-10 w-10 rounded-lg'
              />
              <h1 className='text-2xl font-bold text-gray-900'>
                Tutorial Maker
              </h1>
            </div>
            <button
              onClick={createNewProject}
              className='rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700'
            >
              새 프로젝트
            </button>
          </div>
        </div>
      </header>

      {/* 빌드 다이얼로그 */}
      <BuildDialog
        isOpen={buildDialogOpen}
        onClose={() => setBuildDialogOpen(false)}
        onBuild={handleBuild}
        isBuilding={isBuilding}
        videoCount={videoCount}
      />

      {/* 메인 콘텐츠 */}
      <main className='mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8'>
        {currentView === 'list' ? (
          <div>
            <h2 className='mb-4 text-xl font-semibold'>프로젝트 목록</h2>
            {projects.length === 0 ? (
              <div className='rounded-lg bg-white p-8 text-center shadow'>
                <p className='mb-4 text-gray-500'>
                  아직 프로젝트가 없습니다. 새 프로젝트를 만들어보세요!
                </p>
                <button
                  onClick={createNewProject}
                  className='rounded-lg bg-blue-600 px-6 py-3 text-white transition-colors hover:bg-blue-700'
                >
                  첫 프로젝트 만들기
                </button>
              </div>
            ) : (
              <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3'>
                {projects.map((project) => (
                  <div
                    key={project.id}
                    onClick={() => handleSelectProject(project)}
                    className='cursor-pointer rounded-lg bg-white p-4 shadow transition-shadow hover:shadow-lg'
                  >
                    <div className='flex gap-4'>
                      {/* 프로젝트 아이콘 */}
                      <div className='h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100'>
                        {projectIcons[project.id] ? (
                          <img
                            src={projectIcons[project.id]}
                            alt={project.name}
                            className='h-full w-full object-cover'
                          />
                        ) : (
                          <div className='flex h-full w-full items-center justify-center text-2xl text-gray-400'>
                            📁
                          </div>
                        )}
                      </div>
                      {/* 프로젝트 정보 */}
                      <div className='min-w-0 flex-1'>
                        <h3 className='truncate text-lg font-semibold'>
                          {project.name}
                        </h3>
                        <p className='truncate text-sm text-gray-600'>
                          {project.description || '설명 없음'}
                        </p>
                        <div className='mt-2 flex items-center gap-3 text-xs text-gray-500'>
                          <span>페이지 {project.pages.length}개</span>
                          <span>•</span>
                          <span>
                            {new Date(project.updatedAt).toLocaleDateString(
                              'ko-KR',
                              {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              }
                            )}
                          </span>
                        </div>
                      </div>
                      {/* 삭제 버튼 */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteProject(project.id, project.name)
                        }}
                        className='flex-shrink-0 rounded p-2 text-gray-400 hover:bg-red-200 hover:text-red-600'
                        title='프로젝트 삭제'
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : currentView === 'settings' && selectedProject ? (
          <div>
            <div className='mb-4 flex items-center justify-between'>
              <button
                onClick={handleBackToList}
                className='flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800'
              >
                ← 프로젝트 목록으로
              </button>
              <div className='flex gap-2'>
                {onPreview && (
                  <button
                    onClick={handlePreviewClick}
                    disabled={isBuilding || selectedProject.pages.length === 0}
                    className='flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-white hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-50'
                  >
                    미리보기
                  </button>
                )}
                <button
                  onClick={handleBuildClick}
                  disabled={isBuilding}
                  className='flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50'
                >
                  {isBuilding ? '빌드 중...' : '실행 파일 빌드'}
                </button>
              </div>
            </div>
            <ProjectSettings
              project={selectedProject}
              onUpdate={handleProjectUpdate}
              onSave={handleSaveProject}
              isSaveDisabled={!hasUnsavedChanges}
            />
            <div className='mt-6 text-center'>
              <button
                onClick={handleGoToPages}
                className='rounded-lg bg-blue-600 px-6 py-3 text-white transition-colors hover:bg-blue-700'
              >
                페이지 편집하기 →
              </button>
            </div>
          </div>
        ) : currentView === 'pages' && selectedProject ? (
          <div>
            <div className='mb-4 flex items-center justify-between'>
              <button
                onClick={() => setCurrentView('settings')}
                className='flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800'
              >
                ← 프로젝트 설정으로
              </button>
              <div className='flex gap-2'>
                {/* 뷰 모드 토글 */}
                <div className='flex rounded-lg border border-gray-300 bg-white'>
                  <button
                    onClick={() => setPagesViewMode('list')}
                    className={`flex items-center gap-1 px-3 py-2 text-sm transition-colors ${
                      pagesViewMode === 'list'
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                    } rounded-l-lg`}
                  >
                    목록
                  </button>
                  <button
                    onClick={() => setPagesViewMode('flowmap')}
                    className={`flex items-center gap-1 px-3 py-2 text-sm transition-colors ${
                      pagesViewMode === 'flowmap'
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                    } rounded-r-lg`}
                  >
                    흐름도
                  </button>
                </div>
                {onPreview && (
                  <button
                    onClick={handlePreviewClick}
                    disabled={isBuilding || selectedProject.pages.length === 0}
                    className='flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-white hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-50'
                  >
                    미리보기
                  </button>
                )}
                <button
                  onClick={handleBuildClick}
                  disabled={isBuilding}
                  className='flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50'
                >
                  {isBuilding ? '빌드 중...' : '실행 파일 빌드'}
                </button>
                <button
                  onClick={handleSaveProject}
                  disabled={isBuilding || !hasUnsavedChanges}
                  className='rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50'
                >
                  저장
                </button>
              </div>
            </div>

            {/* 흐름도 뷰 */}
            {pagesViewMode === 'flowmap' && (
              <div className='mb-6'>
                <FlowMap
                  pages={selectedProject.pages}
                  onSelectPage={(pageId) => {
                    handleSelectPage(pageId)
                    setPagesViewMode('list') // 클릭 시 목록 뷰로 전환하여 편집
                  }}
                  loopAtEnd={selectedProject.settings.loopAtEnd}
                />
              </div>
            )}

            {/* 목록 뷰 */}
            {pagesViewMode === 'list' && (
              <div className='grid grid-cols-1 gap-6 lg:grid-cols-3'>
                {/* 왼쪽: 페이지 목록 */}
                <div className='lg:col-span-1'>
                  <PageList
                    pages={selectedProject.pages}
                    selectedPageId={selectedPageId}
                    onSelectPage={handleSelectPage}
                    onAddPage={handleAddPage}
                    onDeletePage={handleDeletePage}
                    onReorderPages={handleReorderPages}
                  />
                </div>

                {/* 오른쪽: 페이지 편집기 */}
                <div className='lg:col-span-2'>
                  <PageEditor
                    page={selectedPage}
                    onUpdate={handlePageUpdate}
                    pages={selectedProject.pages}
                  />
                </div>
              </div>
            )}
          </div>
        ) : null}
      </main>
    </div>
  )
}

export default BuilderPage
