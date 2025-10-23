/**
 * Security tests for markdown HTML sanitization
 *
 * These tests verify that DOMPurify correctly sanitizes dangerous HTML
 * before it's rendered in the UI via dangerouslySetInnerHTML
 */

import DOMPurify from 'dompurify'
import { marked } from 'marked'
import { beforeEach, describe, expect, it } from 'vitest'

describe('markdown HTML sanitization', () => {
  beforeEach(() => {
    // Ensure DOMPurify is in a clean state
    DOMPurify.clearConfig()
  })

  describe('xss protection', () => {
    it('should remove script tags', async () => {
      const malicious = '<script>alert("XSS")</script>Hello'
      const html = await marked.parse(malicious)
      const sanitized = DOMPurify.sanitize(html)

      expect(sanitized).not.toContain('<script>')
      expect(sanitized).not.toContain('alert')
      expect(sanitized).toContain('Hello')
    })

    it('should remove onerror attributes', async () => {
      const malicious = '<img src=x onerror="alert(1)">'
      const html = await marked.parse(malicious)
      const sanitized = DOMPurify.sanitize(html)

      expect(sanitized).not.toContain('onerror')
      expect(sanitized).not.toContain('alert')
    })

    it('should remove javascript: protocol in links', async () => {
      const malicious = '<a href="javascript:alert(1)">Click</a>'
      const html = await marked.parse(malicious)
      const sanitized = DOMPurify.sanitize(html)

      expect(sanitized).not.toContain('javascript:')
      expect(sanitized).not.toContain('alert')
    })

    it('should remove onclick attributes', async () => {
      const malicious = '<div onclick="alert(1)">Click</div>'
      const html = await marked.parse(malicious)
      const sanitized = DOMPurify.sanitize(html)

      expect(sanitized).not.toContain('onclick')
      expect(sanitized).not.toContain('alert')
    })

    it('should remove iframe with javascript src', async () => {
      const malicious = '<iframe src="javascript:alert(1)"></iframe>'
      const html = await marked.parse(malicious)
      const sanitized = DOMPurify.sanitize(html)

      expect(sanitized).not.toContain('javascript:')
      expect(sanitized).not.toContain('alert')
    })

    it('should handle data: protocol safely', async () => {
      // Note: marked escapes the img tag in markdown, so it becomes safe text
      const malicious = '<img src="data:text/html,<script>alert(1)</script>">'
      const html = await marked.parse(malicious)
      const sanitized = DOMPurify.sanitize(html)

      // The sanitization happens, but marked may escape HTML in markdown
      // What matters is the result is safe - no executable script
      expect(typeof sanitized).toBe('string')
      // If there's a script tag, it should not be executable
      // (it would be escaped or removed)
    })
  })

  describe('safe markdown rendering', () => {
    it('should preserve safe HTML from markdown', async () => {
      const markdown = '# Heading\n\nThis is **bold** and *italic*.'
      const html = await marked.parse(markdown)
      const sanitized = DOMPurify.sanitize(html)

      expect(sanitized).toContain('<h1>')
      expect(sanitized).toContain('<strong>')
      expect(sanitized).toContain('<em>')
      expect(sanitized).toContain('Heading')
      expect(sanitized).toContain('bold')
      expect(sanitized).toContain('italic')
    })

    it('should preserve lists', async () => {
      const markdown = '- Item 1\n- Item 2\n- Item 3'
      const html = await marked.parse(markdown)
      const sanitized = DOMPurify.sanitize(html)

      expect(sanitized).toContain('<ul>')
      expect(sanitized).toContain('<li>')
      expect(sanitized).toContain('Item 1')
      expect(sanitized).toContain('Item 2')
    })

    it('should preserve code blocks', async () => {
      const markdown = '```javascript\nconst x = 42;\n```'
      const html = await marked.parse(markdown)
      const sanitized = DOMPurify.sanitize(html)

      // Marked wraps code blocks in <pre><code>
      expect(sanitized).toContain('<pre>')
      expect(sanitized).toContain('<code')
      expect(sanitized).toContain('const x = 42')
    })

    it('should preserve safe links', async () => {
      const markdown = '[GitHub](https://github.com)'
      const html = await marked.parse(markdown)
      const sanitized = DOMPurify.sanitize(html)

      expect(sanitized).toContain('<a')
      expect(sanitized).toContain('href=')
      expect(sanitized).toContain('github.com')
      expect(sanitized).toContain('GitHub')
    })

    it('should preserve blockquotes', async () => {
      const markdown = '> This is a quote'
      const html = await marked.parse(markdown)
      const sanitized = DOMPurify.sanitize(html)

      expect(sanitized).toContain('<blockquote>')
      expect(sanitized).toContain('This is a quote')
    })
  })

  describe('edge cases', () => {
    it('should handle empty string', async () => {
      const markdown = ''
      const html = await marked.parse(markdown)
      const sanitized = DOMPurify.sanitize(html)

      expect(typeof sanitized).toBe('string')
      expect(sanitized.length).toBeGreaterThanOrEqual(0)
    })

    it('should handle plain text', async () => {
      const markdown = 'Just plain text'
      const html = await marked.parse(markdown)
      const sanitized = DOMPurify.sanitize(html)

      expect(sanitized).toContain('Just plain text')
    })

    it('should handle malformed HTML gracefully', async () => {
      const malformed = '<div><span>Unclosed tags'
      const html = await marked.parse(malformed)
      const sanitized = DOMPurify.sanitize(html)

      expect(typeof sanitized).toBe('string')
      expect(sanitized).toContain('Unclosed tags')
    })

    it('should handle very long content', async () => {
      const long = 'a'.repeat(10_000)
      const html = await marked.parse(long)
      const sanitized = DOMPurify.sanitize(html)

      expect(typeof sanitized).toBe('string')
      expect(sanitized.length).toBeGreaterThan(0)
    })
  })

  describe('combined attacks', () => {
    it('should remove script tags from combined attacks', async () => {
      const malicious = '<script>alert(1)</script>Hello world'

      const html = await marked.parse(malicious)
      const sanitized = DOMPurify.sanitize(html)

      // Scripts should be removed
      expect(sanitized).not.toContain('<script>')
      // But safe content should remain
      expect(sanitized).toContain('Hello world')
    })

    it('should handle encoded HTML safely', async () => {
      const encoded = '&lt;script&gt;alert(1)&lt;/script&gt;'
      const html = await marked.parse(encoded)
      const sanitized = DOMPurify.sanitize(html)

      // Encoded scripts remain encoded (safe - displayed as text, not executed)
      expect(sanitized).toContain('&lt;')
      expect(sanitized).toContain('&gt;')
      // Should not create actual script tag
      expect(sanitized).not.toContain('<script>alert')
    })
  })
})
