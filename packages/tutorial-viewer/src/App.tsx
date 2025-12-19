import { useState, useEffect } from 'react'
import ViewerPage from './pages/ViewerPage'

function App() {
  const [filePath, setFilePath] = useState<string | null>(null)

  // CLI 인자로 파일 경로 받기
  useEffect(() => {
    const checkCliArgs = async () => {
      try {
        const { getMatches } = await import('@tauri-apps/plugin-cli')
        const matches = await getMatches()

        if (matches.args.file?.value) {
          setFilePath(matches.args.file.value as string)
        }
      } catch (err) {
        // CLI 플러그인이 없거나 에러 발생 시 무시
        console.log('CLI args not available:', err)
      }
    }

    checkCliArgs()
  }, [])

  const handleFileSelect = (path: string) => {
    setFilePath(path)
  }

  return <ViewerPage filePath={filePath} onFileSelect={handleFileSelect} />
}

export default App
