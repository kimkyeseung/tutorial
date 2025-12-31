import { tempDir, sep } from '@tauri-apps/api/path'
import { writeFile } from '@tauri-apps/plugin-fs'

/**
 * Blob을 임시 파일로 저장하고 경로를 반환합니다.
 * 대용량 미디어 파일을 Tauri IPC로 전송할 때 메모리 문제를 방지합니다.
 */
export async function saveBlobToTempFile(
  blob: Blob,
  filename: string
): Promise<string> {
  let tempDirPath = await tempDir()
  const separator = await sep()
  // 경로 끝에 플랫폼에 맞는 구분자 추가
  if (!tempDirPath.endsWith('/') && !tempDirPath.endsWith('\\')) {
    tempDirPath += separator
  }
  const timestamp = Date.now()
  const randomSuffix = Math.random().toString(36).substring(2, 8)
  const safeName = filename.replace(/[^a-zA-Z0-9.-]/g, '_')
  const tempPath = `${tempDirPath}viswave_export_${timestamp}_${randomSuffix}_${safeName}`

  const arrayBuffer = await blob.arrayBuffer()
  const uint8Array = new Uint8Array(arrayBuffer)

  await writeFile(tempPath, uint8Array)

  return tempPath
}
