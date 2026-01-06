import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import DebugOverlay from "./DebugOverlay";
import type { Page } from "../../types/project";
import type { VideoDebugInfo } from "./VideoPlayer";

// Test fixtures
const createTestPage = (overrides: Partial<Page> = {}): Page => ({
  id: "test-page",
  title: "",
  order: 0,
  mediaType: "video",
  mediaId: "media-1",
  playType: "single",
  playCount: 1,
  buttons: [],
  touchAreas: [],
  ...overrides,
});

const createVideoDebugInfo = (
  overrides: Partial<VideoDebugInfo> = {},
): VideoDebugInfo => ({
  currentTime: 30,
  duration: 120,
  loopCount: 0,
  isPlaying: true,
  ...overrides,
});

describe("DebugOverlay", () => {
  describe("page info display", () => {
    it("should display page number and total pages", () => {
      const page = createTestPage();
      render(
        <DebugOverlay
          page={page}
          pageIndex={2}
          totalPages={5}
          videoDebugInfo={null}
        />,
      );

      expect(screen.getByText("3/5")).toBeInTheDocument();
    });

    it("should display custom page title when provided", () => {
      const page = createTestPage({ title: "소개 페이지" });
      render(
        <DebugOverlay
          page={page}
          pageIndex={0}
          totalPages={3}
          videoDebugInfo={null}
        />,
      );

      expect(screen.getByText(/소개 페이지/)).toBeInTheDocument();
    });

    it("should display default page title when not provided", () => {
      const page = createTestPage({ title: "" });
      render(
        <DebugOverlay
          page={page}
          pageIndex={1}
          totalPages={3}
          videoDebugInfo={null}
        />,
      );

      expect(screen.getByText(/페이지 2/)).toBeInTheDocument();
    });

    it("should display video icon for video media type", () => {
      const page = createTestPage({ mediaType: "video" });
      render(
        <DebugOverlay
          page={page}
          pageIndex={0}
          totalPages={1}
          videoDebugInfo={null}
        />,
      );

      expect(screen.getByText(/🎥/)).toBeInTheDocument();
    });

    it("should display image icon for image media type", () => {
      const page = createTestPage({ mediaType: "image" });
      render(
        <DebugOverlay
          page={page}
          pageIndex={0}
          totalPages={1}
          videoDebugInfo={null}
        />,
      );

      expect(screen.getByText(/🖼️/)).toBeInTheDocument();
    });
  });

  describe("play type badge", () => {
    it("should display loop badge for loop playType", () => {
      const page = createTestPage({ playType: "loop" });
      render(
        <DebugOverlay
          page={page}
          pageIndex={0}
          totalPages={1}
          videoDebugInfo={null}
        />,
      );

      expect(screen.getByText("반복")).toBeInTheDocument();
    });

    it("should display play count badge for single playType with 1 play", () => {
      const page = createTestPage({ playType: "single", playCount: 1 });
      render(
        <DebugOverlay
          page={page}
          pageIndex={0}
          totalPages={1}
          videoDebugInfo={null}
        />,
      );

      expect(screen.getByText("1회")).toBeInTheDocument();
    });

    it("should display play count badge for single playType with multiple plays", () => {
      const page = createTestPage({ playType: "single", playCount: 3 });
      render(
        <DebugOverlay
          page={page}
          pageIndex={0}
          totalPages={1}
          videoDebugInfo={null}
        />,
      );

      expect(screen.getByText("3회")).toBeInTheDocument();
    });
  });

  describe("button and touch area counts", () => {
    it("should display button count", () => {
      const page = createTestPage({
        buttons: [
          {
            id: "btn-1",
            imageId: "img-1",
            position: { x: 10, y: 10 },
            size: { width: 20, height: 20 },
            action: { type: "next" },
            showTiming: "immediate",
          },
          {
            id: "btn-2",
            imageId: "img-2",
            position: { x: 30, y: 30 },
            size: { width: 20, height: 20 },
            action: { type: "next" },
            showTiming: "immediate",
          },
        ],
      });
      render(
        <DebugOverlay
          page={page}
          pageIndex={0}
          totalPages={1}
          videoDebugInfo={null}
        />,
      );

      expect(screen.getByText("2개")).toBeInTheDocument();
    });

    it("should display touch area count", () => {
      const page = createTestPage({
        touchAreas: [
          {
            id: "touch-1",
            position: { x: 10, y: 10 },
            size: { width: 20, height: 20 },
            action: { type: "next" },
            showTiming: "immediate",
          },
        ],
      });
      render(
        <DebugOverlay
          page={page}
          pageIndex={0}
          totalPages={1}
          videoDebugInfo={null}
        />,
      );

      // 버튼은 0개, 터치영역은 1개
      const counts = screen.getAllByText(/\d+개/);
      expect(counts.length).toBe(2); // 버튼, 터치영역
    });
  });

  describe("media size display", () => {
    it("should display media size in MB", () => {
      const page = createTestPage();
      render(
        <DebugOverlay
          page={page}
          pageIndex={0}
          totalPages={1}
          videoDebugInfo={null}
          mediaSize={5 * 1024 * 1024} // 5MB
        />,
      );

      expect(screen.getByText("5.0 MB")).toBeInTheDocument();
    });

    it("should display media size in KB", () => {
      const page = createTestPage();
      render(
        <DebugOverlay
          page={page}
          pageIndex={0}
          totalPages={1}
          videoDebugInfo={null}
          mediaSize={500 * 1024} // 500KB
        />,
      );

      expect(screen.getByText("500.0 KB")).toBeInTheDocument();
    });

    it("should not display size when mediaSize is not provided", () => {
      const page = createTestPage();
      render(
        <DebugOverlay
          page={page}
          pageIndex={0}
          totalPages={1}
          videoDebugInfo={null}
        />,
      );

      expect(screen.queryByText(/용량:/)).not.toBeInTheDocument();
    });
  });

  describe("video debug info", () => {
    it("should display video playback info for video media", () => {
      const page = createTestPage({ mediaType: "video" });
      const videoInfo = createVideoDebugInfo({
        currentTime: 65, // 1:05
        duration: 180, // 3:00
      });
      render(
        <DebugOverlay
          page={page}
          pageIndex={0}
          totalPages={1}
          videoDebugInfo={videoInfo}
        />,
      );

      expect(screen.getByText("🎬 재생 정보")).toBeInTheDocument();
      expect(screen.getByText("01:05 / 03:00")).toBeInTheDocument();
    });

    it("should display progress percentage", () => {
      const page = createTestPage({ mediaType: "video" });
      const videoInfo = createVideoDebugInfo({
        currentTime: 60,
        duration: 120,
      });
      render(
        <DebugOverlay
          page={page}
          pageIndex={0}
          totalPages={1}
          videoDebugInfo={videoInfo}
        />,
      );

      expect(screen.getByText("50%")).toBeInTheDocument();
    });

    it("should display playing status when video is playing", () => {
      const page = createTestPage({ mediaType: "video" });
      const videoInfo = createVideoDebugInfo({ isPlaying: true });
      render(
        <DebugOverlay
          page={page}
          pageIndex={0}
          totalPages={1}
          videoDebugInfo={videoInfo}
        />,
      );

      expect(screen.getByText("▶ 재생 중")).toBeInTheDocument();
    });

    it("should display paused status when video is paused", () => {
      const page = createTestPage({ mediaType: "video" });
      const videoInfo = createVideoDebugInfo({ isPlaying: false });
      render(
        <DebugOverlay
          page={page}
          pageIndex={0}
          totalPages={1}
          videoDebugInfo={videoInfo}
        />,
      );

      expect(screen.getByText("⏸ 일시정지")).toBeInTheDocument();
    });

    it("should not display video info for image media", () => {
      const page = createTestPage({ mediaType: "image" });
      const videoInfo = createVideoDebugInfo();
      render(
        <DebugOverlay
          page={page}
          pageIndex={0}
          totalPages={1}
          videoDebugInfo={videoInfo}
        />,
      );

      expect(screen.queryByText("🎬 재생 정보")).not.toBeInTheDocument();
    });
  });

  describe("loop count display", () => {
    it("should display loop count for loop playType", () => {
      const page = createTestPage({ playType: "loop" });
      const videoInfo = createVideoDebugInfo({ loopCount: 3 });
      render(
        <DebugOverlay
          page={page}
          pageIndex={0}
          totalPages={1}
          videoDebugInfo={videoInfo}
        />,
      );

      expect(screen.getByText("3회")).toBeInTheDocument();
    });

    it("should display loop count for single playType when loopCount > 0", () => {
      const page = createTestPage({ playType: "single", playCount: 3 });
      const videoInfo = createVideoDebugInfo({ loopCount: 2 });
      render(
        <DebugOverlay
          page={page}
          pageIndex={0}
          totalPages={1}
          videoDebugInfo={videoInfo}
        />,
      );

      // 반복 횟수가 표시되어야 함
      expect(screen.getByText("2회")).toBeInTheDocument();
    });

    it("should not display loop count for single playType when loopCount is 0", () => {
      const page = createTestPage({ playType: "single", playCount: 1 });
      const videoInfo = createVideoDebugInfo({ loopCount: 0 });
      render(
        <DebugOverlay
          page={page}
          pageIndex={0}
          totalPages={1}
          videoDebugInfo={videoInfo}
        />,
      );

      // 반복 횟수 라벨이 표시되지 않아야 함
      expect(screen.queryByText("반복 횟수:")).not.toBeInTheDocument();
    });
  });

  describe("keyboard shortcut hint", () => {
    it("should display keyboard shortcut hint", () => {
      const page = createTestPage();
      render(
        <DebugOverlay
          page={page}
          pageIndex={0}
          totalPages={1}
          videoDebugInfo={null}
        />,
      );

      expect(screen.getByText(/키로 디버그 정보 숨기기/)).toBeInTheDocument();
    });
  });
});
