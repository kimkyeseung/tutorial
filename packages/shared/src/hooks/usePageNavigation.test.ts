import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePageNavigation } from "./usePageNavigation";
import type { Project } from "../types/project";

// Test fixtures
const createTestProject = (
  pageCount: number,
  options: Partial<Project["settings"]> = {},
): Project => ({
  id: "test-project",
  name: "Test Project",
  description: "Test description",
  appTitle: "Test App",
  pages: Array.from({ length: pageCount }, (_, i) => ({
    id: `page-${i}`,
    title: `Page ${i + 1}`,
    order: i,
    mediaType: "video" as const,
    mediaId: `media-${i}`,
    playType: "single" as const,
    buttons: [],
    touchAreas: [],
  })),
  settings: {
    windowWidth: 1920,
    windowHeight: 1080,
    fullscreen: false,
    showProgress: true,
    showHomeButton: true,
    showBackButton: true,
    loopAtEnd: false,
    ...options,
  },
  createdAt: Date.now(),
  updatedAt: Date.now(),
});

describe("usePageNavigation", () => {
  describe("initial state", () => {
    it("should start at page 0", () => {
      const project = createTestProject(5);
      const { result } = renderHook(() => usePageNavigation(project));

      expect(result.current.currentPageIndex).toBe(0);
      expect(result.current.currentPage?.id).toBe("page-0");
    });

    it("should handle null project", () => {
      const { result } = renderHook(() => usePageNavigation(null));

      expect(result.current.currentPageIndex).toBe(0);
      expect(result.current.currentPage).toBeNull();
    });
  });

  describe("goToNextPage", () => {
    it("should advance to next page", () => {
      const project = createTestProject(5);
      const { result } = renderHook(() => usePageNavigation(project));

      act(() => {
        result.current.goToNextPage();
      });

      expect(result.current.currentPageIndex).toBe(1);
    });

    it("should not go past last page when loopAtEnd is false", () => {
      const project = createTestProject(3, { loopAtEnd: false });
      const { result } = renderHook(() => usePageNavigation(project));

      act(() => {
        result.current.goToNextPage();
      });
      act(() => {
        result.current.goToNextPage();
      });
      act(() => {
        result.current.goToNextPage(); // Should stay at page 2
      });
      act(() => {
        result.current.goToNextPage();
      });

      expect(result.current.currentPageIndex).toBe(2);
    });

    it("should loop to first page when loopAtEnd is true", () => {
      const project = createTestProject(3, { loopAtEnd: true });
      const { result } = renderHook(() => usePageNavigation(project));

      act(() => {
        result.current.goToNextPage(); // page 1
      });
      act(() => {
        result.current.goToNextPage(); // page 2
      });
      act(() => {
        result.current.goToNextPage(); // should loop to page 0
      });

      expect(result.current.currentPageIndex).toBe(0);
    });
  });

  describe("goToPreviousPage", () => {
    it("should go to previous page", () => {
      const project = createTestProject(5);
      const { result } = renderHook(() => usePageNavigation(project));

      act(() => {
        result.current.goToNextPage();
      });
      act(() => {
        result.current.goToNextPage();
      });
      act(() => {
        result.current.goToPreviousPage();
      });

      expect(result.current.currentPageIndex).toBe(1);
    });

    it("should not go before first page", () => {
      const project = createTestProject(5);
      const { result } = renderHook(() => usePageNavigation(project));

      act(() => {
        result.current.goToPreviousPage();
      });
      act(() => {
        result.current.goToPreviousPage();
      });

      expect(result.current.currentPageIndex).toBe(0);
    });
  });

  describe("goToHome", () => {
    it("should go to first page", () => {
      const project = createTestProject(5);
      const { result } = renderHook(() => usePageNavigation(project));

      act(() => {
        result.current.goToNextPage();
      });
      act(() => {
        result.current.goToNextPage();
      });
      act(() => {
        result.current.goToNextPage();
      });
      act(() => {
        result.current.goToHome();
      });

      expect(result.current.currentPageIndex).toBe(0);
    });
  });

  describe("goToPage", () => {
    it("should go to specified page", () => {
      const project = createTestProject(5);
      const { result } = renderHook(() => usePageNavigation(project));

      act(() => {
        result.current.goToPage(3);
      });

      expect(result.current.currentPageIndex).toBe(3);
    });

    it("should ignore invalid page index (negative)", () => {
      const project = createTestProject(5);
      const { result } = renderHook(() => usePageNavigation(project));

      act(() => {
        result.current.goToPage(2);
      });
      act(() => {
        result.current.goToPage(-1);
      });

      expect(result.current.currentPageIndex).toBe(2);
    });

    it("should ignore invalid page index (too large)", () => {
      const project = createTestProject(5);
      const { result } = renderHook(() => usePageNavigation(project));

      act(() => {
        result.current.goToPage(2);
      });
      act(() => {
        result.current.goToPage(10);
      });

      expect(result.current.currentPageIndex).toBe(2);
    });
  });

  describe("mountedPages", () => {
    it("should include current page in mounted pages", () => {
      const project = createTestProject(5);
      const { result } = renderHook(() => usePageNavigation(project));

      expect(result.current.mountedPages.has(0)).toBe(true);
    });

    it("should include next page in mounted pages", () => {
      const project = createTestProject(5);
      const { result } = renderHook(() => usePageNavigation(project));

      // After initial render, should mount page 0 and connected pages (page 1)
      expect(result.current.mountedPages.has(0)).toBe(true);
      expect(result.current.mountedPages.has(1)).toBe(true);
    });

    it("should include first page when on last page with loopAtEnd", () => {
      const project = createTestProject(3, { loopAtEnd: true });
      const { result } = renderHook(() => usePageNavigation(project));

      act(() => {
        result.current.goToPage(2); // Go to last page
      });

      expect(result.current.mountedPages.has(2)).toBe(true);
      expect(result.current.mountedPages.has(0)).toBe(true); // Should preload first page
    });
  });

  describe("with button goto actions", () => {
    it("should include goto target pages in mounted pages", () => {
      const project = createTestProject(5);
      // Add a button with goto action to page 4
      project.pages[0].buttons.push({
        id: "btn-1",
        imageId: "img-1",
        position: { x: 50, y: 50 },
        size: { width: 10, height: 10 },
        action: { type: "goto", targetPageId: "4" },
        showTiming: "immediate",
      });

      const { result } = renderHook(() => usePageNavigation(project));

      expect(result.current.mountedPages.has(0)).toBe(true);
      expect(result.current.mountedPages.has(1)).toBe(true); // next page
      expect(result.current.mountedPages.has(4)).toBe(true); // goto target
    });
  });

  describe("with touchArea goto actions", () => {
    it("should include goto target pages in mounted pages", () => {
      const project = createTestProject(5);
      // Add a touch area with goto action to page 3
      project.pages[0].touchAreas.push({
        id: "touch-1",
        position: { x: 50, y: 50 },
        size: { width: 20, height: 20 },
        action: { type: "goto", targetPageId: "3" },
        showTiming: "immediate",
      });

      const { result } = renderHook(() => usePageNavigation(project));

      expect(result.current.mountedPages.has(0)).toBe(true);
      expect(result.current.mountedPages.has(1)).toBe(true); // next page
      expect(result.current.mountedPages.has(3)).toBe(true); // goto target
    });
  });
});
