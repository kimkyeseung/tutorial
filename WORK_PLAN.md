# 단일 실행파일 Export 기능 구현 계획

## 개요
tutorial-viewer에서 .tutorial 파일을 열고, 해당 튜토리얼을 단일 실행파일(.exe)로 내보내는 기능 구현

## 아키텍처

### 바이너리 구조
```
┌────────────────────────────────────┐
│         Generated exe              │
├────────────────────────────────────┤
│  [Original viewer binary]          │
│  [Media files (video/image)]       │
│  [Button images]                   │
│  [App icon]                        │
│  [Project JSON]                    │
│  [Build Manifest JSON]             │
│  [Manifest size: 8 bytes]          │
│  [Magic: "VISTUT_V1" (9 bytes)]    │
└────────────────────────────────────┘
```

### 데이터 흐름
1. 사용자가 .tutorial 파일 열기
2. "실행파일로 내보내기" 버튼 클릭
3. 저장 위치 선택 다이얼로그
4. Rust 백엔드에서:
   - 현재 실행중인 viewer exe 복사
   - 튜토리얼 데이터를 끝에 append
   - 매니페스트 작성
5. 완료 알림

---

## 체크리스트

### Phase 1: Rust 백엔드 - 임베딩된 데이터 읽기
- [x] 1.1. `src-tauri/src/lib.rs`에 embedded 모듈 추가
- [x] 1.2. 자기 자신(exe)에서 매직 바이트 확인 함수
- [x] 1.3. 매니페스트 읽기 함수
- [x] 1.4. 임베딩된 프로젝트 JSON 읽기
- [x] 1.5. 임베딩된 미디어 파일 읽기
- [x] 1.6. Tauri command로 노출: `get_embedded_project`
- [x] 1.7. Tauri command로 노출: `get_embedded_media`

### Phase 2: Rust 백엔드 - 실행파일 생성
- [x] 2.1. 현재 exe 경로 가져오기
- [x] 2.2. exe 파일 복사 함수
- [x] 2.3. 바이너리 데이터 append 함수
- [x] 2.4. 매니페스트 생성 및 기록
- [x] 2.5. 매직 바이트 기록
- [x] 2.6. Tauri command: `export_as_executable`
  - 입력: 저장 경로, 프로젝트 JSON, 미디어 파일 경로들
  - 출력: 성공/실패

### Phase 3: 프론트엔드 - UI
- [x] 3.1. EntryPage에 "실행파일로 내보내기" 버튼 추가
- [x] 3.2. 저장 다이얼로그 연동 (tauri-plugin-dialog)
- [x] 3.3. export_as_executable 호출
- [x] 3.4. 진행 상태 표시 (로딩)
- [x] 3.5. 완료/실패 알림

### Phase 4: 앱 시작 시 임베딩 감지
- [x] 4.1. App.tsx에서 임베딩된 데이터 확인
- [x] 4.2. 임베딩된 경우: 바로 ProductPageContent로 이동
- [x] 4.3. 임베딩되지 않은 경우: 기존 ViewerPage 표시

### Phase 5: 테스트 및 마무리
- [x] 5.1. 빌드 테스트 (Windows) - 완료!
- [ ] 5.2. export된 exe 실행 테스트 (수동 테스트 필요)
- [ ] 5.3. 다양한 크기의 미디어로 테스트 (수동 테스트 필요)
- [ ] 5.4. 에러 핸들링 검증 (수동 테스트 필요)

---

## 파일 변경 목록

### 새로 생성
- `packages/tutorial-viewer/src-tauri/src/embedded.rs` - 임베딩 로직

### 수정
- `packages/tutorial-viewer/src-tauri/src/lib.rs` - 모듈 등록, commands
- `packages/tutorial-viewer/src-tauri/Cargo.toml` - 필요시 의존성 추가
- `packages/tutorial-viewer/src/App.tsx` - 임베딩 감지 로직
- `packages/shared/src/components/product/EntryPage.tsx` - Export 버튼

---

## 현재 진행 상황

**시작 시간:** 2024-12-29
**현재 Phase:** 5 (테스트 및 마무리)
**마지막 완료:** Phase 1, 2, 3, 4

---

## 참고 사항

### 매직 바이트
- 값: `VISTUT_V1` (9 bytes)
- 위치: 파일 끝
- 용도: 임베딩된 데이터 존재 여부 확인

### BuildManifest 구조 (이미 정의됨)
```typescript
interface BuildManifest {
  projectJsonOffset: number
  projectJsonSize: number
  media: MediaManifestEntry[]
  appIconOffset?: number
  appIconSize?: number
}
```

### 의존성
- Rust std::fs (파일 I/O)
- Rust std::env (exe 경로)
- tauri::command (프론트엔드 연동)
