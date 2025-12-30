use serde::{Deserialize, Serialize};
use std::fs;
use std::io::Write;
use std::path::Path;

/// 매직 바이트 - 임베딩된 데이터 식별용
const MAGIC_BYTES: &[u8] = b"VISTUT_V1";

/// 빌드 시점에 viewer.exe를 임베드
const VIEWER_EXE: &[u8] = include_bytes!(env!("VIEWER_EXE_PATH"));

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

/// 실행 파일 생성 (튜토리얼 임베딩)
pub fn create_embedded_executable(
    output_path: &Path,
    project_json: &str,
    media_files: Vec<(String, String, String, Vec<u8>)>, // (id, name, mime_type, data)
    button_files: Vec<(String, String, String, Vec<u8>)>,
    app_icon: Option<Vec<u8>>,
) -> Result<(), String> {
    // 임베드된 viewer.exe를 출력 파일로 쓰기
    fs::write(output_path, VIEWER_EXE)
        .map_err(|e| format!("Failed to write viewer exe: {}", e))?;

    // 출력 파일 열기 (append 모드)
    let mut file = fs::OpenOptions::new()
        .append(true)
        .open(output_path)
        .map_err(|e| format!("Failed to open output file: {}", e))?;

    let mut current_offset = VIEWER_EXE.len() as u64;

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
