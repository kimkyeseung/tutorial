use serde::{Deserialize, Serialize};
use std::fs::{self, File};
use std::io::{Read, Seek, SeekFrom, Write};
use std::path::Path;

/// 매직 바이트 - 임베딩된 데이터 식별용
const MAGIC_BYTES: &[u8] = b"VISTUT_V1";
const MAGIC_SIZE: usize = 9;
const MANIFEST_SIZE_BYTES: usize = 8;

/// 미디어 파일 매니페스트 엔트리
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MediaManifestEntry {
    pub id: String,
    pub name: String,
    pub mime_type: String,
    pub offset: u64,
    pub size: u64,
}

/// 빌드 매니페스트
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BuildManifest {
    pub project_json_offset: u64,
    pub project_json_size: u64,
    pub media: Vec<MediaManifestEntry>,
    pub buttons: Vec<MediaManifestEntry>,
    pub app_icon_offset: Option<u64>,
    pub app_icon_size: Option<u64>,
}

/// 임베딩된 데이터 확인 결과
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EmbeddedInfo {
    pub has_embedded_data: bool,
    pub manifest: Option<BuildManifest>,
}

/// 현재 실행 파일 경로 가져오기
pub fn get_current_exe_path() -> Result<std::path::PathBuf, String> {
    std::env::current_exe().map_err(|e| format!("Failed to get current exe path: {}", e))
}

/// 파일에서 매직 바이트 확인
pub fn check_magic_bytes(path: &Path) -> Result<bool, String> {
    let mut file = File::open(path).map_err(|e| format!("Failed to open file: {}", e))?;

    let file_size = file
        .metadata()
        .map_err(|e| format!("Failed to get file metadata: {}", e))?
        .len();

    if file_size < (MAGIC_SIZE + MANIFEST_SIZE_BYTES) as u64 {
        return Ok(false);
    }

    // 파일 끝에서 매직 바이트 위치로 이동
    file.seek(SeekFrom::End(-(MAGIC_SIZE as i64)))
        .map_err(|e| format!("Failed to seek: {}", e))?;

    let mut magic_buffer = [0u8; MAGIC_SIZE];
    file.read_exact(&mut magic_buffer)
        .map_err(|e| format!("Failed to read magic bytes: {}", e))?;

    Ok(&magic_buffer == MAGIC_BYTES)
}

/// 매니페스트 읽기
pub fn read_manifest(path: &Path) -> Result<BuildManifest, String> {
    let mut file = File::open(path).map_err(|e| format!("Failed to open file: {}", e))?;

    // 매니페스트 크기 읽기 (파일 끝에서 매직 바이트 + 8바이트 앞)
    file.seek(SeekFrom::End(-((MAGIC_SIZE + MANIFEST_SIZE_BYTES) as i64)))
        .map_err(|e| format!("Failed to seek to manifest size: {}", e))?;

    let mut size_buffer = [0u8; MANIFEST_SIZE_BYTES];
    file.read_exact(&mut size_buffer)
        .map_err(|e| format!("Failed to read manifest size: {}", e))?;

    let manifest_size = u64::from_le_bytes(size_buffer);

    // 매니페스트 JSON 읽기
    file.seek(SeekFrom::End(
        -((MAGIC_SIZE + MANIFEST_SIZE_BYTES) as i64 + manifest_size as i64),
    ))
    .map_err(|e| format!("Failed to seek to manifest: {}", e))?;

    let mut manifest_buffer = vec![0u8; manifest_size as usize];
    file.read_exact(&mut manifest_buffer)
        .map_err(|e| format!("Failed to read manifest: {}", e))?;

    let manifest_json =
        String::from_utf8(manifest_buffer).map_err(|e| format!("Invalid UTF-8 in manifest: {}", e))?;

    serde_json::from_str(&manifest_json).map_err(|e| format!("Failed to parse manifest JSON: {}", e))
}

/// 임베딩된 프로젝트 JSON 읽기
pub fn read_embedded_project(path: &Path, manifest: &BuildManifest) -> Result<String, String> {
    let mut file = File::open(path).map_err(|e| format!("Failed to open file: {}", e))?;

    file.seek(SeekFrom::Start(manifest.project_json_offset))
        .map_err(|e| format!("Failed to seek to project JSON: {}", e))?;

    let mut buffer = vec![0u8; manifest.project_json_size as usize];
    file.read_exact(&mut buffer)
        .map_err(|e| format!("Failed to read project JSON: {}", e))?;

    String::from_utf8(buffer).map_err(|e| format!("Invalid UTF-8 in project JSON: {}", e))
}

/// 임베딩된 미디어 데이터 읽기
pub fn read_embedded_media(path: &Path, offset: u64, size: u64) -> Result<Vec<u8>, String> {
    let mut file = File::open(path).map_err(|e| format!("Failed to open file: {}", e))?;

    file.seek(SeekFrom::Start(offset))
        .map_err(|e| format!("Failed to seek to media: {}", e))?;

    let mut buffer = vec![0u8; size as usize];
    file.read_exact(&mut buffer)
        .map_err(|e| format!("Failed to read media: {}", e))?;

    Ok(buffer)
}

/// 현재 exe에서 임베딩 정보 가져오기
pub fn get_embedded_info() -> Result<EmbeddedInfo, String> {
    let exe_path = get_current_exe_path()?;

    if !check_magic_bytes(&exe_path)? {
        return Ok(EmbeddedInfo {
            has_embedded_data: false,
            manifest: None,
        });
    }

    let manifest = read_manifest(&exe_path)?;

    Ok(EmbeddedInfo {
        has_embedded_data: true,
        manifest: Some(manifest),
    })
}

/// 실행 파일 생성 (튜토리얼 임베딩)
pub fn create_embedded_executable(
    output_path: &Path,
    project_json: &str,
    media_files: Vec<(String, String, String, Vec<u8>)>, // (id, name, mime_type, data)
    button_files: Vec<(String, String, String, Vec<u8>)>,
    app_icon: Option<Vec<u8>>,
) -> Result<(), String> {
    // 현재 exe 복사
    let source_exe = get_current_exe_path()?;
    fs::copy(&source_exe, output_path).map_err(|e| format!("Failed to copy exe: {}", e))?;

    // 출력 파일 열기 (append 모드)
    let mut file = fs::OpenOptions::new()
        .append(true)
        .open(output_path)
        .map_err(|e| format!("Failed to open output file: {}", e))?;

    let mut current_offset = file
        .metadata()
        .map_err(|e| format!("Failed to get file size: {}", e))?
        .len();

    // 미디어 파일들 쓰기
    let mut media_entries: Vec<MediaManifestEntry> = Vec::new();
    for (id, name, mime_type, data) in media_files {
        let size = data.len() as u64;
        file.write_all(&data)
            .map_err(|e| format!("Failed to write media: {}", e))?;

        media_entries.push(MediaManifestEntry {
            id,
            name,
            mime_type,
            offset: current_offset,
            size,
        });

        current_offset += size;
    }

    // 버튼 이미지들 쓰기
    let mut button_entries: Vec<MediaManifestEntry> = Vec::new();
    for (id, name, mime_type, data) in button_files {
        let size = data.len() as u64;
        file.write_all(&data)
            .map_err(|e| format!("Failed to write button image: {}", e))?;

        button_entries.push(MediaManifestEntry {
            id,
            name,
            mime_type,
            offset: current_offset,
            size,
        });

        current_offset += size;
    }

    // 앱 아이콘 쓰기
    let (app_icon_offset, app_icon_size) = if let Some(icon_data) = app_icon {
        let offset = current_offset;
        let size = icon_data.len() as u64;
        file.write_all(&icon_data)
            .map_err(|e| format!("Failed to write app icon: {}", e))?;
        current_offset += size;
        (Some(offset), Some(size))
    } else {
        (None, None)
    };

    // 프로젝트 JSON 쓰기
    let project_json_bytes = project_json.as_bytes();
    let project_json_offset = current_offset;
    let project_json_size = project_json_bytes.len() as u64;
    file.write_all(project_json_bytes)
        .map_err(|e| format!("Failed to write project JSON: {}", e))?;

    // 매니페스트 생성 및 쓰기
    let manifest = BuildManifest {
        project_json_offset,
        project_json_size,
        media: media_entries,
        buttons: button_entries,
        app_icon_offset,
        app_icon_size,
    };

    let manifest_json =
        serde_json::to_string(&manifest).map_err(|e| format!("Failed to serialize manifest: {}", e))?;
    let manifest_bytes = manifest_json.as_bytes();
    let manifest_size = manifest_bytes.len() as u64;

    file.write_all(manifest_bytes)
        .map_err(|e| format!("Failed to write manifest: {}", e))?;

    // 매니페스트 크기 쓰기 (8바이트, little-endian)
    file.write_all(&manifest_size.to_le_bytes())
        .map_err(|e| format!("Failed to write manifest size: {}", e))?;

    // 매직 바이트 쓰기
    file.write_all(MAGIC_BYTES)
        .map_err(|e| format!("Failed to write magic bytes: {}", e))?;

    Ok(())
}
