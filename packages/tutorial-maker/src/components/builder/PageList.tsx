import React, { useState, useEffect, useRef } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { ConfirmDialog, type Page } from '@viswave/shared'
import {
  getMediaFile,
  createBlobURL,
  revokeBlobURL,
  generateVideoThumbnail,
} from '../../utils/mediaStorage'
import SortablePageItem from './SortablePageItem'

type PageListProps = {
  pages: Page[]
  selectedPageId: string | null
  onSelectPage: (pageId: string) => void
  onAddPage: () => void
  onDeletePage: (pageId: string) => void
  onReorderPages: (startIndex: number, endIndex: number) => void
}

type ThumbnailData = {
  url: string
  mediaType: 'video' | 'image'
  fileName: string
  mediaId: string
}

const PageList: React.FC<PageListProps> = ({
  pages,
  selectedPageId,
  onSelectPage,
  onAddPage,
  onDeletePage,
  onReorderPages,
}) => {
  const [thumbnails, setThumbnails] = useState<Record<string, ThumbnailData>>(
    {}
  )
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean
    pageId: string
    pageIndex: number
  }>({ isOpen: false, pageId: '', pageIndex: 0 })

  // 썸네일 URL 참조 (cleanup용)
  const thumbnailsRef = useRef<Record<string, ThumbnailData>>({})

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // 썸네일 로드 (병렬 처리 + cleanup)
  useEffect(() => {
    let isCancelled = false

    const loadThumbnails = async () => {
      // 현재 페이지 ID 목록
      const currentPageIds = new Set(pages.map((p) => p.id))

      // 삭제된 페이지의 썸네일 URL 정리
      Object.entries(thumbnailsRef.current).forEach(([pageId, thumb]) => {
        if (!currentPageIds.has(pageId) && thumb.url) {
          revokeBlobURL(thumb.url)
        }
      })

      // 병렬로 새 썸네일 로드
      const loadPromises = pages.map(async (page) => {
        const existingThumbnail = thumbnailsRef.current[page.id]
        const needsReload =
          page.mediaId &&
          (!existingThumbnail || existingThumbnail.mediaId !== page.mediaId)

        if (!needsReload) {
          return existingThumbnail
            ? { pageId: page.id, data: existingThumbnail }
            : null
        }

        // 기존 URL 정리
        if (existingThumbnail?.url) {
          revokeBlobURL(existingThumbnail.url)
        }

        const media = await getMediaFile(page.mediaId)
        if (!media || isCancelled) return null

        let url: string
        if (page.mediaType === 'image') {
          url = await createBlobURL(media.blob)
        } else {
          if (media.thumbnailBlob) {
            url = await createBlobURL(media.thumbnailBlob)
          } else {
            const thumbnail = await generateVideoThumbnail(media.blob)
            url = thumbnail ? await createBlobURL(thumbnail) : ''
          }
        }

        return {
          pageId: page.id,
          data: {
            url,
            mediaType: page.mediaType,
            fileName: media.name,
            mediaId: page.mediaId,
          } as ThumbnailData,
        }
      })

      const results = await Promise.all(loadPromises)
      if (isCancelled) return

      const newThumbnails: Record<string, ThumbnailData> = {}
      results.forEach((result) => {
        if (result) {
          newThumbnails[result.pageId] = result.data
        }
      })

      thumbnailsRef.current = newThumbnails
      setThumbnails(newThumbnails)
    }

    loadThumbnails()

    return () => {
      isCancelled = true
    }
  }, [pages])

  // 컴포넌트 언마운트 시 모든 썸네일 URL 정리
  useEffect(() => {
    return () => {
      Object.values(thumbnailsRef.current).forEach((thumb) => {
        if (thumb.url) {
          revokeBlobURL(thumb.url)
        }
      })
    }
  }, [])

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = pages.findIndex((p) => p.id === active.id)
      const newIndex = pages.findIndex((p) => p.id === over.id)
      onReorderPages(oldIndex, newIndex)
    }
  }

  const handleDeleteClick = (pageId: string, pageIndex: number) => {
    setDeleteConfirm({ isOpen: true, pageId, pageIndex })
  }

  return (
    <div className='rounded-lg bg-white p-4 shadow'>
      {/* 페이지 삭제 확인 다이얼로그 */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title='페이지 삭제'
        message={
          '페이지 ' + (deleteConfirm.pageIndex + 1) + '을(를) 삭제하시겠습니까?'
        }
        confirmText='삭제'
        cancelText='취소'
        onConfirm={() => {
          onDeletePage(deleteConfirm.pageId)
          setDeleteConfirm({ isOpen: false, pageId: '', pageIndex: 0 })
        }}
        onCancel={() =>
          setDeleteConfirm({ isOpen: false, pageId: '', pageIndex: 0 })
        }
        variant='danger'
      />

      <div className='mb-4 flex items-center justify-between'>
        <h3 className='text-lg font-semibold'>페이지 목록</h3>
        <button
          onClick={onAddPage}
          className='rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700'
        >
          + 페이지 추가
        </button>
      </div>

      {pages.length === 0 ? (
        <div className='py-8 text-center text-gray-500'>
          <p className='mb-2'>페이지가 없습니다</p>
          <p className='text-sm'>위의 버튼을 눌러 첫 페이지를 추가하세요</p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={pages.map((p) => p.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className='space-y-2'>
              {pages.map((page, index) => (
                <SortablePageItem
                  key={page.id}
                  page={page}
                  index={index}
                  selectedPageId={selectedPageId}
                  thumbnail={thumbnails[page.id]}
                  onSelectPage={onSelectPage}
                  onDeleteClick={handleDeleteClick}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  )
}

export default PageList
