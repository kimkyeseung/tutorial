import React from 'react'
import {
  ErrorScreen,
  LoadingScreen,
  ProductPageContent,
} from '@viswave/shared'
import { useProductProject } from '../hooks/useProductProject'

// 기존 ProductPage (useProductProject 훅 사용)
interface ProductPageProps {
  projectId?: string // 개발 모드 미리보기에서 특정 프로젝트 ID 전달
}

const ProductPage: React.FC<ProductPageProps> = ({ projectId }) => {
  const { project, mediaUrls, buttonImageUrls, iconUrl, isLoading } =
    useProductProject(projectId)

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
      emptyMessage='빌더 페이지에서 페이지를 추가해주세요'
    />
  )
}

export default ProductPage
