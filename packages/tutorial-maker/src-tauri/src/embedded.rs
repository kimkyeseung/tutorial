use serde::{Deserialize, Serialize};
use std::fs::{self, File};
use std::io::{Read, Write};
use std::path::Path;

/// 매직 바이트 - 임베딩된 데이터 식별용
const MAGIC_BYTES: &[u8] = b"VISTUT_V1";

/// 스트리밍 읽기 버퍼 크기 (64KB)
const STREAM_BUFFER_SIZE: usize = 65536;

/// 빌드 시점에 viewer.exe를 임베드
const VIEWER_EXE: &[u8] = include_bytes!(env!("VIEWER_EXE_PATH"));

/// 미디어 소스 (메모리 데이터 또는 파일 경로)
pub enum MediaSource {
    Data(Vec<u8>),
    Path(String),
}

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

/// 기본 실행 파일 생성 (viewer.exe만 복사)
/// rcedit로 아이콘 설정 전에 호출해야 함
pub fn prepare_base_executable(output_path: &Path) -> Result<(), String> {
    fs::write(output_path, VIEWER_EXE)
        .map_err(|e| format!("Failed to write viewer exe: {}", e))
}

/// 임베딩 데이터 추가 (아이콘 설정 후 호출)
/// 현재 파일 크기를 기준으로 오프셋 계산
pub fn append_embedded_data(
    output_path: &Path,
    project_json: &str,
    media_files: Vec<(String, String, String, MediaSource)>, // (id, name, mime_type, source)
    button_files: Vec<(String, String, String, MediaSource)>,
    app_icon: Option<Vec<u8>>,
) -> Result<Vec<String>, String> {
    // 정리할 임시 파일 경로 수집
    let mut temp_files_to_cleanup: Vec<String> = Vec::new();

    // 현재 파일 크기를 시작 오프셋으로 사용 (rcedit가 파일을 수정했을 수 있음)
    let current_file_size = fs::metadata(output_path)
        .map_err(|e| format!("Failed to get file metadata: {}", e))?
        .len();

    // 출력 파일 열기 (append 모드)
    let mut file = fs::OpenOptions::new()
        .append(true)
        .open(output_path)
        .map_err(|e| format!("Failed to open output file: {}", e))?;

    let mut current_offset = current_file_size;

    // 미디어 파일들 쓰기
    let mut media_entries: Vec<MediaManifestEntry> = Vec::new();
    for (id, name, mime_type, source) in media_files {
        let size = write_media_source(&mut file, &source, &mut temp_files_to_cleanup)?;

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
    for (id, name, mime_type, source) in button_files {
        let size = write_media_source(&mut file, &source, &mut temp_files_to_cleanup)?;

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

    Ok(temp_files_to_cleanup)
}

/// 미디어 소스를 파일에 쓰고 크기를 반환
fn write_media_source(
    file: &mut File,
    source: &MediaSource,
    temp_files: &mut Vec<String>,
) -> Result<u64, String> {
    match source {
        MediaSource::Data(data) => {
            file.write_all(data)
                .map_err(|e| format!("Failed to write media data: {}", e))?;
            Ok(data.len() as u64)
        }
        MediaSource::Path(path) => {
            temp_files.push(path.clone());
            let size = stream_file_to_output(file, Path::new(path))?;
            Ok(size)
        }
    }
}

/// 파일을 스트리밍으로 읽어서 출력 파일에 쓰기
fn stream_file_to_output(output: &mut File, source_path: &Path) -> Result<u64, String> {
    let mut source = File::open(source_path)
        .map_err(|e| format!("Failed to open source file {:?}: {}", source_path, e))?;

    let mut buffer = [0u8; STREAM_BUFFER_SIZE];
    let mut total_written: u64 = 0;

    loop {
        let bytes_read = source
            .read(&mut buffer)
            .map_err(|e| format!("Failed to read source file: {}", e))?;

        if bytes_read == 0 {
            break;
        }

        output
            .write_all(&buffer[..bytes_read])
            .map_err(|e| format!("Failed to write to output: {}", e))?;

        total_written += bytes_read as u64;
    }

    Ok(total_written)
}
