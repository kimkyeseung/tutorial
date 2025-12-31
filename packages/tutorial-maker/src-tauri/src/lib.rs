mod embedded;
mod icon;

use embedded::{append_embedded_data, prepare_base_executable, MediaSource};
use icon::{convert_to_ico, set_exe_icon};
use serde::Deserialize;
use std::path::PathBuf;
use tauri::Manager;

/// Export 요청 데이터
/// 대용량 파일은 path로, 소용량 파일은 data로 전달
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ExportMediaFile {
    id: String,
    name: String,
    mime_type: String,
    #[serde(default)]
    data: Option<Vec<u8>>,
    #[serde(default)]
    path: Option<String>,
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

/// ExportMediaFile을 MediaSource로 변환
fn to_media_source(file: ExportMediaFile) -> (String, String, String, MediaSource) {
    let source = if let Some(path) = file.path {
        MediaSource::Path(path)
    } else if let Some(data) = file.data {
        MediaSource::Data(data)
    } else {
        // 둘 다 없으면 빈 데이터로 처리
        MediaSource::Data(Vec::new())
    };
    (file.id, file.name, file.mime_type, source)
}

/// 실행 파일로 내보내기
///
/// # 중요: 실행 순서
/// 1. prepare_base_executable - viewer.exe 복사
/// 2. set_executable_icon - rcedit로 PE 아이콘 설정 (선택적)
/// 3. append_embedded_data - 바이너리 데이터 추가
///
/// # 주의사항
/// - rcedit는 반드시 데이터 임베딩 전에 실행해야 함!
/// - rcedit가 PE 파일을 수정하면 파일 끝에 추가된 데이터가 손상됨
/// - 이 순서를 변경하면 내보낸 exe가 튜토리얼 대신 파일 선택기를 표시함
#[tauri::command]
fn export_as_executable(app: tauri::AppHandle, request: ExportRequest) -> Result<(), String> {
    let output_path = PathBuf::from(&request.output_path);

    let media_files: Vec<_> = request
        .media_files
        .into_iter()
        .map(to_media_source)
        .collect();

    let button_files: Vec<_> = request
        .button_files
        .into_iter()
        .map(to_media_source)
        .collect();

    // ⚠️ 순서 중요! 아래 순서를 절대 변경하지 말 것

    // 1. 기본 실행 파일 생성 (viewer.exe 복사)
    prepare_base_executable(&output_path)?;

    // 2. 앱 아이콘이 있으면 PE 리소스에 설정
    // ⚠️ 반드시 데이터 임베딩 전에 수행! (rcedit가 파일 구조를 변경함)
    if let Some(ref icon_data) = request.app_icon {
        set_executable_icon(&app, &output_path, icon_data)?;
    }

    // 3. 임베딩 데이터 추가 (아이콘 설정 후)
    // ⚠️ 이 단계가 마지막이어야 매직 바이트가 파일 끝에 위치함
    let temp_files = append_embedded_data(
        &output_path,
        &request.project_json,
        media_files,
        button_files,
        request.app_icon,
    )?;

    // 4. 임시 파일 정리
    for temp_path in temp_files {
        let _ = std::fs::remove_file(&temp_path);
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
