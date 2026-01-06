import React from "react";
import type { PageButton } from "../../types/project";

type PageButtonProps = {
  button: PageButton;
  imageUrl?: string;
  onClick: () => void;
  isVisible: boolean;
  showDebugInfo?: boolean;
  totalPages?: number;
};

const PageButtonComponent: React.FC<PageButtonProps> = ({
  button,
  imageUrl,
  onClick,
  isVisible,
  showDebugInfo = false,
  totalPages: _totalPages = 0,
}) => {
  // 디버그 모드에서는 항상 표시
  if (!isVisible && !showDebugInfo) return null;

  const getActionLabel = () => {
    if (button.action.type === "next") {
      return "→ 다음";
    } else if (
      button.action.type === "goto" &&
      button.action.targetPageId !== undefined
    ) {
      const targetPage = parseInt(button.action.targetPageId) + 1;
      return `→ ${targetPage}페이지`;
    }
    return "";
  };

  const getTimingLabel = () => {
    return button.showTiming === "immediate" ? "즉시" : "영상 후";
  };

  return (
    <button
      onClick={onClick}
      className="absolute cursor-pointer"
      style={{
        left: `${button.position.x}%`,
        top: `${button.position.y}%`,
        width: `${button.size.width}%`,
        height: `${button.size.height}%`,
        backgroundImage: imageUrl ? `url(${imageUrl})` : undefined,
        backgroundSize: "contain",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundColor: !imageUrl ? "rgba(59, 130, 246, 0.7)" : "transparent",
        border: showDebugInfo ? "2px solid #3b82f6" : "none",
        outline: "none",
        opacity: !isVisible && showDebugInfo ? 0.5 : 1,
      }}
      aria-label="Navigation button"
    >
      {showDebugInfo && (
        <div
          className="pointer-events-none absolute left-0 top-0 whitespace-nowrap rounded bg-blue-600 px-1 text-xs text-white"
          style={{ transform: "translateY(-100%)" }}
        >
          버튼 {getActionLabel()} ({getTimingLabel()})
        </div>
      )}
    </button>
  );
};

export default PageButtonComponent;
