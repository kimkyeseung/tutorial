/**
 * 윈도우 관련 유틸리티 함수들
 */

/**
 * HTML 문서의 파비콘을 동적으로 설정
 * @param iconUrl - 파비콘으로 사용할 이미지 URL (blob URL 또는 일반 URL)
 */
export function setFavicon(iconUrl: string): void {
  // 기존 파비콘 링크 찾기 또는 새로 생성
  let link = document.querySelector<HTMLLinkElement>("link[rel*='icon']");
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }
  link.type = "image/png";
  link.href = iconUrl;
}

/**
 * HTML 문서 타이틀 설정
 * @param title - 설정할 타이틀
 */
export function setDocumentTitle(title: string): void {
  document.title = title;
}
