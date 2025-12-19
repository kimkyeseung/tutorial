import { useState, useEffect } from 'react'
import type { Project } from '@viswave/shared'
import {
  getProject,
  getMediaFile,
  getButtonImage,
  createBlobURL,
} from '../utils/mediaStorage'

export function useProductProject(projectId?: string) {
  const [project, setProject] = useState<Project | null>(null)
  const [mediaUrls, setMediaUrls] = useState<Record<string, string>>({})
  const [buttonImageUrls, setButtonImageUrls] = useState<
    Record<string, string>
  >({})
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadProjectData()
  }, [projectId])

  const loadProjectData = async () => {
    try {
      if (!projectId) {
        console.error('No project ID provided for preview')
        setIsLoading(false)
        return
      }

      const projectData = await getProject(projectId)
      if (!projectData) {
        console.error('Project not found:', projectId)
        setIsLoading(false)
        return
      }
      setProject(projectData)

      // 페이지 미디어 로드
      const urls: Record<string, string> = {}
      for (const page of projectData.pages) {
        if (page.mediaId) {
          const media = await getMediaFile(page.mediaId)
          if (media) {
            urls[page.mediaId] = await createBlobURL(media.blob)
          }
        }
      }
      setMediaUrls(urls)

      // 버튼 이미지 로드
      const buttonUrls: Record<string, string> = {}
      for (const page of projectData.pages) {
        for (const button of page.buttons) {
          if (button.imageId && !buttonUrls[button.imageId]) {
            const image = await getButtonImage(button.imageId)
            if (image) {
              buttonUrls[button.imageId] = await createBlobURL(image.blob)
            }
          }
        }
      }
      setButtonImageUrls(buttonUrls)

      setIsLoading(false)
    } catch (error) {
      console.error('Failed to load project data:', error)
      setIsLoading(false)
    }
  }

  return { project, mediaUrls, buttonImageUrls, isLoading }
}
