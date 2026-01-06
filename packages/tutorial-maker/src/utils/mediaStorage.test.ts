import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { generateVideoThumbnail } from './mediaStorage'

// Mock video element for testing
const createMockVideoElement = (
  options: {
    videoWidth?: number
    videoHeight?: number
    shouldError?: boolean
    shouldTimeout?: boolean
    skipCanPlayThrough?: boolean
    skipSeeked?: boolean
  } = {}
) => {
  const {
    videoWidth = 1920,
    videoHeight = 1080,
    shouldError = false,
    shouldTimeout = false,
    skipCanPlayThrough = false,
    skipSeeked = false,
  } = options

  let oncanplaythrough: (() => void) | null = null
  let onseeked: (() => void) | null = null
  let onloadeddata: (() => void) | null = null
  let onerror: (() => void) | null = null
  let currentTime = 0

  const mockVideo = {
    preload: '',
    muted: false,
    playsInline: false,
    crossOrigin: '',
    src: '',
    videoWidth,
    videoHeight,
    readyState: 4, // HAVE_ENOUGH_DATA
    get currentTime() {
      return currentTime
    },
    set currentTime(value: number) {
      currentTime = value
      // Trigger onseeked when currentTime is set
      if (!skipSeeked) {
        setTimeout(() => onseeked?.(), 10)
      }
    },
    set oncanplaythrough(fn: (() => void) | null) {
      oncanplaythrough = fn
    },
    set onseeked(fn: (() => void) | null) {
      onseeked = fn
    },
    set onloadeddata(fn: (() => void) | null) {
      onloadeddata = fn
    },
    set onerror(fn: (() => void) | null) {
      onerror = fn
    },
    load: vi.fn(() => {
      if (shouldError) {
        setTimeout(() => onerror?.(), 10)
        return
      }
      if (shouldTimeout) {
        // Don't trigger any events - let timeout handle it
        return
      }
      // Trigger canplaythrough which starts the thumbnail generation
      if (!skipCanPlayThrough) {
        setTimeout(() => oncanplaythrough?.(), 10)
      }
      // Also trigger loadeddata for fallback path
      setTimeout(() => onloadeddata?.(), 20)
    }),
    remove: vi.fn(),
  }

  return mockVideo
}

// Mock canvas element
const createMockCanvas = (shouldFail = false) => {
  const mockContext = {
    drawImage: vi.fn(),
  }

  const mockCanvas = {
    width: 0,
    height: 0,
    getContext: vi.fn(() => (shouldFail ? null : mockContext)),
    toBlob: vi.fn((callback: (blob: Blob | null) => void) => {
      if (shouldFail) {
        callback(null)
      } else {
        callback(new Blob(['fake-image-data'], { type: 'image/jpeg' }))
      }
    }),
  }

  return { mockCanvas, mockContext }
}

describe('generateVideoThumbnail', () => {
  let originalCreateElement: typeof document.createElement
  let originalCreateObjectURL: typeof URL.createObjectURL
  let originalRevokeObjectURL: typeof URL.revokeObjectURL

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })

    originalCreateElement = document.createElement
    originalCreateObjectURL = URL.createObjectURL
    originalRevokeObjectURL = URL.revokeObjectURL

    URL.createObjectURL = vi.fn(() => 'blob:mock-url')
    URL.revokeObjectURL = vi.fn()
  })

  afterEach(() => {
    vi.useRealTimers()
    document.createElement = originalCreateElement
    URL.createObjectURL = originalCreateObjectURL
    URL.revokeObjectURL = originalRevokeObjectURL
  })

  describe('successful thumbnail generation', () => {
    it('should generate thumbnail from video blob', async () => {
      const mockVideo = createMockVideoElement()
      const { mockCanvas, mockContext } = createMockCanvas()

      document.createElement = vi.fn((tagName: string) => {
        if (tagName === 'video') return mockVideo as unknown as HTMLVideoElement
        if (tagName === 'canvas')
          return mockCanvas as unknown as HTMLCanvasElement
        return originalCreateElement.call(document, tagName)
      })

      const videoBlob = new Blob(['fake-video-data'], { type: 'video/mp4' })
      const thumbnailPromise = generateVideoThumbnail(videoBlob)

      // Advance timers to allow events to fire
      await vi.advanceTimersByTimeAsync(100)

      const thumbnail = await thumbnailPromise

      expect(thumbnail).toBeInstanceOf(Blob)
      expect(thumbnail?.type).toBe('image/jpeg')
      expect(mockContext.drawImage).toHaveBeenCalled()
      expect(mockVideo.remove).toHaveBeenCalled()
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
    })

    it('should use fallback loadeddata event when onseeked does not fire', async () => {
      const mockVideo = createMockVideoElement({
        skipCanPlayThrough: true,
        skipSeeked: true,
      })
      const { mockCanvas, mockContext } = createMockCanvas()

      document.createElement = vi.fn((tagName: string) => {
        if (tagName === 'video') return mockVideo as unknown as HTMLVideoElement
        if (tagName === 'canvas')
          return mockCanvas as unknown as HTMLCanvasElement
        return originalCreateElement.call(document, tagName)
      })

      const videoBlob = new Blob(['fake-video-data'], { type: 'video/mp4' })
      const thumbnailPromise = generateVideoThumbnail(videoBlob)

      // Advance timers past the 500ms fallback delay
      await vi.advanceTimersByTimeAsync(600)

      const thumbnail = await thumbnailPromise

      expect(thumbnail).toBeInstanceOf(Blob)
      expect(mockContext.drawImage).toHaveBeenCalled()
    })

    it('should respect maxSize parameter for landscape video', async () => {
      const mockVideo = createMockVideoElement({
        videoWidth: 1920,
        videoHeight: 1080,
      })
      const { mockCanvas } = createMockCanvas()

      document.createElement = vi.fn((tagName: string) => {
        if (tagName === 'video') return mockVideo as unknown as HTMLVideoElement
        if (tagName === 'canvas')
          return mockCanvas as unknown as HTMLCanvasElement
        return originalCreateElement.call(document, tagName)
      })

      const videoBlob = new Blob(['fake-video-data'], { type: 'video/mp4' })
      const maxSize = 200
      const thumbnailPromise = generateVideoThumbnail(videoBlob, maxSize)

      await vi.advanceTimersByTimeAsync(100)
      await thumbnailPromise

      // For 16:9 landscape video, width should be maxSize, height should be smaller
      expect(mockCanvas.width).toBe(maxSize)
      expect(mockCanvas.height).toBeLessThan(maxSize)
    })

    it('should respect maxSize parameter for portrait video', async () => {
      const mockVideo = createMockVideoElement({
        videoWidth: 1080,
        videoHeight: 1920,
      })
      const { mockCanvas } = createMockCanvas()

      document.createElement = vi.fn((tagName: string) => {
        if (tagName === 'video') return mockVideo as unknown as HTMLVideoElement
        if (tagName === 'canvas')
          return mockCanvas as unknown as HTMLCanvasElement
        return originalCreateElement.call(document, tagName)
      })

      const videoBlob = new Blob(['fake-video-data'], { type: 'video/mp4' })
      const maxSize = 200
      const thumbnailPromise = generateVideoThumbnail(videoBlob, maxSize)

      await vi.advanceTimersByTimeAsync(100)
      await thumbnailPromise

      // For portrait video, height should be maxSize, width should be smaller
      expect(mockCanvas.height).toBe(maxSize)
      expect(mockCanvas.width).toBeLessThan(maxSize)
    })
  })

  describe('error handling', () => {
    it('should return null when video fails to load', async () => {
      const mockVideo = createMockVideoElement({ shouldError: true })

      document.createElement = vi.fn((tagName: string) => {
        if (tagName === 'video') return mockVideo as unknown as HTMLVideoElement
        return originalCreateElement.call(document, tagName)
      })

      const videoBlob = new Blob(['fake-video-data'], { type: 'video/mp4' })
      const thumbnailPromise = generateVideoThumbnail(videoBlob)

      await vi.advanceTimersByTimeAsync(100)

      const thumbnail = await thumbnailPromise

      expect(thumbnail).toBeNull()
      expect(mockVideo.remove).toHaveBeenCalled()
    })

    it('should return null when canvas context is not available', async () => {
      const mockVideo = createMockVideoElement()
      const { mockCanvas } = createMockCanvas(true) // shouldFail = true

      document.createElement = vi.fn((tagName: string) => {
        if (tagName === 'video') return mockVideo as unknown as HTMLVideoElement
        if (tagName === 'canvas')
          return mockCanvas as unknown as HTMLCanvasElement
        return originalCreateElement.call(document, tagName)
      })

      const videoBlob = new Blob(['fake-video-data'], { type: 'video/mp4' })
      const thumbnailPromise = generateVideoThumbnail(videoBlob)

      await vi.advanceTimersByTimeAsync(100)

      const thumbnail = await thumbnailPromise

      expect(thumbnail).toBeNull()
    })

    it('should return null when video dimensions are zero', async () => {
      const mockVideo = createMockVideoElement({
        videoWidth: 0,
        videoHeight: 0,
      })
      const { mockCanvas } = createMockCanvas()

      document.createElement = vi.fn((tagName: string) => {
        if (tagName === 'video') return mockVideo as unknown as HTMLVideoElement
        if (tagName === 'canvas')
          return mockCanvas as unknown as HTMLCanvasElement
        return originalCreateElement.call(document, tagName)
      })

      const videoBlob = new Blob(['fake-video-data'], { type: 'video/mp4' })
      const thumbnailPromise = generateVideoThumbnail(videoBlob)

      await vi.advanceTimersByTimeAsync(100)

      const thumbnail = await thumbnailPromise

      expect(thumbnail).toBeNull()
    })

    it('should timeout after 5 seconds and return null', async () => {
      const mockVideo = createMockVideoElement({ shouldTimeout: true })

      document.createElement = vi.fn((tagName: string) => {
        if (tagName === 'video') return mockVideo as unknown as HTMLVideoElement
        return originalCreateElement.call(document, tagName)
      })

      const videoBlob = new Blob(['fake-video-data'], { type: 'video/mp4' })
      const thumbnailPromise = generateVideoThumbnail(videoBlob)

      // Advance past the 5 second timeout
      await vi.advanceTimersByTimeAsync(5100)

      const thumbnail = await thumbnailPromise

      expect(thumbnail).toBeNull()
      expect(mockVideo.remove).toHaveBeenCalled()
    })
  })

  describe('cleanup', () => {
    it('should revoke blob URL after successful generation', async () => {
      const mockVideo = createMockVideoElement()
      const { mockCanvas } = createMockCanvas()

      document.createElement = vi.fn((tagName: string) => {
        if (tagName === 'video') return mockVideo as unknown as HTMLVideoElement
        if (tagName === 'canvas')
          return mockCanvas as unknown as HTMLCanvasElement
        return originalCreateElement.call(document, tagName)
      })

      const videoBlob = new Blob(['fake-video-data'], { type: 'video/mp4' })
      const thumbnailPromise = generateVideoThumbnail(videoBlob)

      await vi.advanceTimersByTimeAsync(100)
      await thumbnailPromise

      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
    })

    it('should remove video element after generation', async () => {
      const mockVideo = createMockVideoElement()
      const { mockCanvas } = createMockCanvas()

      document.createElement = vi.fn((tagName: string) => {
        if (tagName === 'video') return mockVideo as unknown as HTMLVideoElement
        if (tagName === 'canvas')
          return mockCanvas as unknown as HTMLCanvasElement
        return originalCreateElement.call(document, tagName)
      })

      const videoBlob = new Blob(['fake-video-data'], { type: 'video/mp4' })
      const thumbnailPromise = generateVideoThumbnail(videoBlob)

      await vi.advanceTimersByTimeAsync(100)
      await thumbnailPromise

      expect(mockVideo.remove).toHaveBeenCalled()
    })
  })

  describe('video element configuration', () => {
    it('should set correct video element properties', async () => {
      const mockVideo = createMockVideoElement()
      const { mockCanvas } = createMockCanvas()

      document.createElement = vi.fn((tagName: string) => {
        if (tagName === 'video') return mockVideo as unknown as HTMLVideoElement
        if (tagName === 'canvas')
          return mockCanvas as unknown as HTMLCanvasElement
        return originalCreateElement.call(document, tagName)
      })

      const videoBlob = new Blob(['fake-video-data'], { type: 'video/mp4' })
      const thumbnailPromise = generateVideoThumbnail(videoBlob)

      await vi.advanceTimersByTimeAsync(100)
      await thumbnailPromise

      expect(mockVideo.preload).toBe('auto')
      expect(mockVideo.muted).toBe(true)
      expect(mockVideo.playsInline).toBe(true)
      expect(mockVideo.crossOrigin).toBe('anonymous')
      expect(mockVideo.src).toBe('blob:mock-url')
      expect(mockVideo.load).toHaveBeenCalled()
    })

    it('should seek to 0.1 seconds for first frame capture', async () => {
      const mockVideo = createMockVideoElement()
      const { mockCanvas } = createMockCanvas()

      document.createElement = vi.fn((tagName: string) => {
        if (tagName === 'video') return mockVideo as unknown as HTMLVideoElement
        if (tagName === 'canvas')
          return mockCanvas as unknown as HTMLCanvasElement
        return originalCreateElement.call(document, tagName)
      })

      const videoBlob = new Blob(['fake-video-data'], { type: 'video/mp4' })
      const thumbnailPromise = generateVideoThumbnail(videoBlob)

      await vi.advanceTimersByTimeAsync(100)
      await thumbnailPromise

      // After canplaythrough, currentTime should be set to 0.1
      expect(mockVideo.currentTime).toBe(0.1)
    })
  })
})
