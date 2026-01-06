import type { Page } from '@viswave/shared'

export interface PageValidationResult {
  isValid: boolean
  errors: string[]
}

export function validatePage(page: Page): PageValidationResult {
  const errors: string[] = []

  // 1. 미디어 필수 체크
  if (!page.mediaId) {
    errors.push('미디어 파일이 없습니다')
  }

  // 2. 반복 재생일 경우 버튼 또는 터치 영역 필수
  if (page.playType === 'loop') {
    const hasButtons = page.buttons.length > 0
    const hasTouchAreas = page.touchAreas.length > 0

    if (!hasButtons && !hasTouchAreas) {
      errors.push('반복 재생 시 버튼 또는 터치 영역이 필요합니다')
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

export function validateAllPages(pages: Page[]): {
  isValid: boolean
  invalidPages: { pageIndex: number; errors: string[] }[]
} {
  const invalidPages: { pageIndex: number; errors: string[] }[] = []

  pages.forEach((page, index) => {
    const result = validatePage(page)
    const errors = [...result.errors]

    // goto 대상 페이지 검증
    for (const button of page.buttons) {
      if (button.action.type === 'goto') {
        if (!button.action.targetPageId) {
          errors.push('버튼의 이동 대상 페이지가 설정되지 않았습니다')
        } else {
          const targetIndex = parseInt(button.action.targetPageId)
          if (
            isNaN(targetIndex) ||
            targetIndex < 0 ||
            targetIndex >= pages.length
          ) {
            errors.push(
              `버튼의 이동 대상 페이지가 유효하지 않습니다 (${targetIndex + 1})`
            )
          }
        }
      }
    }

    for (const touchArea of page.touchAreas) {
      if (touchArea.action.type === 'goto') {
        if (!touchArea.action.targetPageId) {
          errors.push('터치 영역의 이동 대상 페이지가 설정되지 않았습니다')
        } else {
          const targetIndex = parseInt(touchArea.action.targetPageId)
          if (
            isNaN(targetIndex) ||
            targetIndex < 0 ||
            targetIndex >= pages.length
          ) {
            errors.push(
              `터치 영역의 이동 대상 페이지가 유효하지 않습니다 (${targetIndex + 1})`
            )
          }
        }
      }
    }

    if (errors.length > 0) {
      invalidPages.push({
        pageIndex: index,
        errors,
      })
    }
  })

  return {
    isValid: invalidPages.length === 0,
    invalidPages,
  }
}
