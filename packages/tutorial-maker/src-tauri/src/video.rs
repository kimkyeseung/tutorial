use serde::{Deserialize, Serialize};
use std::io::{BufRead, BufReader};
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use tauri::Manager;

/// 영상 압축 품질 설정
#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum CompressionQuality {
    /// 저용량 (CRF 28, 낮은 비트레이트)
    Low,
    /// 중간 (CRF 23, 기본 품질)
    Medium,
    /// 고품질 (CRF 18, 높은 비트레이트)
    High,
}

impl Default for CompressionQuality {
    fn default() -> Self {
        CompressionQuality::Medium
    }
}

impl CompressionQuality {
    /// CRF(Constant Rate Factor) 값 반환
    /// CRF가 낮을수록 높은 품질
    fn crf(&self) -> u8 {
        match self {
            CompressionQuality::Low => 28,
            CompressionQuality::Medium => 23,
            CompressionQuality::High => 18,
        }
    }

    /// 프리셋 반환 (인코딩 속도 vs 압축률)
    fn preset(&self) -> &'static str {
        match self {
            CompressionQuality::Low => "faster",
            CompressionQuality::Medium => "medium",
            CompressionQuality::High => "slow",
        }
    }
}

/// 압축 설정
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CompressionSettings {
    /// 압축 활성화 여부
    pub enabled: bool,
    /// 압축 품질
    pub quality: CompressionQuality,
    /// 최대 해상도 (높이 기준, 예: 1080, 720, 480)
    pub max_height: Option<u32>,
}

impl Default for CompressionSettings {
    fn default() -> Self {
        Self {
            enabled: false,
            quality: CompressionQuality::Medium,
            max_height: None, // 원본 해상도 유지
        }
    }
}

/// 압축 결과
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CompressionResult {
    pub output_path: String,
    pub original_size: u64,
    pub compressed_size: u64,
    pub compression_ratio: f64,
}

/// FFmpeg 경로 찾기
pub fn find_ffmpeg_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    // 1. 번들된 리소스에서 찾기 (production)
    if let Ok(path) = app
        .path()
        .resolve("resources/ffmpeg.exe", tauri::path::BaseDirectory::Resource)
    {
        if path.exists() {
            return Ok(path);
        }
    }

    // 2. src-tauri/resources에서 찾기 (development)
    let dev_path = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("resources")
        .join("ffmpeg.exe");
    if dev_path.exists() {
        return Ok(dev_path);
    }

    // 3. 시스템 PATH에서 찾기 (Windows)
    #[cfg(target_os = "windows")]
    if let Ok(output) = Command::new("where").arg("ffmpeg").output() {
        if output.status.success() {
            let path_str = String::from_utf8_lossy(&output.stdout);
            if let Some(first_line) = path_str.lines().next() {
                let path = PathBuf::from(first_line.trim());
                if path.exists() {
                    return Ok(path);
                }
            }
        }
    }

    // 3. 시스템 PATH에서 찾기 (Unix)
    #[cfg(not(target_os = "windows"))]
    if let Ok(output) = Command::new("which").arg("ffmpeg").output() {
        if output.status.success() {
            let path_str = String::from_utf8_lossy(&output.stdout);
            if let Some(first_line) = path_str.lines().next() {
                let path = PathBuf::from(first_line.trim());
                if path.exists() {
                    return Ok(path);
                }
            }
        }
    }

    Err("ffmpeg.exe를 찾을 수 없습니다. FFmpeg를 설치하거나 resources 폴더에 넣어주세요.\n\nFFmpeg 다운로드: https://ffmpeg.org/download.html".to_string())
}

/// 영상 파일인지 확인
pub fn is_video_file(mime_type: &str) -> bool {
    mime_type.starts_with("video/")
}

/// 영상 길이(duration) 가져오기 (초 단위)
pub fn get_video_duration(ffmpeg_path: &Path, input_path: &Path) -> Result<f64, String> {
    // ffprobe 대신 ffmpeg -i 로 duration 얻기
    let output = Command::new(ffmpeg_path)
        .args(["-i", &input_path.to_string_lossy(), "-f", "null", "-"])
        .stderr(Stdio::piped())
        .output()
        .map_err(|e| format!("Failed to get video duration: {}", e))?;

    let stderr = String::from_utf8_lossy(&output.stderr);

    // Duration: 00:00:10.50 형식 파싱
    for line in stderr.lines() {
        if line.contains("Duration:") {
            if let Some(duration_str) = line.split("Duration:").nth(1) {
                if let Some(time_str) = duration_str.split(',').next() {
                    let time_str = time_str.trim();
                    // HH:MM:SS.ms 파싱
                    let parts: Vec<&str> = time_str.split(':').collect();
                    if parts.len() == 3 {
                        let hours: f64 = parts[0].parse().unwrap_or(0.0);
                        let minutes: f64 = parts[1].parse().unwrap_or(0.0);
                        let seconds: f64 = parts[2].parse().unwrap_or(0.0);
                        return Ok(hours * 3600.0 + minutes * 60.0 + seconds);
                    }
                }
            }
        }
    }

    // Duration을 찾지 못하면 기본값 반환
    Ok(0.0)
}

/// 영상 압축 실행 (진행률 콜백 포함)
pub fn compress_video_with_progress<F>(
    ffmpeg_path: &Path,
    input_path: &Path,
    output_path: &Path,
    settings: &CompressionSettings,
    duration_secs: f64,
    mut on_progress: F,
) -> Result<CompressionResult, String>
where
    F: FnMut(f64), // 진행률 (0.0 ~ 100.0)
{
    let original_size = std::fs::metadata(input_path)
        .map_err(|e| format!("Failed to get input file size: {}", e))?
        .len();

    let mut args = vec![
        "-y".to_string(),           // 덮어쓰기 허용
        "-progress".to_string(),    // 진행률 출력
        "pipe:1".to_string(),       // stdout으로 출력
        "-i".to_string(),           // 입력 파일
        input_path.to_string_lossy().to_string(),
        "-c:v".to_string(),         // 비디오 코덱
        "libx264".to_string(),      // H.264
        "-preset".to_string(),      // 인코딩 속도
        settings.quality.preset().to_string(),
        "-crf".to_string(),         // 품질 설정
        settings.quality.crf().to_string(),
        "-c:a".to_string(),         // 오디오 코덱
        "aac".to_string(),
        "-b:a".to_string(),         // 오디오 비트레이트
        "128k".to_string(),
        "-movflags".to_string(),    // 웹 재생 최적화
        "+faststart".to_string(),
    ];

    // 해상도 제한 적용
    if let Some(max_height) = settings.max_height {
        args.push("-vf".to_string());
        args.push(format!(
            "scale=-2:'min({},ih)':flags=lanczos",
            max_height
        ));
    }

    // 출력 파일
    args.push(output_path.to_string_lossy().to_string());

    log::info!("Running FFmpeg with progress: {:?}", ffmpeg_path);

    let mut child = Command::new(ffmpeg_path)
        .args(&args)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to spawn FFmpeg: {}", e))?;

    // stdout에서 진행률 읽기
    if let Some(stdout) = child.stdout.take() {
        let reader = BufReader::new(stdout);

        for line in reader.lines() {
            if let Ok(line) = line {
                // out_time_ms=1234567 형식 파싱
                if line.starts_with("out_time_ms=") {
                    if let Some(time_str) = line.strip_prefix("out_time_ms=") {
                        if let Ok(time_us) = time_str.parse::<i64>() {
                            let current_secs = time_us as f64 / 1_000_000.0;
                            if duration_secs > 0.0 {
                                let percent = (current_secs / duration_secs * 100.0).min(100.0);
                                on_progress(percent);
                            }
                        }
                    }
                }
                // progress=end 면 완료
                if line == "progress=end" {
                    on_progress(100.0);
                }
            }
        }
    }

    let output = child
        .wait_with_output()
        .map_err(|e| format!("Failed to wait for FFmpeg: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("FFmpeg failed: {}", stderr));
    }

    let compressed_size = std::fs::metadata(output_path)
        .map_err(|e| format!("Failed to get output file size: {}", e))?
        .len();

    let compression_ratio = if original_size > 0 {
        1.0 - (compressed_size as f64 / original_size as f64)
    } else {
        0.0
    };

    log::info!(
        "Compression complete: {} -> {} ({:.1}% reduction)",
        original_size,
        compressed_size,
        compression_ratio * 100.0
    );

    Ok(CompressionResult {
        output_path: output_path.to_string_lossy().to_string(),
        original_size,
        compressed_size,
        compression_ratio,
    })
}

/// 영상 압축 실행 (기존 호환성 유지)
#[allow(dead_code)]
pub fn compress_video(
    ffmpeg_path: &Path,
    input_path: &Path,
    output_path: &Path,
    settings: &CompressionSettings,
) -> Result<CompressionResult, String> {
    compress_video_with_progress(ffmpeg_path, input_path, output_path, settings, 0.0, |_| {})
}

/// 임시 압축 파일 경로 생성
pub fn get_temp_compressed_path(original_name: &str) -> PathBuf {
    let temp_dir = std::env::temp_dir();
    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis();

    let stem = Path::new(original_name)
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("video");

    temp_dir.join(format!("viswave_compressed_{}_{}.mp4", stem, timestamp))
}
