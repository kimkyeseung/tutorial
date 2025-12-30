mod embedded;
mod icon;

use embedded::create_embedded_executable;
use icon::{convert_to_ico, set_exe_icon};
use serde::Deserialize;
use std::path::PathBuf;
use tauri::Manager;

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

/// 실행 파일로 내보내기
#[tauri::command]
fn export_as_executable(app: tauri::AppHandle, request: ExportRequest) -> Result<(), String> {
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

    // 임베디드 실행 파일 생성
    create_embedded_executable(
        &output_path,
        &request.project_json,
        media_files,
        button_files,
        request.app_icon.clone(),
    )?;

    // 앱 아이콘이 있으면 PE 리소스에 설정
    if let Some(icon_data) = request.app_icon {
        set_executable_icon(&app, &output_path, &icon_data)?;
    }

    Ok(())
}

/// 실행 파일의 PE 아이콘 설정
fn set_executable_icon(
    app: &tauri::AppHandle,
    exe_path: &PathBuf,
    icon_data: &[u8],
) -> Result<(), String> {
    // 임시 ICO 파일 경로
    let temp_dir = std::env::temp_dir();
    let ico_path = temp_dir.join("temp_icon.ico");

    // PNG/JPEG를 ICO로 변환
    convert_to_ico(icon_data, &ico_path)?;

    // rcedit 경로 찾기 (dev와 production 모두 지원)
    let rcedit_path = find_rcedit_path(app)?;

    // rcedit로 아이콘 설정
    set_exe_icon(exe_path, &ico_path, &rcedit_path)?;

    // 임시 파일 정리
    let _ = std::fs::remove_file(&ico_path);

    Ok(())
}

/// rcedit 경로 찾기
fn find_rcedit_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    // 1. 번들된 리소스에서 찾기 (production)
    if let Ok(path) = app
        .path()
        .resolve("resources/rcedit-x64.exe", tauri::path::BaseDirectory::Resource)
    {
        if path.exists() {
            return Ok(path);
        }
    }

    // 2. src-tauri/resources에서 찾기 (development)
    let dev_path = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("resources")
        .join("rcedit-x64.exe");
    if dev_path.exists() {
        return Ok(dev_path);
    }

    Err("rcedit-x64.exe not found".to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![export_as_executable])
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
