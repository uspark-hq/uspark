import React from 'react';
import { TurnDisplay } from './TurnDisplay';

interface Turn {
  id: string;
  sessionId: string;
  userInput: string;
  status: 'running' | 'completed' | 'failed';
  createdAt: string;
  updatedAt: string;
  blocks: Block[];
}

interface Block {
  id: string;
  turnId: string;
  type: 'thinking' | 'tool_use' | 'text' | 'error';
  content: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

interface Session {
  id: string;
  projectId: string;
  status: 'idle' | 'running' | 'completed' | 'failed' | 'interrupted';
  turns: Turn[];
  createdAt: string;
  updatedAt: string;
}

interface SessionDisplayProps {
  session: Session | null;
  onInterrupt?: () => void;
}

export function SessionDisplay({ session, onInterrupt }: SessionDisplayProps) {
  if (!session) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          minHeight: '400px',
          color: 'rgba(156, 163, 175, 0.6)',
          fontSize: '14px',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>💬</div>
        <div style={{ marginBottom: '8px', fontWeight: '500' }}>
          No active session
        </div>
        <div style={{ fontSize: '12px', maxWidth: '300px' }}>
          Start a conversation with Claude Code to see the session history here
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      {/* Session Header */}
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid rgba(156, 163, 175, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: 'var(--background)',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '14px', fontWeight: '500' }}>
            Session {session.id.slice(0, 8)}...
          </span>
          <SessionStatusBadge status={session.status} />
        </div>
        
        {session.status === 'running' && onInterrupt && (
          <button
            onClick={onInterrupt}
            style={{
              padding: '6px 12px',
              fontSize: '12px',
              backgroundColor: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: '500',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = '#dc2626';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = '#ef4444';
            }}
          >
            Interrupt
          </button>
        )}
      </div>

      {/* Turns List */}
      <div
        style={{
          flex: 1,
          overflow: 'auto',
          padding: '16px',
        }}
      >
        {session.turns.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              color: 'rgba(156, 163, 175, 0.6)',
              fontSize: '14px',
              padding: '32px',
            }}
          >
            No messages yet. Send a message to start the conversation.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {session.turns.map((turn) => (
              <TurnDisplay key={turn.id} turn={turn} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SessionStatusBadge({ status }: { status: Session['status'] }) {
  const statusConfig = {
    idle: { color: '#6b7280', label: 'Idle' },
    running: { color: '#3b82f6', label: 'Running' },
    completed: { color: '#10b981', label: 'Completed' },
    failed: { color: '#ef4444', label: 'Failed' },
    interrupted: { color: '#f59e0b', label: 'Interrupted' },
  };

  const config = statusConfig[status];

  return (
    <span
      style={{
        padding: '2px 8px',
        fontSize: '11px',
        fontWeight: '500',
        color: config.color,
        backgroundColor: `${config.color}20`,
        border: `1px solid ${config.color}40`,
        borderRadius: '3px',
        textTransform: 'uppercase',
      }}
    >
      {config.label}
    </span>
  );
}