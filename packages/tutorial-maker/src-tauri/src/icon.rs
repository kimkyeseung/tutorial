use ico::{IconDir, IconDirEntry, IconImage, ResourceType};
use image::imageops::FilterType;
use image::DynamicImage;
use std::fs::File;
use std::io::BufWriter;
use std::path::Path;
use std::process::Command;

/// ICO 파일에 포함할 아이콘 크기들
const ICON_SIZES: &[u32] = &[256, 128, 64, 48, 32, 16];

/// PNG/JPEG 이미지 데이터를 ICO 파일로 변환
pub fn convert_to_ico(image_data: &[u8], output_path: &Path) -> Result<(), String> {
    // 이미지 로드
    let img = image::load_from_memory(image_data)
        .map_err(|e| format!("Failed to load image: {}", e))?;

    // ICO 디렉토리 생성
    let mut icon_dir = IconDir::new(ResourceType::Icon);

    // 각 크기별로 아이콘 엔트리 추가
    for &size in ICON_SIZES {
        let resized = resize_image(&img, size);
        let rgba = resized.to_rgba8();
        let icon_image = IconImage::from_rgba_data(size, size, rgba.into_raw());
        icon_dir.add_entry(IconDirEntry::encode(&icon_image).map_err(|e| {
            format!("Failed to encode icon at size {}: {}", size, e)
        })?);
    }

    // ICO 파일 쓰기
    let file = File::create(output_path)
        .map_err(|e| format!("Failed to create ICO file: {}", e))?;
    let writer = BufWriter::new(file);
    icon_dir
        .write(writer)
        .map_err(|e| format!("Failed to write ICO file: {}", e))?;

    Ok(())
}

/// 이미지를 지정된 크기로 리사이즈
fn resize_image(img: &DynamicImage, size: u32) -> DynamicImage {
    img.resize_exact(size, size, FilterType::Lanczos3)
}

/// rcedit를 사용하여 실행 파일의 아이콘 설정
pub fn set_exe_icon(exe_path: &Path, ico_path: &Path, rcedit_path: &Path) -> Result<(), String> {
    let output = Command::new(rcedit_path)
        .arg(exe_path)
        .arg("--set-icon")
        .arg(ico_path)
        .output()
        .map_err(|e| format!("Failed to execute rcedit: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("rcedit failed: {}", stderr));
    }

    Ok(())
}
