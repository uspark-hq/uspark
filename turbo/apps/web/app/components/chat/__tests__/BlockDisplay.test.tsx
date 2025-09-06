import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BlockDisplay } from '../BlockDisplay';
import { mockBlock } from '../../../../src/test/mocks/sessions';

describe('BlockDisplay', () => {
  const turnId = 'turn-123';

  describe('Thinking Block', () => {
    it('should render thinking block with content', () => {
      const block = mockBlock.thinking(turnId);
      render(<BlockDisplay block={block} />);
      
      expect(screen.getByText('💭 Thinking')).toBeInTheDocument();
      expect(screen.getByText(block.content.text || JSON.stringify(block.content))).toBeInTheDocument();
    });

    it('should toggle thinking block expansion', () => {
      const block = mockBlock.thinking(turnId);
      render(<BlockDisplay block={block} />);
      
      const toggleButton = screen.getByText('💭 Thinking').closest('button');
      expect(toggleButton).toBeInTheDocument();
      
      // Content should be visible by default
      const contentText = block.content.text || JSON.stringify(block.content);
      expect(screen.getByText(contentText)).toBeInTheDocument();
      
      // Click to collapse
      fireEvent.click(toggleButton!);
      expect(screen.queryByText(contentText)).not.toBeInTheDocument();
      
      // Click to expand again
      fireEvent.click(toggleButton!);
      expect(screen.getByText(contentText)).toBeInTheDocument();
    });

    it('should show correct arrow rotation when toggled', () => {
      const block = mockBlock.thinking(turnId);
      render(<BlockDisplay block={block} />);
      
      const arrow = screen.getByText('▶');
      
      // Initially expanded (rotated 90deg)
      expect(arrow).toHaveStyle({ transform: 'rotate(90deg)' });
      
      // Click to collapse
      const toggleButton = screen.getByText('💭 Thinking').closest('button');
      fireEvent.click(toggleButton!);
      expect(arrow).toHaveStyle({ transform: 'rotate(0deg)' });
    });
  });

  describe('Tool Use Block', () => {
    it('should render tool use block with correct tool name', () => {
      const block = mockBlock.toolUse(turnId, 'grep');
      render(<BlockDisplay block={block} />);
      
      // Use more specific selector for the tool name
      const button = screen.getByRole('button');
      expect(button.textContent).toContain('grep');
      const contentText = JSON.stringify(block.content);
      expect(screen.getByText(contentText)).toBeInTheDocument();
    });

    it('should display correct icon for different tools', () => {
      const tools = [
        { name: 'bash', icon: '🖥️' },
        { name: 'grep', icon: '🔍' },
        { name: 'read', icon: '📖' },
        { name: 'write', icon: '✏️' },
        { name: 'edit', icon: '📝' },
        { name: 'glob', icon: '📂' },
        { name: 'webfetch', icon: '🌐' },
        { name: 'websearch', icon: '🔎' },
        { name: 'task', icon: '🤖' },
        { name: 'unknown', icon: '🔧' }, // Default icon
      ];

      tools.forEach(({ name, icon }) => {
        const block = mockBlock.toolUse(turnId, name);
        const { unmount } = render(<BlockDisplay block={block} />);
        
        const expectedText = `${icon} ${name}`;
        expect(screen.getByText((content, element) => {
          return element?.textContent === expectedText;
        })).toBeInTheDocument();
        
        unmount();
      });
    });

    it('should toggle tool use block expansion', () => {
      const block = mockBlock.toolUse(turnId, 'bash');
      render(<BlockDisplay block={block} />);
      
      const toggleButton = screen.getByRole('button');
      
      // Content should be visible by default
      const contentText = JSON.stringify(block.content);
      expect(screen.getByText(contentText)).toBeInTheDocument();
      
      // Click to collapse
      fireEvent.click(toggleButton);
      expect(screen.queryByText(contentText)).not.toBeInTheDocument();
      
      // Click to expand again
      fireEvent.click(toggleButton);
      expect(screen.getByText(contentText)).toBeInTheDocument();
    });

    it('should handle missing tool_name metadata', () => {
      const block = {
        ...mockBlock.toolUse(turnId, 'test'),
        content: {},
      };
      render(<BlockDisplay block={block} />);
      
      // Should show default "Tool" label
      expect(screen.getByText(/Tool/)).toBeInTheDocument();
    });
  });

  describe('Content Block', () => {
    it('should render content block text directly', () => {
      const text = 'This is a text response from Claude';
      const block = mockBlock.content(turnId, text);
      render(<BlockDisplay block={block} />);
      
      expect(screen.getByText(text)).toBeInTheDocument();
    });

    it('should not have toggle functionality for content blocks', () => {
      const block = mockBlock.content(turnId, 'Some text');
      render(<BlockDisplay block={block} />);
      
      // Should not have any buttons
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
  });

  describe('Tool Result Block', () => {
    it('should render tool result block with error styling when there is an error', () => {
      const errorMessage = 'Permission denied: cannot access file';
      const block = mockBlock.toolResult(turnId, 'tool_123', 'result', errorMessage);
      render(<BlockDisplay block={block} />);
      
      expect(screen.getByText('⚠️')).toBeInTheDocument();
      expect(screen.getByText('Tool Result')).toBeInTheDocument();
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    it('should apply error-specific styling', () => {
      const block = mockBlock.toolResult(turnId, 'tool_123', 'result', 'Test error');
      render(<BlockDisplay block={block} />);
      
      const errorLabel = screen.getByText('Tool Result');
      expect(errorLabel).toHaveStyle({ color: '#ef4444' });
    });
  });

  describe('Unknown Block Type', () => {
    it('should render unknown block type as text', () => {
      const block = {
        id: 'block-unknown',
        turnId,
        type: 'unknown_type' as any,
        content: { text: 'Unknown block content' },
        sequenceNumber: 0,
        createdAt: new Date(),
      };
      
      render(<BlockDisplay block={block} />);
      
      // Should default to content block rendering showing JSON stringified content
      expect(screen.getByText('{"text":"Unknown block content"}')).toBeInTheDocument();
    });
  });

  describe('Block Styling', () => {
    it('should have correct background colors for each block type', () => {
      const blocks = [
        { block: mockBlock.thinking(turnId), bgColor: 'rgba(59, 130, 246, 0.05)' },
        { block: mockBlock.toolUse(turnId, 'test'), bgColor: 'rgba(168, 85, 247, 0.05)' },
        { block: mockBlock.toolResult(turnId, 'tool_123', 'result', 'error'), bgColor: 'rgba(239, 68, 68, 0.05)' },
      ];

      blocks.forEach(({ block, bgColor }) => {
        const { container, unmount } = render(<BlockDisplay block={block} />);
        const blockElement = container.firstChild?.firstChild as HTMLElement;
        
        if (blockElement) {
          expect(blockElement).toHaveStyle({ backgroundColor: bgColor });
        }
        
        unmount();
      });
    });
  });
});