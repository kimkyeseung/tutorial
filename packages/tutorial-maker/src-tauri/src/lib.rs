mod embedded;

use embedded::create_embedded_executable;
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
