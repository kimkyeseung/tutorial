import type { Project, StoredMedia } from '@viswave/shared'

const DB_NAME = 'tutorial-maker-db'
const DB_VERSION = 1

// Object Stores
const PROJECTS_STORE = 'projects'
const MEDIA_FILES_STORE = 'mediaFiles'
const BUTTON_IMAGES_STORE = 'buttonImages'
const APP_ICONS_STORE = 'appIcons'

// IndexedDB 초기화
export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result

      // 프로젝트 저장소
      if (!db.objectStoreNames.contains(PROJECTS_STORE)) {
        db.createObjectStore(PROJECTS_STORE, { keyPath: 'id' })
      }

      // 미디어 파일 저장소 (영상/이미지)
      if (!db.objectStoreNames.contains(MEDIA_FILES_STORE)) {
        db.createObjectStore(MEDIA_FILES_STORE, { keyPath: 'id' })
      }

      // 버튼 이미지 저장소
      if (!db.objectStoreNames.contains(BUTTON_IMAGES_STORE)) {
        db.createObjectStore(BUTTON_IMAGES_STORE, { keyPath: 'id' })
      }

      // 앱 아이콘 저장소
      if (!db.objectStoreNames.contains(APP_ICONS_STORE)) {
        db.createObjectStore(APP_ICONS_STORE, { keyPath: 'id' })
      }
    }
  })
}

// 프로젝트 저장
export const saveProject = async (project: Project): Promise<void> => {
  const db = await initDB()
  const transaction = db.transaction([PROJECTS_STORE], 'readwrite')
  const store = transaction.objectStore(PROJECTS_STORE)

  await new Promise<void>((resolve, reject) => {
    const request = store.put(project)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })

  db.close()
}

// 프로젝트 불러오기
export const getProject = async (
  projectId: string
): Promise<Project | null> => {
  const db = await initDB()
  const transaction = db.transaction([PROJECTS_STORE], 'readonly')
  const store = transaction.objectStore(PROJECTS_STORE)

  const result = await new Promise<Project | null>((resolve, reject) => {
    const request = store.get(projectId)
    request.onsuccess = () => resolve(request.result || null)
    request.onerror = () => reject(request.error)
  })

  db.close()
  return result
}

// 모든 프로젝트 목록 가져오기
export const getAllProjects = async (): Promise<Project[]> => {
  const db = await initDB()
  const transaction = db.transaction([PROJECTS_STORE], 'readonly')
  const store = transaction.objectStore(PROJECTS_STORE)

  const result = await new Promise<Project[]>((resolve, reject) => {
    const request = store.getAll()
    request.onsuccess = () => resolve(request.result || [])
    request.onerror = () => reject(request.error)
  })

  db.close()
  return result
}

// 프로젝트 삭제
export const deleteProject = async (projectId: string): Promise<void> => {
  const db = await initDB()
  const transaction = db.transaction([PROJECTS_STORE], 'readwrite')
  const store = transaction.objectStore(PROJECTS_STORE)

  await new Promise<void>((resolve, reject) => {
    const request = store.delete(projectId)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })

  db.close()
}

// 미디어 파일 저장
export const saveMediaFile = async (
  file: File,
  type: 'video' | 'image'
): Promise<string> => {
  const id = crypto.randomUUID()

  // 동영상인 경우 썸네일 생성
  let thumbnailBlob: Blob | undefined
  if (type === 'video') {
    const thumbnail = await generateVideoThumbnail(file)
    if (thumbnail) {
      thumbnailBlob = thumbnail
    }
  }

  const media: StoredMedia = {
    id,
    name: file.name,
    blob: file,
    type,
    createdAt: Date.now(),
    thumbnailBlob,
  }

  const db = await initDB()
  const transaction = db.transaction([MEDIA_FILES_STORE], 'readwrite')
  const store = transaction.objectStore(MEDIA_FILES_STORE)

  await new Promise<void>((resolve, reject) => {
    const request = store.put(media)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })

  db.close()
  return id
}

// 미디어 파일 가져오기
export const getMediaFile = async (
  mediaId: string
): Promise<StoredMedia | null> => {
  const db = await initDB()
  const transaction = db.transaction([MEDIA_FILES_STORE], 'readonly')
  const store = transaction.objectStore(MEDIA_FILES_STORE)

  const result = await new Promise<StoredMedia | null>((resolve, reject) => {
    const request = store.get(mediaId)
    request.onsuccess = () => resolve(request.result || null)
    request.onerror = () => reject(request.error)
  })

  db.close()
  return result
}

// 버튼 이미지 저장
export const saveButtonImage = async (file: File): Promise<string> => {
  const id = crypto.randomUUID()
  const media: StoredMedia = {
    id,
    name: file.name,
    blob: file,
    type: 'button',
    createdAt: Date.now(),
  }

  const db = await initDB()
  const transaction = db.transaction([BUTTON_IMAGES_STORE], 'readwrite')
  const store = transaction.objectStore(BUTTON_IMAGES_STORE)

  await new Promise<void>((resolve, reject) => {
    const request = store.put(media)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })

  db.close()
  return id
}

// 버튼 이미지 가져오기
export const getButtonImage = async (
  imageId: string
): Promise<StoredMedia | null> => {
  const db = await initDB()
  const transaction = db.transaction([BUTTON_IMAGES_STORE], 'readonly')
  const store = transaction.objectStore(BUTTON_IMAGES_STORE)

  const result = await new Promise<StoredMedia | null>((resolve, reject) => {
    const request = store.get(imageId)
    request.onsuccess = () => resolve(request.result || null)
    request.onerror = () => reject(request.error)
  })

  db.close()
  return result
}

// 앱 아이콘 저장
export const saveAppIcon = async (file: File): Promise<string> => {
  const id = crypto.randomUUID()
  const media: StoredMedia = {
    id,
    name: file.name,
    blob: file,
    type: 'icon',
    createdAt: Date.now(),
  }

  const db = await initDB()
  const transaction = db.transaction([APP_ICONS_STORE], 'readwrite')
  const store = transaction.objectStore(APP_ICONS_STORE)

  await new Promise<void>((resolve, reject) => {
    const request = store.put(media)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })

  db.close()
  return id
}

// 앱 아이콘 가져오기
export const getAppIcon = async (
  iconId: string
): Promise<StoredMedia | null> => {
  const db = await initDB()
  const transaction = db.transaction([APP_ICONS_STORE], 'readonly')
  const store = transaction.objectStore(APP_ICONS_STORE)

  const result = await new Promise<StoredMedia | null>((resolve, reject) => {
    const request = store.get(iconId)
    request.onsuccess = () => resolve(request.result || null)
    request.onerror = () => reject(request.error)
  })

  db.close()
  return result
}

// Blob URL 생성 헬퍼
// 이미지(5MB 미만)는 Data URL로, 영상 등 큰 파일은 blob URL 사용
export const createBlobURL = async (blob: Blob): Promise<string> => {
  const isImage = blob.type.startsWith('image/')
  const isSmallFile = blob.size < 5 * 1024 * 1024 // 5MB 미만

  // 이미지이고 작은 파일이면 Data URL 사용 (Tauri WebView 호환)
  if (isImage && isSmallFile) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  }

  // 영상 등 큰 파일은 blob URL 사용
  return URL.createObjectURL(blob)
}

// Blob URL 해제 헬퍼
export const revokeBlobURL = (url: string): void => {
  // Data URL은 메모리 해제가 필요 없음
  if (url.startsWith('blob:')) {
    URL.revokeObjectURL(url)
  }
}

// 동영상 썸네일 생성 (첫 프레임 캡처)
export const generateVideoThumbnail = (
  videoBlob: Blob,
  maxSize: number = 320
): Promise<Blob | null> => {
  return new Promise((resolve) => {
    const video = document.createElement('video')
    const blobUrl = URL.createObjectURL(videoBlob)

    video.preload = 'metadata'
    video.muted = true
    video.playsInline = true

    const cleanup = () => {
      URL.revokeObjectURL(blobUrl)
      video.remove()
    }

    video.onloadeddata = () => {
      // 첫 프레임으로 이동
      video.currentTime = 0
    }

    video.onseeked = () => {
      try {
        // Canvas에 비디오 프레임 그리기
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')

        if (!ctx) {
          cleanup()
          resolve(null)
          return
        }

        // 종횡비 유지하며 크기 조정
        const aspectRatio = video.videoWidth / video.videoHeight
        let width = maxSize
        let height = maxSize

        if (aspectRatio > 1) {
          height = maxSize / aspectRatio
        } else {
          width = maxSize * aspectRatio
        }

        canvas.width = width
        canvas.height = height

        ctx.drawImage(video, 0, 0, width, height)

        // JPEG로 변환 (작은 파일 크기)
        canvas.toBlob(
          (blob) => {
            cleanup()
            resolve(blob)
          },
          'image/jpeg',
          0.8
        )
      } catch {
        cleanup()
        resolve(null)
      }
    }

    video.onerror = () => {
      cleanup()
      resolve(null)
    }

    // 5초 타임아웃
    setTimeout(() => {
      cleanup()
      resolve(null)
    }, 5000)

    video.src = blobUrl
    video.load()
  })
}
