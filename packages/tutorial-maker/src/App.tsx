import { useState } from 'react'
import BuilderPage from './pages/BuilderPage'
import ProductPage from './pages/ProductPage'

function App() {
  // 미리보기 상태
  const [showPreview, setShowPreview] = useState(false)
  const [previewProjectId, setPreviewProjectId] = useState<string | null>(null)

  // 미리보기 핸들러
  const handlePreview = (projectId: string) => {
    setPreviewProjectId(projectId)
    setShowPreview(true)
  }

  // 미리보기에서 돌아가기
  const handleBackFromPreview = () => {
    setShowPreview(false)
    setPreviewProjectId(null)
  }

  // 미리보기 중
  if (showPreview && previewProjectId) {
    return (
      <div className='relative'>
        <button
          onClick={handleBackFromPreview}
          className='absolute left-4 top-4 z-50 rounded-lg bg-red-600 px-4 py-2 text-white shadow-lg hover:bg-red-700'
        >
          ← 빌더로 돌아가기
        </button>
        <ProductPage projectId={previewProjectId} />
      </div>
    )
  }

  // 빌더 페이지
  return <BuilderPage onPreview={handlePreview} />
}

export default App
