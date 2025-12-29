import { describe, it, expect, beforeEach } from 'vitest'
import { createRecentFilesManager } from './recentFiles'

describe('createRecentFilesManager', () => {
  const STORAGE_KEY = 'test-recent-files'
  let manager: ReturnType<typeof createRecentFilesManager>

  beforeEach(() => {
    localStorage.clear()
    manager = createRecentFilesManager(STORAGE_KEY)
  })

  describe('getRecentFiles', () => {
    it('should return empty array when no files stored', () => {
      const files = manager.getRecentFiles()
      expect(files).toEqual([])
    })

    it('should return files sorted by openedAt descending', () => {
      const files = [
        { path: '/file1.tutorial', name: 'file1.tutorial', openedAt: 1000 },
        { path: '/file2.tutorial', name: 'file2.tutorial', openedAt: 3000 },
        { path: '/file3.tutorial', name: 'file3.tutorial', openedAt: 2000 },
      ]
      localStorage.setItem(STORAGE_KEY, JSON.stringify(files))

      const result = manager.getRecentFiles()

      expect(result[0].path).toBe('/file2.tutorial')
      expect(result[1].path).toBe('/file3.tutorial')
      expect(result[2].path).toBe('/file1.tutorial')
    })
  })

  describe('addRecentFile', () => {
    it('should add a new file to the list', () => {
      manager.addRecentFile('/path/to/file.tutorial')

      const files = manager.getRecentFiles()
      expect(files).toHaveLength(1)
      expect(files[0].path).toBe('/path/to/file.tutorial')
      expect(files[0].name).toBe('file.tutorial')
    })

    it('should extract filename from path correctly', () => {
      manager.addRecentFile('/users/documents/my-project.tutorial')
      manager.addRecentFile('C:\\Users\\Documents\\windows-file.tutorial')

      const files = manager.getRecentFiles()
      expect(files[0].name).toBe('windows-file.tutorial')
      expect(files[1].name).toBe('my-project.tutorial')
    })

    it('should move existing file to top when added again', () => {
      manager.addRecentFile('/file1.tutorial')
      manager.addRecentFile('/file2.tutorial')
      manager.addRecentFile('/file1.tutorial')

      const files = manager.getRecentFiles()
      expect(files).toHaveLength(2)
      expect(files[0].path).toBe('/file1.tutorial')
      expect(files[1].path).toBe('/file2.tutorial')
    })

    it('should limit to 10 files maximum', () => {
      for (let i = 0; i < 15; i++) {
        manager.addRecentFile(`/file${i}.tutorial`)
      }

      const files = manager.getRecentFiles()
      expect(files).toHaveLength(10)
      // Most recent should be file14
      expect(files[0].path).toBe('/file14.tutorial')
    })
  })

  describe('removeRecentFile', () => {
    it('should remove a file from the list', () => {
      manager.addRecentFile('/file1.tutorial')
      manager.addRecentFile('/file2.tutorial')
      manager.addRecentFile('/file3.tutorial')

      manager.removeRecentFile('/file2.tutorial')

      const files = manager.getRecentFiles()
      expect(files).toHaveLength(2)
      expect(files.find((f) => f.path === '/file2.tutorial')).toBeUndefined()
    })

    it('should do nothing when file not in list', () => {
      manager.addRecentFile('/file1.tutorial')

      manager.removeRecentFile('/nonexistent.tutorial')

      const files = manager.getRecentFiles()
      expect(files).toHaveLength(1)
    })
  })

  describe('clearRecentFiles', () => {
    it('should remove all files from the list', () => {
      manager.addRecentFile('/file1.tutorial')
      manager.addRecentFile('/file2.tutorial')
      manager.addRecentFile('/file3.tutorial')

      manager.clearRecentFiles()

      const files = manager.getRecentFiles()
      expect(files).toHaveLength(0)
    })
  })

  describe('multiple instances with different keys', () => {
    it('should maintain separate storage for different keys', () => {
      const manager1 = createRecentFilesManager('manager1-key')
      const manager2 = createRecentFilesManager('manager2-key')

      manager1.addRecentFile('/file1.tutorial')
      manager2.addRecentFile('/file2.tutorial')

      expect(manager1.getRecentFiles()).toHaveLength(1)
      expect(manager1.getRecentFiles()[0].path).toBe('/file1.tutorial')

      expect(manager2.getRecentFiles()).toHaveLength(1)
      expect(manager2.getRecentFiles()[0].path).toBe('/file2.tutorial')
    })
  })
})
