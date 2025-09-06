import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { ChatStatus } from '../ChatStatus';
import { mockSession, mockTurn } from '../../../../src/test/mocks/sessions';

describe('ChatStatus', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should display "No Session" when session is null', () => {
    render(<ChatStatus session={null} />);
    expect(screen.getByText('No Session')).toBeInTheDocument();
  });

  it('should display "No Session" when session is undefined', () => {
    render(<ChatStatus />);
    expect(screen.getByText('No Session')).toBeInTheDocument();
  });

  it('should display correct status for idle session', () => {
    const session = mockSession.idle('project-123');
    render(<ChatStatus session={session} />);
    expect(screen.getByText('Ready')).toBeInTheDocument();
  });

  it('should display correct status for running session', () => {
    const session = mockSession.running('project-123');
    render(<ChatStatus session={session} />);
    expect(screen.getByText(/Processing/)).toBeInTheDocument();
  });

  it('should display correct status for completed session', () => {
    const session = mockSession.completed('project-123');
    render(<ChatStatus session={session} />);
    expect(screen.getByText('Completed')).toBeInTheDocument();
  });

  it('should display correct status for failed session', () => {
    const session = mockSession.failed('project-123');
    render(<ChatStatus session={session} />);
    expect(screen.getByText('Failed')).toBeInTheDocument();
  });

  it('should display correct status for interrupted session', () => {
    const session = mockSession.interrupted('project-123');
    render(<ChatStatus session={session} />);
    expect(screen.getByText('Interrupted')).toBeInTheDocument();
  });

  it('should show block count for running turn', () => {
    const session = mockSession.running('project-123');
    const currentTurn = session.turns[session.turns.length - 1];
    
    render(<ChatStatus session={session} currentTurn={currentTurn} />);
    
    const blockCount = currentTurn?.blocks.length || 0;
    expect(screen.getByText(new RegExp(`${blockCount} block`))).toBeInTheDocument();
  });

  it('should show execution timer for running session', () => {
    const session = mockSession.running('project-123');
    const currentTurn = mockTurn.running(session.id, 'Test input');
    
    // Set creation time to 5 seconds ago
    currentTurn.createdAt = new Date(Date.now() - 5000).toISOString();
    
    render(<ChatStatus session={session} currentTurn={currentTurn} />);
    
    // Timer should show initial time
    expect(screen.getByText('⏱️')).toBeInTheDocument();
    
    // Advance time by 1 second
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    
    // Timer should update
    expect(screen.getByText(/\ds/)).toBeInTheDocument();
  });

  it('should stop timer when session completes', () => {
    const runningSession = mockSession.running('project-123');
    const currentTurn = runningSession.turns[runningSession.turns.length - 1];
    
    const { rerender } = render(
      <ChatStatus session={runningSession} currentTurn={currentTurn} />
    );
    
    // Timer should be running
    expect(screen.getByText('⏱️')).toBeInTheDocument();
    
    // Change to completed session
    const completedSession = mockSession.completed('project-123');
    rerender(<ChatStatus session={completedSession} />);
    
    // Advance time
    const timerText = screen.getByText(/\d+s/).textContent;
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    
    // Timer should not change after completion
    expect(screen.getByText(/\d+s/).textContent).toBe(timerText);
  });

  it('should format time correctly for seconds', () => {
    const session = mockSession.running('project-123');
    const currentTurn = mockTurn.running(session.id, 'Test');
    currentTurn.createdAt = new Date(Date.now() - 45000).toISOString(); // 45 seconds ago
    
    render(<ChatStatus session={session} currentTurn={currentTurn} />);
    
    expect(screen.getByText(/45s/)).toBeInTheDocument();
  });

  it('should format time correctly for minutes', () => {
    const session = mockSession.running('project-123');
    const currentTurn = mockTurn.running(session.id, 'Test');
    currentTurn.createdAt = new Date(Date.now() - 125000).toISOString(); // 2m 5s ago
    
    render(<ChatStatus session={session} currentTurn={currentTurn} />);
    
    expect(screen.getByText(/2m 5s/)).toBeInTheDocument();
  });

  it('should display turn counter', () => {
    const session = mockSession.running('project-123');
    render(<ChatStatus session={session} />);
    
    const turnCount = session.turns.length;
    expect(screen.getByText('💬')).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`${turnCount} turn`))).toBeInTheDocument();
  });

  it('should use singular/plural correctly for turns', () => {
    // Test with 1 turn
    const session1 = mockSession.failed('project-123');
    const { rerender } = render(<ChatStatus session={session1} />);
    expect(screen.getByText('1 turn')).toBeInTheDocument();
    
    // Test with multiple turns
    const session2 = mockSession.running('project-123');
    rerender(<ChatStatus session={session2} />);
    expect(screen.getByText(/\d+ turns/)).toBeInTheDocument();
  });

  it('should display truncated session ID', () => {
    const session = mockSession.running('project-123');
    render(<ChatStatus session={session} />);
    
    const truncatedId = session.id.slice(0, 8);
    expect(screen.getByText(new RegExp(`Session: ${truncatedId}...`))).toBeInTheDocument();
  });

  it('should show status indicator with correct color', () => {
    const scenarios = [
      { session: mockSession.idle('p1'), color: '#6b7280' },
      { session: mockSession.running('p2'), color: '#3b82f6' },
      { session: mockSession.completed('p3'), color: '#10b981' },
      { session: mockSession.failed('p4'), color: '#ef4444' },
      { session: mockSession.interrupted('p5'), color: '#f59e0b' },
    ];

    scenarios.forEach(({ session, color }) => {
      const { container, unmount } = render(<ChatStatus session={session} />);
      
      // Find the status indicator (the colored dot)
      const statusDot = container.querySelector('[style*="borderRadius: \'50%\'"]');
      expect(statusDot).toHaveStyle({ backgroundColor: color });
      
      unmount();
    });
  });

  it('should show pulse animation for running sessions', () => {
    const session = mockSession.running('project-123');
    const { container } = render(<ChatStatus session={session} />);
    
    const statusDot = container.querySelector('[style*="animation"]');
    expect(statusDot).toHaveStyle({ animation: expect.stringContaining('pulse-ring') });
  });

  it('should not show pulse animation for non-running sessions', () => {
    const session = mockSession.completed('project-123');
    const { container } = render(<ChatStatus session={session} />);
    
    const statusDot = container.querySelector('[style*="borderRadius: \'50%\'"]');
    expect(statusDot).toHaveStyle({ animation: 'none' });
  });

  it('should not display timer for sessions without turns', () => {
    const session = mockSession.idle('project-123');
    render(<ChatStatus session={session} />);
    
    expect(screen.queryByText('⏱️')).not.toBeInTheDocument();
  });

  it('should handle completed turn with valid timestamps', () => {
    const session = mockSession.completed('project-123');
    const currentTurn = session.turns[0];
    if (currentTurn) {
      currentTurn.createdAt = new Date(Date.now() - 60000).toISOString();
      currentTurn.updatedAt = new Date(Date.now() - 30000).toISOString();
    }
    
    render(<ChatStatus session={session} currentTurn={currentTurn} />);
    
    // Should show calculated time (30 seconds)
    expect(screen.getByText(/30s/)).toBeInTheDocument();
  });
});