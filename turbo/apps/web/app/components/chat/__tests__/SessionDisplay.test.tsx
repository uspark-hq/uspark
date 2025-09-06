import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SessionDisplay } from '../SessionDisplay';
import { mockSession } from '../../../../src/test/mocks/sessions';

describe('SessionDisplay', () => {
  it('should show empty state when session is null', () => {
    render(<SessionDisplay session={null} />);
    
    expect(screen.getByText('No active session')).toBeInTheDocument();
    expect(screen.getByText(/Start a conversation with Claude Code/)).toBeInTheDocument();
  });

  it('should display session ID and status', () => {
    const session = mockSession.running('project-123');
    render(<SessionDisplay session={session} />);
    
    // Session ID should be truncated
    expect(screen.getByText(new RegExp(session.id.slice(0, 8)))).toBeInTheDocument();
    // Status badge should be shown
    expect(screen.getByText('RUNNING')).toBeInTheDocument();
  });

  it('should show interrupt button for running sessions', () => {
    const session = mockSession.running('project-123');
    const onInterrupt = vi.fn();
    
    render(<SessionDisplay session={session} onInterrupt={onInterrupt} />);
    
    const interruptButton = screen.getByText('Interrupt');
    expect(interruptButton).toBeInTheDocument();
    
    fireEvent.click(interruptButton);
    expect(onInterrupt).toHaveBeenCalledTimes(1);
  });

  it('should not show interrupt button for completed sessions', () => {
    const session = mockSession.completed('project-123');
    const onInterrupt = vi.fn();
    
    render(<SessionDisplay session={session} onInterrupt={onInterrupt} />);
    
    expect(screen.queryByText('Interrupt')).not.toBeInTheDocument();
  });

  it('should not show interrupt button for failed sessions', () => {
    const session = mockSession.failed('project-123');
    const onInterrupt = vi.fn();
    
    render(<SessionDisplay session={session} onInterrupt={onInterrupt} />);
    
    expect(screen.queryByText('Interrupt')).not.toBeInTheDocument();
  });

  it('should not show interrupt button when onInterrupt is not provided', () => {
    const session = mockSession.running('project-123');
    
    render(<SessionDisplay session={session} />);
    
    expect(screen.queryByText('Interrupt')).not.toBeInTheDocument();
  });

  it('should display all turns in the session', () => {
    const session = mockSession.running('project-123');
    
    render(<SessionDisplay session={session} />);
    
    // Check that user inputs are displayed
    session.turns.forEach(turn => {
      expect(screen.getByText(turn.userInput)).toBeInTheDocument();
    });
  });

  it('should show empty turns message for session with no turns', () => {
    const session = mockSession.idle('project-123');
    
    render(<SessionDisplay session={session} />);
    
    expect(screen.getByText(/No messages yet/)).toBeInTheDocument();
  });

  it('should display correct status badge color for each status', () => {
    const statuses = [
      { session: mockSession.idle('p1'), label: 'IDLE' },
      { session: mockSession.running('p2'), label: 'RUNNING' },
      { session: mockSession.completed('p3'), label: 'COMPLETED' },
      { session: mockSession.failed('p4'), label: 'FAILED' },
      { session: mockSession.interrupted('p5'), label: 'INTERRUPTED' },
    ];

    statuses.forEach(({ session, label }) => {
      const { unmount } = render(<SessionDisplay session={session} />);
      expect(screen.getByText(label)).toBeInTheDocument();
      unmount();
    });
  });

  it('should handle mouse hover on interrupt button', () => {
    const session = mockSession.running('project-123');
    const onInterrupt = vi.fn();
    
    render(<SessionDisplay session={session} onInterrupt={onInterrupt} />);
    
    const interruptButton = screen.getByText('Interrupt');
    
    // Initial color
    expect(interruptButton).toHaveStyle({ backgroundColor: '#ef4444' });
    
    // Hover
    fireEvent.mouseOver(interruptButton);
    expect(interruptButton).toHaveStyle({ backgroundColor: '#dc2626' });
    
    // Mouse out
    fireEvent.mouseOut(interruptButton);
    expect(interruptButton).toHaveStyle({ backgroundColor: '#ef4444' });
  });
});