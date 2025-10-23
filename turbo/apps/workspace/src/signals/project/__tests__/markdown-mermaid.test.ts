import { beforeEach, describe, expect, it } from 'vitest'
import { testContext } from '../../__tests__/context'
import { setupProjectPage } from '../../../views/project/test-helpers'
import { setupMock } from '../../test-utils'
import { selectedFileContentHtml$ } from '../project'

// Setup Clerk mock
setupMock()

describe('markdown mermaid rendering', () => {
  const projectId = 'test-project-mermaid-123'
  let context = testContext()

  beforeEach(() => {
    context = testContext()
  })

  describe('selectedFileContentHtml$', () => {
    it('should render plain markdown without mermaid', async () => {
      await setupProjectPage(`/projects/${projectId}?file=plain.md`, context, {
        projectId,
        files: [
          {
            path: 'plain.md',
            hash: 'plain-hash',
            content: '# Hello\n\nThis is plain markdown.',
          },
        ],
      })

      const html = await context.store.get(selectedFileContentHtml$)

      expect(html).toContain('Hello')
      expect(html).toContain('This is plain markdown')
      // Should not contain SVG elements
      expect(html).not.toContain('<svg')
    })

    it('should render markdown with mermaid diagram', async () => {
      await setupProjectPage(
        `/projects/${projectId}?file=diagram.md`,
        context,
        {
          projectId,
          files: [
            {
              path: 'diagram.md',
              hash: 'diagram-hash',
              content:
                '# Diagram\n\n```mermaid\ngraph TD\n    A-->B\n```\n\nEnd.',
            },
          ],
        },
      )

      const html = await context.store.get(selectedFileContentHtml$)

      // Verify the SVG is in the output
      expect(html).toContain('<svg')
      expect(html).toContain('Diagram')
      expect(html).toContain('End')
      // Verify it's not a code block anymore
      expect(html).not.toContain('<pre><code class="language-mermaid">')
    })

    it('should render multiple mermaid diagrams', async () => {
      await setupProjectPage(
        `/projects/${projectId}?file=multi-diagram.md`,
        context,
        {
          projectId,
          files: [
            {
              path: 'multi-diagram.md',
              hash: 'multi-hash',
              content: `# Multiple Diagrams

\`\`\`mermaid
graph TD
    A-->B
\`\`\`

Some text in between.

\`\`\`mermaid
graph LR
    C-->D
\`\`\`

End.`,
            },
          ],
        },
      )

      const html = await context.store.get(selectedFileContentHtml$)

      // Should contain multiple SVG elements
      const svgMatches = html?.match(/<svg/g)
      expect(svgMatches).toBeTruthy()
      expect(svgMatches?.length).toBeGreaterThanOrEqual(2)
      expect(html).toContain('Multiple Diagrams')
      expect(html).toContain('Some text in between')
    })

    it('should render markdown with mermaid and code blocks', async () => {
      await setupProjectPage(`/projects/${projectId}?file=mixed.md`, context, {
        projectId,
        files: [
          {
            path: 'mixed.md',
            hash: 'mixed-hash',
            content: `# Mixed Content

\`\`\`javascript
console.log('hello')
\`\`\`

\`\`\`mermaid
graph TD
    A-->B
\`\`\`

\`\`\`python
print('world')
\`\`\``,
          },
        ],
      })

      const html = await context.store.get(selectedFileContentHtml$)

      // Verify SVG is present for mermaid
      expect(html).toContain('<svg')

      // Verify regular code blocks are preserved
      expect(html).toContain("console.log('hello')")
      expect(html).toContain("print('world')")
    })

    it('should sanitize HTML properly with SVG content', async () => {
      await setupProjectPage(`/projects/${projectId}?file=svg.md`, context, {
        projectId,
        files: [
          {
            path: 'svg.md',
            hash: 'svg-hash',
            content: '# SVG Test\n\n```mermaid\ngraph LR\n    Start-->End\n```',
          },
        ],
      })

      const html = await context.store.get(selectedFileContentHtml$)

      // Should contain SVG with proper structure
      expect(html).toContain('<svg')
      expect(html).toContain('</svg>')
      // SVG should have viewBox attribute
      expect(html).toMatch(/viewBox="/)
    })
  })
})
