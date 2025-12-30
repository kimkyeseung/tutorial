use std::path::PathBuf;

fn main() {
    // viewer.exe 경로 설정 (상대 경로로 tutorial-viewer의 release 빌드 참조)
    let manifest_dir = std::env::var("CARGO_MANIFEST_DIR").unwrap();
    let viewer_path = PathBuf::from(&manifest_dir)
        .parent()
        .unwrap()
        .parent()
        .unwrap()
        .join("tutorial-viewer")
        .join("src-tauri")
        .join("target")
        .join("release")
        .join("tutorial-viewer.exe");

    // viewer.exe 경로를 환경 변수로 전달
    println!("cargo:rustc-env=VIEWER_EXE_PATH={}", viewer_path.display());

    // viewer.exe가 변경되면 재빌드
    println!("cargo:rerun-if-changed={}", viewer_path.display());

    tauri_build::build()
}
