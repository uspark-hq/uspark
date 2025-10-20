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
    it('renders result output as string', () => {
      const block: Block = {
        id: 'block-7',
        turnId: 'turn-1',
        type: 'tool_result',
        content: {
          output: 'Command executed successfully',
        },
        createdAt: new Date(),
      }

      render(<BlockDisplay block={block} />)
      expect(
        screen.getByText('Command executed successfully'),
      ).toBeInTheDocument()
    })

    it('renders error message', () => {
      const block: Block = {
        id: 'block-8',
        turnId: 'turn-1',
        type: 'tool_result',
        content: {
          error: 'File not found',
        },
        createdAt: new Date(),
      }

      render(<BlockDisplay block={block} />)
      expect(screen.getByText('File not found')).toBeInTheDocument()
    })

    it('renders multiline output', () => {
      const block: Block = {
        id: 'block-9',
        turnId: 'turn-1',
        type: 'tool_result',
        content: {
          output: 'Line 1\nLine 2\nLine 3',
        },
        createdAt: new Date(),
      }

      render(<BlockDisplay block={block} />)
      expect(screen.getByText(/Line 1.*Line 2.*Line 3/s)).toBeInTheDocument()
    })

    it('renders no output message when content is empty', () => {
      const block: Block = {
        id: 'block-10',
        turnId: 'turn-1',
        type: 'tool_result',
        content: {
          output: '',
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
