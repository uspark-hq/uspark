import { render, screen } from '@testing-library/react'
import type { GetTurnResponse } from '@uspark/core'
import { describe, expect, it } from 'vitest'
import { BlockDisplay } from '../block-display'

type Block = GetTurnResponse['blocks'][number]

describe('block display', () => {
  describe('text blocks', () => {
    it('renders text content', () => {
      const block: Block = {
        id: 'block-1',
        turnId: 'turn-1',
        type: 'text',
        content: 'Hello, world!',
        createdAt: new Date(),
      }

      render(<BlockDisplay block={block} />)
      expect(screen.getByText('Hello, world!')).toBeInTheDocument()
    })

    it('renders text content from object with text property', () => {
      const block: Block = {
        id: 'block-2',
        turnId: 'turn-1',
        type: 'text',
        content: { text: 'Nested text content' },
        createdAt: new Date(),
      }

      render(<BlockDisplay block={block} />)
      expect(screen.getByText('Nested text content')).toBeInTheDocument()
    })

    it('renders HTML content when html field is present', () => {
      const block: Block = {
        id: 'block-markdown-1',
        turnId: 'turn-1',
        type: 'text',
        content: {
          text: '# Heading',
          html: '<h1>Heading</h1>',
        },
        createdAt: new Date(),
      }

      render(<BlockDisplay block={block} />)
      const heading = screen.getByRole('heading', { level: 1 })
      expect(heading).toBeInTheDocument()
      expect(heading.textContent).toBe('Heading')
    })

    it('renders markdown list as HTML when html field is present', () => {
      const block: Block = {
        id: 'block-markdown-2',
        turnId: 'turn-1',
        type: 'text',
        content: {
          text: '- Item 1\n- Item 2',
          html: '<ul><li>Item 1</li><li>Item 2</li></ul>',
        },
        createdAt: new Date(),
      }

      render(<BlockDisplay block={block} />)
      const list = screen.getByRole('list')
      const items = screen.getAllByRole('listitem')
      expect(list).toBeInTheDocument()
      expect(items).toHaveLength(2)
      expect(items[0].textContent).toBe('Item 1')
      expect(items[1].textContent).toBe('Item 2')
    })

    it('falls back to plain text when html field is not present', () => {
      const block: Block = {
        id: 'block-markdown-3',
        turnId: 'turn-1',
        type: 'text',
        content: '# This is not rendered as HTML',
        createdAt: new Date(),
      }

      render(<BlockDisplay block={block} />)
      // Should render as plain text with the # symbol visible
      expect(
        screen.getByText('# This is not rendered as HTML'),
      ).toBeInTheDocument()
    })

    it('renders HTML content in a container', () => {
      const block: Block = {
        id: 'block-markdown-4',
        turnId: 'turn-1',
        type: 'text',
        content: {
          text: 'Content',
          html: '<p>Content</p>',
        },
        createdAt: new Date(),
      }

      render(<BlockDisplay block={block} />)
      // Verify the HTML content is rendered
      expect(screen.getByText('Content')).toBeInTheDocument()
    })

    it('sanitizes dangerous HTML content', () => {
      const block: Block = {
        id: 'block-markdown-5',
        turnId: 'turn-1',
        type: 'text',
        content: {
          text: 'Safe content with script',
          html: '<p>Safe content</p><script>alert("xss")</script>',
        },
        createdAt: new Date(),
      }

      render(<BlockDisplay block={block} />)
      // DOMPurify should strip the script tag, leaving only the safe content
      expect(screen.getByText('Safe content')).toBeInTheDocument()
      // The alert script should not execute
      expect(screen.queryByText(/alert/)).not.toBeInTheDocument()
    })
  })

  describe('thinking blocks', () => {
    it('renders thinking content', () => {
      const block: Block = {
        id: 'block-3',
        turnId: 'turn-1',
        type: 'thinking',
        content: 'Analyzing the request...',
        createdAt: new Date(),
      }

      render(<BlockDisplay block={block} />)
      expect(screen.getByText('Analyzing the request...')).toBeInTheDocument()
    })
  })

  describe('tool_use blocks', () => {
    it('renders tool name and main parameter for Bash', () => {
      const block: Block = {
        id: 'block-4',
        turnId: 'turn-1',
        type: 'tool_use',
        content: {
          tool_name: 'Bash',
          parameters: {
            command: 'git status',
            description: 'Check git status',
          },
        },
        createdAt: new Date(),
      }

      render(<BlockDisplay block={block} />)
      expect(screen.getByText('Bash')).toBeInTheDocument()
      expect(screen.getByText('git status')).toBeInTheDocument()
    })

    it('renders tool name and file path for Read', () => {
      const block: Block = {
        id: 'block-5',
        turnId: 'turn-1',
        type: 'tool_use',
        content: {
          tool_name: 'Read',
          parameters: {
            file_path: '/path/to/file.ts',
          },
        },
        createdAt: new Date(),
      }

      render(<BlockDisplay block={block} />)
      expect(screen.getByText('Read')).toBeInTheDocument()
      expect(screen.getByText('/path/to/file.ts')).toBeInTheDocument()
    })

    it('renders tool without parameters', () => {
      const block: Block = {
        id: 'block-6',
        turnId: 'turn-1',
        type: 'tool_use',
        content: {
          tool_name: 'ListFiles',
          parameters: {},
        },
        createdAt: new Date(),
      }

      render(<BlockDisplay block={block} />)
      expect(screen.getByText('ListFiles')).toBeInTheDocument()
    })
  })

  describe('tool_result blocks', () => {
    it('renders result field as string', () => {
      const block: Block = {
        id: 'block-7',
        turnId: 'turn-1',
        type: 'tool_result',
        content: {
          result: 'Command executed successfully',
          error: null,
        },
        createdAt: new Date(),
      }

      render(<BlockDisplay block={block} />)
      expect(
        screen.getByText('Command executed successfully'),
      ).toBeInTheDocument()
    })

    it('renders output field for compatibility', () => {
      const block: Block = {
        id: 'block-7b',
        turnId: 'turn-1',
        type: 'tool_result',
        content: {
          output: 'Alternative output format',
        },
        createdAt: new Date(),
      }

      render(<BlockDisplay block={block} />)
      expect(screen.getByText('Alternative output format')).toBeInTheDocument()
    })

    it('renders error message', () => {
      const block: Block = {
        id: 'block-8',
        turnId: 'turn-1',
        type: 'tool_result',
        content: {
          error: 'File not found',
          result: null,
        },
        createdAt: new Date(),
      }

      render(<BlockDisplay block={block} />)
      expect(screen.getByText('File not found')).toBeInTheDocument()
    })

    it('renders multiline result (up to 3 lines)', () => {
      const block: Block = {
        id: 'block-9',
        turnId: 'turn-1',
        type: 'tool_result',
        content: {
          result: 'Line 1\nLine 2\nLine 3',
          error: null,
        },
        createdAt: new Date(),
      }

      render(<BlockDisplay block={block} />)
      expect(screen.getByText(/Line 1.*Line 2.*Line 3/s)).toBeInTheDocument()
      // Should not show "+X lines" since we have exactly 3 lines
      expect(screen.queryByText(/\+\d+ lines?/)).not.toBeInTheDocument()
    })

    it('truncates results longer than 3 lines', () => {
      const block: Block = {
        id: 'block-9b',
        turnId: 'turn-1',
        type: 'tool_result',
        content: {
          result: 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5',
          error: null,
        },
        createdAt: new Date(),
      }

      const { container } = render(<BlockDisplay block={block} />)
      // Check that the first 3 lines are visible
      expect(container.textContent).toContain('Line 1')
      expect(container.textContent).toContain('Line 2')
      expect(container.textContent).toContain('Line 3')
      // Check that the "+2 lines" indicator is shown
      expect(screen.getByText('+2 lines')).toBeInTheDocument()
      // Line 4 and 5 should not be visible
      expect(container.textContent).not.toContain('Line 4')
    })

    it('shows Read tool result as line count', () => {
      const block: Block = {
        id: 'block-9c',
        turnId: 'turn-1',
        type: 'tool_result',
        content: {
          result: 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5',
          error: null,
        },
        createdAt: new Date(),
      }

      render(<BlockDisplay block={block} toolName="Read" />)
      expect(screen.getByText('Read 5 lines')).toBeInTheDocument()
      // Should not show the actual content
      expect(screen.queryByText('Line 1')).not.toBeInTheDocument()
    })

    it('shows Read tool result with singular form for 1 line', () => {
      const block: Block = {
        id: 'block-9d',
        turnId: 'turn-1',
        type: 'tool_result',
        content: {
          result: 'Single line',
          error: null,
        },
        createdAt: new Date(),
      }

      render(<BlockDisplay block={block} toolName="Read" />)
      expect(screen.getByText('Read 1 line')).toBeInTheDocument()
    })

    it('renders no output message when content is empty', () => {
      const block: Block = {
        id: 'block-10',
        turnId: 'turn-1',
        type: 'tool_result',
        content: {
          result: '',
          error: null,
        },
        createdAt: new Date(),
      }

      render(<BlockDisplay block={block} />)
      expect(screen.getByText('(no output)')).toBeInTheDocument()
    })

    it('renders content from nested content property', () => {
      const block: Block = {
        id: 'block-11',
        turnId: 'turn-1',
        type: 'tool_result',
        content: {
          content: 'Nested result content',
        },
        createdAt: new Date(),
      }

      render(<BlockDisplay block={block} />)
      expect(screen.getByText('Nested result content')).toBeInTheDocument()
    })
  })

  describe('code blocks', () => {
    it('renders code content', () => {
      const block: Block = {
        id: 'block-12',
        turnId: 'turn-1',
        type: 'code',
        content: 'const x = 42;',
        createdAt: new Date(),
      }

      render(<BlockDisplay block={block} />)
      expect(screen.getByText('const x = 42;')).toBeInTheDocument()
    })
  })

  describe('error blocks', () => {
    it('renders error content', () => {
      const block: Block = {
        id: 'block-13',
        turnId: 'turn-1',
        type: 'error',
        content: 'Something went wrong',
        createdAt: new Date(),
      }

      render(<BlockDisplay block={block} />)
      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    })
  })
})
