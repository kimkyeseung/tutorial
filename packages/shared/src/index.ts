// Types
export * from "./types/project";

// Hooks
export { usePageNavigation } from "./hooks/usePageNavigation";
export { useTutorialViewer } from "./hooks/useTutorialViewer";

// Common Components
export { Footer, ConfirmDialog } from "./components/common";

// Product Components
export {
  VideoPlayer,
  PageButton as PageButtonComponent,
  TouchAreaComponent,
  ControlOverlay,
  EntryPage,
  LoadingScreen,
  ErrorScreen,
  ProductPageContent,
} from "./components/product";
export type { ProductPageContentProps } from "./components/product";

// Utils
export {
  loadTutorialFile,
  loadTutorialFromFile,
  createMediaUrls,
  revokeMediaUrls,
} from "./utils/tutorialLoader";
export {
  createRecentFilesManager,
  makerRecentFiles,
  viewerRecentFiles,
  type RecentFile,
} from "./utils/recentFiles";
