import React from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Page } from '@viswave/shared'
import { validatePage } from '../../utils/pageValidation'

type ThumbnailData = {
  url: string
  mediaType: 'video' | 'image'
  fileName: string
  mediaId: string
}

type SortablePageItemProps = {
  page: Page
  index: number
  selectedPageId: string | null
  thumbnail: ThumbnailData | undefined
  onSelectPage: (pageId: string) => void
  onDeleteClick: (pageId: string, pageIndex: number) => void
}

const SortablePageItem: React.FC<SortablePageItemProps> = ({
  page,
  index,
  selectedPageId,
  thumbnail,
  onSelectPage,
  onDeleteClick,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: page.id })
  console.log(page)

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const validation = validatePage(page)

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={() => onSelectPage(page.id)}
      className={`cursor-pointer rounded border p-3 transition-colors ${isDragging
          ? 'opacity-50 shadow-lg'
          : selectedPageId === page.id
            ? validation.isValid
              ? 'border-blue-500 bg-blue-50'
              : 'border-red-500 bg-red-50'
            : validation.isValid
              ? 'border-gray-300 hover:bg-gray-50'
              : 'border-red-300 bg-red-50 hover:bg-red-100'
        }`}
    >
      <div className='flex items-center gap-3'>
        {/* 드래그 핸들 */}
        <div
          {...attributes}
          {...listeners}
          className='flex-shrink-0 cursor-grab touch-none text-gray-400 hover:text-gray-600 active:cursor-grabbing'
        >
          <svg className='h-5 w-5' fill='currentColor' viewBox='0 0 20 20'>
            <path d='M7 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4z' />
          </svg>
        </div>

        {/* 썸네일 */}
        <div className='relative h-[45px] w-[80px] flex-shrink-0 overflow-hidden rounded bg-gray-800'>
          {thumbnail ? (
            <img
              src={thumbnail.url}
              alt={`Page ${index + 1}`}
              className='h-full w-full object-cover'
            />
          ) : page.mediaId ? (
            <div className='flex h-full w-full items-center justify-center text-xs text-gray-500'>
              로딩...
            </div>
          ) : (
            <div className='flex h-full w-full items-center justify-center text-xs text-gray-500'>
              없음
            </div>
          )}
          {/* 페이지 번호 뱃지 */}
          <div className='absolute left-0.5 top-0.5 rounded bg-black bg-opacity-70 px-1 text-[10px] font-bold text-white'>
            {index + 1}
          </div>
        </div>

        {/* 정보 */}
        <div className='min-w-0 flex-1'>
          <div className='flex items-center gap-2 text-sm font-medium'>
            {/* 재생 타입 뱃지 */}
            <div
              className={`inline-block rounded px-1 text-[9px] font-bold ${page.playType === 'loop'
                  ? 'bg-orange-500 text-white'
                  : 'bg-blue-500 text-white'
                }`}
            >
              {page.playType === 'loop' ? '반복' : `${page.playCount || 1}회`}
            </div>
            <span
              className='truncate'
              title={page.title || `페이지 ${index + 1}`}
            >
              {page.title || `페이지 ${index + 1}`}
            </span>
            {validation.isValid ? (
              <span className='text-green-600' title='유효함'>
                ✓
              </span>
            ) : (
              <span
                className='text-red-600'
                title={validation.errors.join('\n')}
              >
                ⚠
              </span>
            )}
          </div>
          <div className='mt-1 text-xs text-gray-500'>
            {page.mediaType === 'video' ? '🎥' : '🖼️'}{' '}
            {thumbnail?.fileName && (
              <span className='truncate' title={thumbnail.fileName}>
                {thumbnail.fileName.length > 20
                  ? thumbnail.fileName.substring(0, 20) + '...'
                  : thumbnail.fileName}
              </span>
            )}
          </div>
          <div className='mt-0.5 text-xs text-gray-500'>
            버튼 {page.buttons.length} • 터치 영역 {page.touchAreas.length}
          </div>
          {!validation.isValid && (
            <div className='mt-0.5 truncate text-xs text-red-600'>
              {validation.errors[0]}
            </div>
          )}
        </div>

        {/* 삭제 버튼 */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDeleteClick(page.id, index)
          }}
          className='flex-shrink-0 rounded px-2 py-1 text-sm text-red-600 hover:bg-red-50'
        >
          삭제
        </button>
      </div>
    </div>
  )
}

export default SortablePageItem
