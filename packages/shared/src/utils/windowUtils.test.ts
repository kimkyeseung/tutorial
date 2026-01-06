import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { setFavicon, setDocumentTitle } from './windowUtils'

describe('windowUtils', () => {
  describe('setDocumentTitle', () => {
    const originalTitle = document.title

    afterEach(() => {
      document.title = originalTitle
    })

    it('문서 타이틀을 설정해야 한다', () => {
      setDocumentTitle('테스트 타이틀')
      expect(document.title).toBe('테스트 타이틀')
    })

    it('빈 문자열도 설정 가능해야 한다', () => {
      setDocumentTitle('')
      expect(document.title).toBe('')
    })

    it('특수문자가 포함된 타이틀도 설정 가능해야 한다', () => {
      setDocumentTitle('부산 갑옷 - 전시회 (2024)')
      expect(document.title).toBe('부산 갑옷 - 전시회 (2024)')
    })
  })

  describe('setFavicon', () => {
    let existingLinks: HTMLLinkElement[] = []

    beforeEach(() => {
      // 기존 파비콘 링크들 저장
      existingLinks = Array.from(
        document.querySelectorAll<HTMLLinkElement>("link[rel*='icon']")
      )
      // 기존 파비콘 링크들 제거
      existingLinks.forEach((link) => link.remove())
    })

    afterEach(() => {
      // 테스트에서 추가한 파비콘 링크 제거
      const testLinks = document.querySelectorAll<HTMLLinkElement>(
        "link[rel*='icon']"
      )
      testLinks.forEach((link) => link.remove())

      // 기존 링크들 복원
      existingLinks.forEach((link) => document.head.appendChild(link))
    })

    it('파비콘 링크가 없으면 새로 생성해야 한다', () => {
      const iconUrl = 'blob:http://localhost/test-icon'

      setFavicon(iconUrl)

      const link = document.querySelector<HTMLLinkElement>("link[rel*='icon']")
      expect(link).not.toBeNull()
      expect(link?.href).toBe(iconUrl)
      expect(link?.type).toBe('image/png')
      expect(link?.rel).toBe('icon')
    })

    it('기존 파비콘 링크가 있으면 업데이트해야 한다', () => {
      // 기존 링크 생성
      const existingLink = document.createElement('link')
      existingLink.rel = 'icon'
      existingLink.href = 'old-icon.png'
      document.head.appendChild(existingLink)

      const newIconUrl = 'blob:http://localhost/new-icon'
      setFavicon(newIconUrl)

      const links = document.querySelectorAll<HTMLLinkElement>(
        "link[rel*='icon']"
      )
      expect(links.length).toBe(1)
      expect(links[0].href).toBe(newIconUrl)
    })

    it('다양한 URL 형식을 지원해야 한다', () => {
      const urls = [
        'blob:http://localhost/test',
        'data:image/png;base64,iVBORw0KGgo=',
        '/assets/icon.png',
        'https://example.com/icon.png',
      ]

      urls.forEach((url) => {
        setFavicon(url)
        const link = document.querySelector<HTMLLinkElement>(
          "link[rel*='icon']"
        )
        expect(link?.href).toContain(url.includes('://') ? url : url)
      })
    })

    it('shortcut icon rel 속성이 있는 기존 링크도 찾아야 한다', () => {
      // shortcut icon 형식의 기존 링크 생성
      const existingLink = document.createElement('link')
      existingLink.rel = 'shortcut icon'
      existingLink.href = 'old-icon.ico'
      document.head.appendChild(existingLink)

      const newIconUrl = 'blob:http://localhost/new-icon'
      setFavicon(newIconUrl)

      // 기존 링크가 업데이트되어야 함
      expect(existingLink.href).toBe(newIconUrl)
    })
  })
})
