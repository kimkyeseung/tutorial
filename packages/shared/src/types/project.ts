export interface Project {
  id: string;
  name: string;
  description: string;
  appIcon?: string;
  appTitle: string;
  pages: Page[];
  settings: ProjectSettings;
  createdAt: number;
  updatedAt: number;
}

export interface ProjectSettings {
  windowWidth: number;
  windowHeight: number;
  fullscreen: boolean;
  exitKey?: string;
  showProgress: boolean;
  showHomeButton: boolean;
  showBackButton: boolean;
  loopAtEnd: boolean;
}

/** 영상 압축 품질 */
export type CompressionQuality = "low" | "medium" | "high";

/** 영상 압축 설정 */
export interface CompressionSettings {
  /** 압축 활성화 여부 */
  enabled: boolean;
  /** 압축 품질 (low: 저용량, medium: 균형, high: 고품질) */
  quality: CompressionQuality;
  /** 최대 해상도 (높이 기준, 예: 1080, 720, 480). undefined면 원본 유지 */
  maxHeight?: number;
}

export interface Page {
  id: string;
  title: string;
  order: number;
  mediaType: "video" | "image";
  mediaId: string;
  playType: "loop" | "single";
  playCount?: number;
  buttons: PageButton[];
  touchAreas: TouchArea[];
}

export interface PageButton {
  id: string;
  imageId: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  action: NavigationAction;
  showTiming: "immediate" | "after-video";
}

export interface TouchArea {
  id: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  action: NavigationAction;
  showTiming: "immediate" | "after-video";
  debugVisible?: boolean;
}

export interface NavigationAction {
  type: "next" | "goto";
  targetPageId?: string;
}

export interface StoredMedia {
  id: string;
  name: string;
  blob: Blob;
  type: "video" | "image" | "button" | "icon";
  createdAt: number;
  thumbnailBlob?: Blob; // 동영상 썸네일 (첫 프레임)
}

export interface EmbeddedMedia {
  id: string;
  name: string;
  mimeType: string;
  base64: string;
}

export interface BuildProject extends Omit<Project, "appIcon"> {
  embeddedMedia: EmbeddedMedia[];
  appIconBase64?: string;
}

export interface MediaManifestEntry {
  id: string;
  name: string;
  mimeType: string;
  offset: number;
  size: number;
}

export interface BuildManifest {
  projectJsonOffset: number;
  projectJsonSize: number;
  media: MediaManifestEntry[];
  appIconOffset?: number;
  appIconSize?: number;
}

export interface MediaBuildInfo {
  id: string;
  name: string;
  mimeType: string;
  filePath: string;
}

export interface BinaryBuildRequest {
  project: Omit<Project, "appIcon">;
  mediaFiles: MediaBuildInfo[];
  appIconPath?: string;
}

export interface TutorialManifest {
  version: string;
  formatVersion: number;
  createdAt: number;
  createdWith: string;
  projectName: string;
}

export interface LoadedTutorial {
  manifest: TutorialManifest;
  project: Project;
  mediaBlobs: Record<string, Blob>;
  buttonBlobs: Record<string, Blob>;
  iconBlob?: Blob;
}
