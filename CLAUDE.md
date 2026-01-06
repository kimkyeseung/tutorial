# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Rules

- 명시적으로 요청하지 않는 한 git commit 하지 말 것

## Project Overview

Viswave Tutorials is a monorepo for building interactive touch-screen tutorials. It consists of:
- **tutorial-maker**: Desktop authoring tool (Tauri + React + Vite) - creates and exports tutorials as standalone executables
  - **player**: Player runtime (Tauri + Rust) - embedded into maker for standalone exports
- **shared**: Common components, hooks, types, and utilities

## Commands

### Development
```bash
npm run dev:maker     # Start tutorial-maker with Tauri dev mode (port 5173)
npm run dev:player    # Start player with Tauri dev mode (port 5174) - for testing
```

### Building
```bash
# IMPORTANT: Build player first, then maker (maker embeds player.exe)
npm run build:player  # Build player runtime
npm run build:maker   # Build maker (embeds player.exe)
```

### Formatting
```bash
npm run format        # Prettier formatting across all packages
```

### Testing
```bash
# In packages/shared or packages/tutorial-maker
npm run test          # Run Vitest in watch mode
npm run test:run      # Run tests once
npm run test:coverage # Run tests with coverage report
```

### Per-Package Commands
```bash
# In packages/shared
npm run test          # Vitest watch mode (recentFiles, usePageNavigation)
npm run test:run      # Run tests once

# In packages/tutorial-maker
npm run dev           # tauri dev (includes Vite + Rust)
npm run tauri:build   # Build desktop binary (requires player built first)
npm run build:vite    # Frontend only (tsc + vite)
npm run test          # Vitest watch mode (pageValidation)
npm run test:run      # Run tests once

# In packages/tutorial-maker/player
npm run dev           # tauri dev (includes Vite + Rust)
npm run tauri:build   # Build player binary
npm run build         # Frontend only (tsc + vite)
```

## Architecture

### Monorepo Structure
```
packages/
├── shared/           # @viswave/shared - reusable code
│   └── src/
│       ├── components/product/  # ProductPageContent, VideoPlayer, PageButton,
│       │                        # TouchAreaComponent, DebugOverlay, ControlOverlay,
│       │                        # EntryPage, LoadingScreen, ErrorScreen
│       ├── hooks/               # usePageNavigation, useTutorialViewer
│       ├── types/               # Project, Page, PageButton, TouchArea
│       └── utils/               # tutorialLoader, recentFiles
└── tutorial-maker/   # @viswave/tutorial-maker - Tauri desktop authoring tool
    ├── src/
    │   ├── pages/               # BuilderPage, ProductPage (preview)
    │   ├── components/builder/  # PageEditor, PageList, FlowMap, InteractionEditor,
    │   │                        # ProjectSettings, MediaUploader, SortablePageItem
    │   ├── hooks/               # useProductProject
    │   └── utils/               # mediaStorage, pageValidation
    ├── src-tauri/               # Rust backend (lib.rs, embedded.rs, icon.rs)
    └── player/       # @viswave/tutorial-player - Player runtime
        ├── src/                 # React frontend
        └── src-tauri/           # Rust backend (lib.rs, embedded.rs)
```

### Data Flow
1. **Builder (tutorial-maker)**: Projects and media stored in IndexedDB
2. **Export**: Standalone executable with embedded tutorial data
   - Maker embeds player.exe at build time (via `include_bytes!`)
   - Export appends project JSON, media files, button images, app icon to player binary
   - Uses magic bytes (`VISTUT_V1`) and manifest for data extraction
3. **Player (tutorial-maker/player)**: Reads embedded data from self, extracts to Object URLs for playback

### Key Data Models (packages/shared/src/types/Project.ts)
- `Project`: Container with pages array and settings
- `Page`: Has mediaType (video|image), playType (loop|single), buttons, touchAreas
- `PageButton`/`TouchArea`: Position and size in percentage (0-100), action (next|goto)
- `ProjectSettings`: Window dimensions, fullscreen, exitKey, navigation options

### Navigation System
The `usePageNavigation` hook manages page transitions:
- Preloads current page + all connected pages (next page, goto targets)
- Supports both linear (next) and non-linear (goto specific page) navigation
- loop mode: repeats media infinitely, requires button/touch to navigate
- single mode: plays N times then auto-advances

### Preview Mode (ProductPage)
미리보기 모드에서 사용 가능한 단축키:
- `D`: 디버그 오버레이 표시/숨기기 (페이지 정보, 버튼/터치영역 테두리, 영상 재생 정보)
- `Ctrl+1` / `Cmd+1`: 전체화면 토글
- `←` / `→`: 이전/다음 페이지
- `Home`: 첫 페이지로 이동
- 설정된 종료 키 (ESC, F11, F12): 종료 확인 다이얼로그

### Media Storage
- **IndexedDB stores**: projects, mediaFiles, buttonImages, appIcons
- **Export format**: Standalone executable (player.exe + appended binary data)
- **Binary structure**: [player.exe][media files][buttons][icon][project JSON][manifest JSON][manifest size (8 bytes)][magic bytes]
- Position/size stored as percentages for responsive layout
- **App Icon**: PNG/JPEG → ICO 변환 후 rcedit로 실행파일 PE 리소스에 적용 (icon.rs)

### Validation Rules (pageValidation.ts)
- Every page requires media
- Loop mode pages must have at least one button or touch area (escape route)
- goto actions validated for target page existence

## Tech Stack
- Frontend: React 19, TypeScript 5.9, Tailwind CSS 3.4
- Build: Vite 7.1
- Testing: Vitest (shared, tutorial-maker)
- Desktop: Tauri 2.0 with Rust backend (maker and player)
- Storage: IndexedDB (idb pattern in mediaStorage.ts)
- Export: Binary embedding (player.exe + appended data with magic bytes)
- Drag/Drop: @dnd-kit for page reordering

## Build Dependencies
- **player must be built before maker**: Maker uses `include_bytes!` to embed player.exe at compile time
- Build order: `npm run build:player` → `npm run build:maker`

## Export Architecture (Critical Implementation Details)

### 단일 실행파일 내보내기 순서 (중요!)
`export_as_executable` (lib.rs)에서 반드시 다음 순서를 지켜야 함:

```rust
// 1. 기본 실행 파일 생성 (viewer.exe 복사)
prepare_base_executable(&output_path)?;

// 2. 앱 아이콘 설정 (rcedit) - 데이터 임베딩 전에 수행!
if let Some(ref icon_data) = request.app_icon {
    set_executable_icon(&app, &output_path, icon_data)?;
}

// 3. 임베딩 데이터 추가 (아이콘 설정 후)
append_embedded_data(...)?;
```

**이유**: rcedit가 PE 파일을 수정할 때 파일 끝에 추가된 바이너리 데이터를 손상시킴.
아이콘 설정 후 데이터를 추가해야 매직 바이트와 매니페스트가 보존됨.

### 대용량 파일 내보내기 (해결됨)
- **문제**: `Array.from(new Uint8Array())` → 메모리 8배 증가 → "Invalid string length" 오류
- **해결**: 10MB 이상 파일은 임시 파일로 저장 후 경로만 전달
- **임계값**: `LARGE_FILE_THRESHOLD = 10 * 1024 * 1024` (ProductPage.tsx, BuilderPage.tsx)
- **Rust**: `MediaSource` enum으로 Data/Path 분기 처리, 64KB 버퍼로 스트리밍 읽기

### 바이너리 구조
```
[VIEWER_EXE][media files][buttons][icon data][project JSON][manifest JSON][manifest size (8 bytes)][magic bytes "VISTUT_V1"]
```

- `append_embedded_data`는 `fs::metadata`로 현재 파일 크기를 가져와 시작 오프셋으로 사용
- 이렇게 해야 rcedit가 파일 크기를 변경해도 올바른 오프셋 계산 가능

## Common Pitfalls (주의사항)

### 1. 내보내기 순서 변경 금지
```
❌ 잘못된 순서: 데이터 임베딩 → 아이콘 설정
✅ 올바른 순서: viewer.exe 복사 → 아이콘 설정 → 데이터 임베딩
```
- rcedit가 PE 파일을 수정하면 파일 끝에 추가된 데이터가 손상됨
- `lib.rs`의 `export_as_executable` 함수 순서 참조

### 2. 대용량 파일 직접 전달 금지
```typescript
// ❌ 잘못된 방법 (메모리 폭발)
data: Array.from(new Uint8Array(arrayBuffer))

// ✅ 올바른 방법 (10MB 이상)
path: await saveBlobToTempFile(blob, filename)
```
- `LARGE_FILE_THRESHOLD` (10MB) 이상은 반드시 임시 파일 사용
- ProductPage.tsx, BuilderPage.tsx의 JSDoc 주석 참조

### 3. 빌드 순서
```bash
npm run build:player  # 반드시 먼저!
npm run build:maker   # player.exe 임베드
```
- maker는 빌드 시점에 player.exe를 `include_bytes!`로 임베드
- player가 없거나 오래되면 내보내기 기능 오작동

## Video Compression (영상 압축)

### 개요
단일 실행파일 내보내기 시 영상 파일을 압축하여 파일 크기를 줄이는 기능.
FFmpeg를 사용하여 H.264 코덱으로 재인코딩.

### 사용법
1. "실행 파일 빌드" 버튼 클릭
2. 빌드 다이얼로그에서 "영상 압축" 토글 활성화
3. 압축 품질 및 해상도 설정
4. "빌드 시작" 클릭

### 압축 설정 (CompressionSettings)
```typescript
interface CompressionSettings {
  enabled: boolean           // 압축 활성화 여부
  quality: 'low' | 'medium' | 'high'  // 압축 품질
  maxHeight?: number         // 최대 해상도 (높이 기준)
}
```

### 품질별 CRF 값
- **low**: CRF 28, preset "faster" (작은 파일, 낮은 화질)
- **medium**: CRF 23, preset "medium" (균형, 권장)
- **high**: CRF 18, preset "slow" (높은 화질, 큰 파일)

### FFmpeg 요구사항
FFmpeg는 다음 순서로 검색됨:
1. `resources/ffmpeg.exe` (번들)
2. `src-tauri/resources/ffmpeg.exe` (개발)
3. 시스템 PATH

### 관련 파일
- `packages/tutorial-maker/src-tauri/src/video.rs`: FFmpeg 압축 모듈
- `packages/tutorial-maker/src/components/builder/BuildDialog.tsx`: 빌드 다이얼로그 UI
- `packages/shared/src/types/Project.ts`: CompressionSettings 타입

### 압축 흐름
1. 프론트엔드에서 CompressionSettings와 함께 export_as_executable 호출
2. Rust 백엔드에서 영상 파일 감지 (video/* MIME type)
3. FFmpeg로 H.264 재인코딩 (임시 파일)
4. 압축된 파일을 실행파일에 임베드
5. 임시 파일 정리
