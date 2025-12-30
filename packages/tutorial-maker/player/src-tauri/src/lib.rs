mod embedded;

use embedded::{
    check_magic_bytes, create_embedded_executable, get_current_exe_path, get_embedded_info,
    read_embedded_media, read_embedded_project, read_manifest, EmbeddedInfo,
};
use serde::Deserialize;
use std::path::PathBuf;

/// Export 요청 데이터
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ExportMediaFile {
    id: String,
    name: String,
    mime_type: String,
    data: Vec<u8>,
}

/// Export 요청
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ExportRequest {
    output_path: String,
    project_json: String,
    media_files: Vec<ExportMediaFile>,
    button_files: Vec<ExportMediaFile>,
    app_icon: Option<Vec<u8>>,
}

/// 임베딩 정보 확인
#[tauri::command]
fn get_embedded_data_info() -> Result<EmbeddedInfo, String> {
    get_embedded_info()
}

/// 임베딩된 프로젝트 JSON 가져오기
#[tauri::command]
fn get_embedded_project_json() -> Result<String, String> {
    let exe_path = get_current_exe_path()?;

    if !check_magic_bytes(&exe_path)? {
        return Err("No embedded data found".to_string());
    }

    let manifest = read_manifest(&exe_path)?;
    read_embedded_project(&exe_path, &manifest)
}

/// 임베딩된 미디어 데이터 가져오기
#[tauri::command]
fn get_embedded_media_data(id: String) -> Result<Vec<u8>, String> {
    let exe_path = get_current_exe_path()?;

    if !check_magic_bytes(&exe_path)? {
        return Err("No embedded data found".to_string());
    }

    let manifest = read_manifest(&exe_path)?;

    // 미디어에서 찾기
    if let Some(entry) = manifest.media.iter().find(|e| e.id == id) {
        return read_embedded_media(&exe_path, entry.offset, entry.size);
    }

    // 버튼에서 찾기
    if let Some(entry) = manifest.buttons.iter().find(|e| e.id == id) {
        return read_embedded_media(&exe_path, entry.offset, entry.size);
    }

    Err(format!("Media not found: {}", id))
}

/// 임베딩된 앱 아이콘 가져오기
#[tauri::command]
fn get_embedded_app_icon() -> Result<Option<Vec<u8>>, String> {
    let exe_path = get_current_exe_path()?;

    if !check_magic_bytes(&exe_path)? {
        return Err("No embedded data found".to_string());
    }

    let manifest = read_manifest(&exe_path)?;

    match (manifest.app_icon_offset, manifest.app_icon_size) {
        (Some(offset), Some(size)) => {
            let data = read_embedded_media(&exe_path, offset, size)?;
            Ok(Some(data))
        }
        _ => Ok(None),
    }
}

/// 실행 파일로 내보내기
#[tauri::command]
fn export_as_executable(request: ExportRequest) -> Result<(), String> {
    let output_path = PathBuf::from(&request.output_path);

    let media_files: Vec<_> = request
        .media_files
        .into_iter()
        .map(|f| (f.id, f.name, f.mime_type, f.data))
        .collect();

    let button_files: Vec<_> = request
        .button_files
        .into_iter()
        .map(|f| (f.id, f.name, f.mime_type, f.data))
        .collect();

    create_embedded_executable(
        &output_path,
        &request.project_json,
        media_files,
        button_files,
        request.app_icon,
    )
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_cli::init())
        .invoke_handler(tauri::generate_handler![
            get_embedded_data_info,
            get_embedded_project_json,
            get_embedded_media_data,
            get_embedded_app_icon,
            export_as_executable,
        ])
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
