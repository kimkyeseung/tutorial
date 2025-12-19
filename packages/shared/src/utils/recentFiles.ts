// 최근 열어본 파일 관리 (localStorage 사용)

const MAX_RECENT_FILES = 10

export interface RecentFile {
  path: string
  name: string
  openedAt: number
}

// Factory 함수로 STORAGE_KEY를 파라미터화
export const createRecentFilesManager = (storageKey: string) => {
  // 최근 파일 목록 가져오기
  const getRecentFiles = (): RecentFile[] => {
    try {
      const stored = localStorage.getItem(storageKey)
      if (!stored) return []

      const files: RecentFile[] = JSON.parse(stored)
      return files.sort((a, b) => b.openedAt - a.openedAt)
    } catch (e) {
      console.error('Failed to get recent files:', e)
      return []
    }
  }

  // 최근 파일에 추가
  const addRecentFile = (filePath: string): void => {
    try {
      const files = getRecentFiles()

      // 파일명 추출
      const name = filePath.split(/[/\\]/).pop() || filePath

      // 기존에 있으면 제거 (중복 방지)
      const filtered = files.filter((f) => f.path !== filePath)

      // 맨 앞에 추가
      const updated: RecentFile[] = [
        { path: filePath, name, openedAt: Date.now() },
        ...filtered,
      ].slice(0, MAX_RECENT_FILES)

      localStorage.setItem(storageKey, JSON.stringify(updated))
    } catch (e) {
      console.error('Failed to add recent file:', e)
    }
  }

  // 최근 파일에서 제거
  const removeRecentFile = (filePath: string): void => {
    try {
      const files = getRecentFiles()
      const filtered = files.filter((f) => f.path !== filePath)
      localStorage.setItem(storageKey, JSON.stringify(filtered))
    } catch (e) {
      console.error('Failed to remove recent file:', e)
    }
  }

  // 모든 최근 파일 삭제
  const clearRecentFiles = (): void => {
    try {
      localStorage.removeItem(storageKey)
    } catch (e) {
      console.error('Failed to clear recent files:', e)
    }
  }

  return {
    getRecentFiles,
    addRecentFile,
    removeRecentFile,
    clearRecentFiles,
  }
}

// 기본 인스턴스들 (하위 호환성)
export const makerRecentFiles = createRecentFilesManager(
  'tutorial-maker-recent-files'
)
export const viewerRecentFiles = createRecentFilesManager(
  'tutorial-viewer-recent-files'
)
